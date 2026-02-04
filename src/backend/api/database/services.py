from urllib.parse import urlparse
import requests
from urllib.parse import urlparse, parse_qs
from api.services.github_http import github_get
from datetime import datetime, timedelta
import logging
import os
import json
import shutil
import tempfile
import subprocess

logger = logging.getLogger("api.services.repo_analyzer")

# Define all target numerical metrics that can be calculated automatically
TARGET_METRICS = {
    'Stars Count': 'The total number of stargazers for the repository.',
    'Forks Count': 'The total number of forks/copies of the repository.',
    'Watchers Count': 'The number of users currently watching the repository.',
    'Open Issues Count': 'The number of open issues in the repository.',
    'Commit Count': 'The total number of commits in the repository history.',
    'Branch Count': 'The number of branches in the repository.',
    "Open PRs Count": "Number of open pull requests.",
    "Closed PRs Count": "Number of closed pull requests.",
    'Text Files': 'Number of non-binary files.',
    'Binary Files': 'Number of binary files (images, executables, etc.).',
    'Commits (Last 5 Years)': 'Commits made in the last 60 months.',
    "Text Files (SCC)": "Number of text-based files (SCC).",
    "Total Lines (SCC)": "Number of total lines in text-based files (SCC).",
    "Code Lines (SCC)": "Number of code lines in text-based files (SCC).",
    "Comment Lines (SCC)": "Number of comment lines in text-based files (SCC).",
    "Blank Lines (SCC)": "Number of blank lines in text-based files (SCC).",
    "GitStats Report": "1 if git_stats report generation succeeded.",

}



class RepoAnalyzer:
    """
    Handles cloning, analyzing, and returning metric data for a Git repository.
    """

    def __init__(self, github_url):
        self.github_url = github_url
        self.repo_owner, self.repo_name = self._extract_repo_info(github_url)

    def _extract_repo_info(self, url: str):
        path = urlparse(url).path.strip("/")
        parts = path.split("/")
        if len(parts) >= 2:
            owner = parts[0]
            repo = parts[1].replace(".git", "")
            return owner, repo
        raise ValueError("Invalid GitHub URL format (expected github.com/<owner>/<repo>).")

    def _parse_last_page_from_link(self, link_header: str) -> int | None:
        if not link_header:
            return None

        last_url = None
        for part in link_header.split(","):
            if 'rel="last"' in part:
                last_url = part[part.find("<") + 1: part.find(">")]
                break

        if not last_url:
            return None

        q = parse_qs(urlparse(last_url).query)
        try:
            return int(q.get("page", ["1"])[0])
        except (TypeError, ValueError):
            return None

    def _search_count(self, query: str) -> int:
        resp = github_get("/search/issues", params={"q": query, "per_page": 1})
        resp.raise_for_status()
        return int(resp.json().get("total_count", 0))

    def _get_open_prs_count(self) -> int:
        q = f"repo:{self.repo_owner}/{self.repo_name} is:pr is:open"
        return self._search_count(q)

    def _get_closed_prs_count(self) -> int:
        q = f"repo:{self.repo_owner}/{self.repo_name} is:pr is:closed"
        return self._search_count(q)

    def _get_commits_past_five_years(self) -> int:
        five_years_ago_dt = datetime.now() - timedelta(days=5 * 365)
        since = five_years_ago_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        until = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        resp = github_get(
            f"/repos/{self.repo_owner}/{self.repo_name}/commits",
            params={
                "since": since,
                "until": until,
                "per_page": 1
            },
        )

        if resp.status_code == 409:
            return 0
        resp.raise_for_status()

        last_page = self._parse_last_page_from_link(resp.headers.get("Link"))
        if last_page is not None:
            return last_page
        data = resp.json()
        return 1 if data else 0


    def _get_file_type_counts(self, default_branch: str):
        resp = github_get(
            f"/repos/{self.repo_owner}/{self.repo_name}/git/trees/{default_branch}",
            params={"recursive": 1},
        )
        if resp.status_code != 200:
            logger.warning(
                "Tree API failed for %s/%s on branch %s",
                self.repo_owner,
                self.repo_name,
                default_branch,
            )
            return 0, 0

        tree = resp.json().get("tree", [])

        binary_extensions = {
            '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.exe', '.bin', '.zip',
            '.pyc', '.o', '.dat', '.dmg', '.iso', '.mp3', '.mp4'
        }

        text_count = 0
        binary_count = 0

        for item in tree:
            if item['type'] == 'blob':  #only count files, not folders
                path = item['path'].lower()
                if any(path.endswith(ext) for ext in binary_extensions):
                    binary_count += 1
                else:
                    text_count += 1

        return text_count, binary_count
    def _get_total_commit_count_via_api(self) -> int:
        resp = github_get(
            f"/repos/{self.repo_owner}/{self.repo_name}/commits",
            params={"per_page": 1},
        )

        if resp.status_code == 409:  #empty repo
            return 0

        resp.raise_for_status()

        last_page = self._parse_last_page_from_link(resp.headers.get("Link"))
        if last_page is not None:
            return last_page

        data = resp.json()
        return len(data) if isinstance(data, list) else 0

    def _get_branch_count_via_api(self) -> int:
        resp = github_get(
            f"/repos/{self.repo_owner}/{self.repo_name}/branches",
            params={"per_page": 1},
        )

        if resp.status_code == 409:  #empty repo
            return 0

        resp.raise_for_status()

        last_page = self._parse_last_page_from_link(resp.headers.get("Link"))
        if last_page is not None:
            return last_page
        data = resp.json()
        return len(data) if isinstance(data, list) else 0

    def _get_open_issues_count(self) -> int:
        q = f"repo:{self.repo_owner}/{self.repo_name} is:issue is:open"
        return self._search_count(q)

    def _get_github_api_metrics(self):
        try:
            repo_resp = github_get(f"/repos/{self.repo_owner}/{self.repo_name}")
            repo_resp.raise_for_status()
            data = repo_resp.json()
            default_branch = data.get("default_branch", "main")
            text_files, binary_files = self._get_file_type_counts(default_branch)
            logger.debug("File counts for %s/%s: text=%d binary=%d", self.repo_owner, self.repo_name, text_files, binary_files)

            return {
                "Stars Count": data.get("stargazers_count"),
                "Forks Count": data.get("forks_count"),
                "Watchers Count": data.get("subscribers_count"),
                "Open Issues Count": self._get_open_issues_count(),
                "Commit Count": self._get_total_commit_count_via_api(),
                "Branch Count": self._get_branch_count_via_api(),
                "Open PRs Count": self._get_open_prs_count(),
                "Closed PRs Count": self._get_closed_prs_count(),
                "Commits (Last 5 Years)": self._get_commits_past_five_years(),
                "Text Files": text_files,
                "Binary Files": binary_files
            }
        except requests.exceptions.RequestException as e:
            raise Exception(f"GitHub API Error: {e}") from e

    def _clone_repo_to_tempdir(self) -> tuple[str, str]:

        tmp_root = tempfile.mkdtemp(prefix="domainx_repo_")
        repo_dir = os.path.join(tmp_root, "repo")

        clone_url = f"https://github.com/{self.repo_owner}/{self.repo_name}.git"

        cmd = ["git", "clone", clone_url, repo_dir]

        try:
            subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=60*20,
            )
            return tmp_root, repo_dir
        except subprocess.TimeoutExpired:
            shutil.rmtree(tmp_root, ignore_errors=True)
            raise Exception("Clone timed out.")
        except subprocess.CalledProcessError as e:
            shutil.rmtree(tmp_root, ignore_errors=True)
            raise Exception(f"Clone failed: {e.stderr[-500:]}")

    def _run_scc(self, repo_dir: str) -> dict[str, int]:
        cmd = ["scc", "--format", "json", repo_dir]
        try:
            p = subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=60*20,
            )
        except FileNotFoundError:
            raise Exception("scc is not installed or not on PATH.")
        except subprocess.TimeoutExpired:
            raise Exception("scc timed out.")
        except subprocess.CalledProcessError as e:
            raise Exception(f"scc failed: {e.stderr[-500:]}")

        try:
            data = json.loads(p.stdout)

        except json.JSONDecodeError:
            raise Exception("scc output was not valid JSON.")

        if not isinstance(data, list) or not data:
            raise Exception("Unexpected scc JSON structure (expected non-empty list).")
        logger.debug("SCC first row: %s", data[0])

        def pick_int(row: dict, keys: list[str]) -> int:
            for k in keys:
                if k in row and isinstance(row[k], (int, float)):
                    return int(row[k])
            return 0

        total_row = next(
            (r for r in data if str(r.get("Name") or r.get("Language") or "").strip().lower() == "total"),
            None,
        )

        rows = [total_row] if total_row else data

        files = sum(pick_int(r, ["Count", "Files", "files"]) for r in rows)
        lines = sum(pick_int(r, ["Lines", "lines"]) for r in rows)
        code = sum(pick_int(r, ["Code", "code"]) for r in rows)
        blanks = sum(pick_int(r, ["Blank", "Blanks", "blanks"]) for r in rows)
        comments = sum(pick_int(r, ["Comment", "Comments", "comments"]) for r in rows)

        if (blanks == 0 or comments == 0) and total_row is not None:
            blanks = sum(pick_int(r, ["Blanks", "blanks", "Blank", "blank"]) for r in data)
            comments = sum(pick_int(r, ["Comments", "comments", "Comment", "comment"]) for r in data)
            files = sum(pick_int(r, ["Count", "Files", "files"]) for r in data) if files == 0 else files

        return {
            "Text Files (SCC)": int(files),
            "Total Lines (SCC)": int(lines),
            "Blank Lines (SCC)": int(blanks),
            "Comment Lines (SCC)": int(comments),
            "Code Lines (SCC)": int(code),
        }

    def _analyze_repo(self):
        github_api_results = self._get_github_api_metrics()

        tmp_root = None
        try:
            tmp_root, repo_dir = self._clone_repo_to_tempdir()
            scc_results = self._run_scc(repo_dir)
        finally:
            if tmp_root:
                shutil.rmtree(tmp_root, ignore_errors=True)

        merged = {**github_api_results, **scc_results}

        final_results = {
            k: v for k, v in merged.items()
            if k in TARGET_METRICS and v is not None and isinstance(v, int)
        }

        logger.debug("GitHub API raw metrics: %s", github_api_results)
        logger.debug("SCC raw metrics: %s", scc_results)
        logger.debug("Filtered metrics: %s", final_results)

        logger.info(
            "Analysis complete for %s/%s (%d metrics)",
            self.repo_owner,
            self.repo_name,
            len(final_results),
        )
        return final_results

    def run_analysis_and_get_data(self):
        try:
            metric_results = self._analyze_repo()
            logger.info("Analysis complete. Metrics found: %d", len(metric_results))


            return {
                'repo_name': self.repo_name,
                'metric_data': metric_results,
            }
        except Exception as e:
            logger.exception("CRITICAL FAILURE in analysis for %s", self.github_url)
            raise

    def _run_gitstats(self, repo_dir: str, out_dir: str, library_id: str) -> dict:
        os.makedirs(out_dir, exist_ok=True)
        cmd = ["git_stats", "generate"]

        env = os.environ.copy()
        env["LC_ALL"] = "C"
        env["LANG"] = "C"

        subprocess.run(
            cmd,
            cwd=repo_dir,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,
            timeout=60 * 60 * 6,
            env=env,
            start_new_session=True,
        )

        generated = os.path.join(repo_dir, "git_stats")
        if not os.path.isdir(generated):
            raise Exception("git_stats output folder not found after running.")

        dest = os.path.join(out_dir, "git_stats")
        if os.path.exists(dest):
            shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(generated, dest)

        for root, dirs, files in os.walk(dest):
            for d in dirs:
                try:
                    os.chmod(os.path.join(root, d), 0o755)
                except Exception:
                    pass
            for f in files:
                try:
                    os.chmod(os.path.join(root, f), 0o644)
                except Exception:
                    pass

        index_path = os.path.join(dest, "index.html")
        if not os.path.isfile(index_path):
            found = []
            for r, _, fs in os.walk(dest):
                if "index.html" in fs:
                    found.append(os.path.join(r, "index.html"))
            raise Exception(f"git_stats index.html not found at expected location. Found: {found[:3]}")

        return {"GitStats Report": f"/gitstats/{library_id}/git_stats/index.html"}




    def run_gitstats_only(self, work_dir: str, serve_dir: str, library_id: str) -> dict:
        work_dir = os.path.abspath(work_dir)
        serve_dir = os.path.abspath(serve_dir)

        os.makedirs(work_dir, exist_ok=True)
        os.makedirs(serve_dir, exist_ok=True)

        try:
            repo_dir = self._clone_repo_to_dir(work_dir)
            gitstats_results = self._run_gitstats(repo_dir, out_dir=serve_dir,library_id=library_id)
            return {"repo_name": self.repo_name, "metric_data": gitstats_results}
        finally:
            repo_path = os.path.join(work_dir, "repo")
            shutil.rmtree(repo_path, ignore_errors=True)

    def _clone_repo_to_dir(self, root_dir: str) -> str:
        repo_dir = os.path.join(root_dir, "repo")

        if os.path.exists(repo_dir):
            shutil.rmtree(repo_dir, ignore_errors=True)

        clone_url = f"https://github.com/{self.repo_owner}/{self.repo_name}.git"
        cmd = ["git", "clone", clone_url, repo_dir]

        try:
            subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=60 * 20,
            )
            return repo_dir
        except subprocess.TimeoutExpired:
            raise Exception("Clone timed out.")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Clone failed: {e.stderr[-500:]}")


