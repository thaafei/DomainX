import os
import shutil
import subprocess
from django.conf import settings
from .metrics.models import Metric
from urllib.parse import urlparse
import requests
from datetime import datetime
from django.db import transaction
from git import Repo
import re
from urllib.parse import urlparse, parse_qs
from api.services.github_http import github_get

# Configuration
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
CLONE_DIR = os.path.join(settings.BASE_DIR, 'cloned_repos') 
os.makedirs(CLONE_DIR, exist_ok=True)

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
    It does NOT create Library or LibraryMetricValue records.
    """

    def __init__(self, github_url):
        self.github_url = github_url
        self.repo_owner, self.repo_name = self._extract_repo_info(github_url)

    def _get_total_commit_count_via_api(self) -> int:
        api_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/commits"
        headers = {}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"token {GITHUB_TOKEN}"

        resp = requests.get(api_url, headers=headers, params={"per_page": 1}, timeout=20)

        if resp.status_code == 409:  # empty repo
            return 0

        resp.raise_for_status()

        link = resp.headers.get("Link")
        if not link:
            data = resp.json()
            return len(data) if isinstance(data, list) else 0

        last_url = None
        for part in link.split(","):
            if 'rel="last"' in part:
                last_url = part[part.find("<") + 1: part.find(">")]
                break

        if not last_url:
            return 1

        q = parse_qs(urlparse(last_url).query)
        return int(q.get("page", ["1"])[0])

    def _extract_repo_info(self, url):
        """Extracts the repository owner and name from the GitHub URL."""
        path = urlparse(url).path.strip('/')
        parts = path.split('/')
        if len(parts) >= 2:
            owner = parts[0]
            repo = parts[1].replace('.git', '')
            return owner, repo
        raise ValueError("Invalid GitHub URL format (expected user/repo).")

    def _get_branch_count_via_api(self) -> int:
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/branches"
        headers = {}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"token {GITHUB_TOKEN}"

        resp = requests.get(url, headers=headers, params={"per_page": 1}, timeout=20)

        if resp.status_code == 409:  # empty repo
            return 0

        resp.raise_for_status()

        link = resp.headers.get("Link")
        if not link:
            data = resp.json()
            return len(data) if isinstance(data, list) else 0

        last_url = None
        for part in link.split(","):
            if 'rel="last"' in part:
                last_url = part[part.find("<") + 1: part.find(">")]
                break

        if not last_url:
            return 1

        q = parse_qs(urlparse(last_url).query)
        return int(q.get("page", ["1"])[0])

    def _get_open_issues_count(self) -> int:
        query = f"repo:{self.repo_owner}/{self.repo_name} is:issue is:open"
        resp = github_get(
            "/search/issues",
            params={"q": query, "per_page": 1}
        )
        return resp.json()["total_count"]

    def _get_github_api_metrics(self):
        """Fetches metrics (stars, forks, issues) using the GitHub API."""
        try:
            data = github_get(f"/repos/{self.repo_owner}/{self.repo_name}").json()
            return {
                'Stars Count': data.get('stargazers_count'),
                'Forks Count': data.get('forks_count'),
                'Watchers Count': data.get('subscribers_count'), 
                'Open Issues Count': self._get_open_issues_count(),
                "Commit Count": self._get_total_commit_count_via_api(),
                "Branch Count": self._get_branch_count_via_api(),
            }
        except requests.exceptions.RequestException as e:
            print(f"Error fetching GitHub API metrics for {self.repo_owner}/{self.repo_name}: {e}")
            raise Exception(f"GitHub API Error: {e}")
    
    def _analyze_repo(self):
        github_api_results = self._get_github_api_metrics()
        final_results = {
            k: v for k, v in github_api_results.items()
            if k in TARGET_METRICS and v is not None and isinstance(v, int)
        }
        return final_results

    def _cleanup_repo(self):
        if os.path.exists(self.local_repo_path):
            try:
                shutil.rmtree(self.local_repo_path)
                print(f"Cleaned up {self.local_repo_path}")
            except Exception as e:
                print(f"Error during cleanup: {e}")

    def run_analysis_and_get_data(self):
        try:
            metric_results = self._analyze_repo()
            print(f"Analysis complete. Metrics found: {len(metric_results)}")

            return {
                'repo_name': self.repo_name,
                'metric_data': metric_results,
                # 'metric_map': self.metric_map
            }

        except Exception as e:
            print(f"!!! CRITICAL FAILURE in analysis for {self.github_url}: {e}")
            raise e
