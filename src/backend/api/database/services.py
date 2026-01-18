from urllib.parse import urlparse
import requests
from urllib.parse import urlparse, parse_qs
from api.services.github_http import github_get

# Define all target numerical metrics that can be calculated automatically
TARGET_METRICS = {
    'Stars Count': 'The total number of stargazers for the repository.',
    'Forks Count': 'The total number of forks/copies of the repository.',
    'Watchers Count': 'The number of users currently watching the repository.',
    'Open Issues Count': 'The number of open issues in the repository.',
    'Commit Count': 'The total number of commits in the repository history.',
    'Branch Count': 'The number of branches in the repository.',
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

    def _get_total_commit_count_via_api(self) -> int:
        resp = github_get(
            f"/repos/{self.repo_owner}/{self.repo_name}/commits",
            params={"per_page": 1},
        )

        if resp.status_code == 409:  # empty repo
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

        if resp.status_code == 409:  # empty repo
            return 0

        resp.raise_for_status()

        last_page = self._parse_last_page_from_link(resp.headers.get("Link"))
        if last_page is not None:
            return last_page
        data = resp.json()
        return len(data) if isinstance(data, list) else 0

    def _get_open_issues_count(self) -> int:
        query = f"repo:{self.repo_owner}/{self.repo_name} is:issue is:open"
        resp = github_get("/search/issues", params={"q": query, "per_page": 1})
        resp.raise_for_status()
        return int(resp.json().get("total_count", 0))

    def _get_github_api_metrics(self):
        try:
            repo_resp = github_get(f"/repos/{self.repo_owner}/{self.repo_name}")
            repo_resp.raise_for_status()
            data = repo_resp.json()

            return {
                "Stars Count": data.get("stargazers_count"),
                "Forks Count": data.get("forks_count"),
                "Watchers Count": data.get("subscribers_count"),
                "Open Issues Count": self._get_open_issues_count(),
                "Commit Count": self._get_total_commit_count_via_api(),
                "Branch Count": self._get_branch_count_via_api(),
            }
        except requests.exceptions.RequestException as e:
            raise Exception(f"GitHub API Error: {e}") from e

    def _analyze_repo(self):
        github_api_results = self._get_github_api_metrics()
        final_results = {
            k: v for k, v in github_api_results.items()
            if k in TARGET_METRICS and v is not None and isinstance(v, int)
        }
        return final_results

    def run_analysis_and_get_data(self):
        try:
            metric_results = self._analyze_repo()
            print(f"Analysis complete. Metrics found: {len(metric_results)}")
            return {
                'repo_name': self.repo_name,
                'metric_data': metric_results,
            }
        except Exception as e:
            print(f"!!! CRITICAL FAILURE in analysis for {self.github_url}: {e}")
            raise e



