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
        self.local_repo_path = os.path.join(CLONE_DIR, self.repo_name)
        # self.metric_map = self._ensure_metrics_exist() 

    def _extract_repo_info(self, url):
        """Extracts the repository owner and name from the GitHub URL."""
        path = urlparse(url).path.strip('/')
        parts = path.split('/')
        if len(parts) >= 2:
            owner = parts[0]
            repo = parts[1].replace('.git', '')
            return owner, repo
        raise ValueError("Invalid GitHub URL format (expected user/repo).")

    # def _ensure_metrics_exist(self):
    #     """
    #     Ensures all metrics in TARGET_METRICS exist in the database (Metric Upsert). 
    #     Returns: {metric_name: metric_ID}
    #     """
    #     # metric_map = {}
    #     for name, description in TARGET_METRICS.items():
    #         metric, created = Metric.objects.get_or_create(
    #             metric_name=name,
    #             defaults={
    #                 'description': description,
    #             }
    #         )
    #         if created:
    #             print(f"Metric '{name}' created by the analyzer.")
            
    #         metric_map[name] = metric.metric_ID
            
    #     return metric_map

    def _clone_repo(self):
        clone_url = f"https://github.com/{self.repo_owner}/{self.repo_name}.git"
        print(f"Cloning {clone_url} to {self.local_repo_path}...")
        
        try:
            subprocess.run(
                ['git', 'clone', clone_url, self.local_repo_path, '--depth', '1'],
                check=True,
                capture_output=True,
                text=True
            )
            print("Cloning successful.")
            return True
        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to clone repository: {e.stderr.strip()}"
            print(f"Error cloning repo: {error_msg}")
            raise Exception(error_msg)

    def _get_git_metrics(self):
        metrics = {}
        try:
            # Commit Count
            repo = Repo(self.local_repo_path)
            # commit_count_result = subprocess.run(
            #     ['git', 'rev-list', '--count', 'HEAD'],
            #     cwd=self.local_repo_path,
            #     check=True,
            #     capture_output=True,
            #     text=True
            # )
            commit_count_result = len(list(repo.iter_commits('--all')))
            metrics['Commit Count'] = commit_count_result #int(commit_count_result.stdout.strip())
            
            # Branch Count
            # branch_count_result = subprocess.run(
            #     ['git', 'branch', '-r', '--list', 'origin/*'], 
            #     cwd=self.local_repo_path,
            #     check=True,
            #     capture_output=True,
            #     text=True
            # )
            branch_count_result = len(subprocess.check_output(["git", "branch"], text=True).strip().split('\n'))

            branch_count = len([line for line in branch_count_result.stdout.splitlines() if line.strip()])
            metrics['Branch Count'] = branch_count

        except Exception as e:
            print(f"Error getting local git metrics: {e}")
            
        return metrics

    def _get_github_api_metrics(self):
        """Fetches metrics (stars, forks, issues) using the GitHub API."""
        api_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}"
        headers = {}
        if GITHUB_TOKEN:
            headers['Authorization'] = f'token {GITHUB_TOKEN}'
            
        try:
            response = requests.get(api_url, headers=headers)
            response.raise_for_status() 
            data = response.json()
            
            return {
                'Stars Count': data.get('stargazers_count'),
                'Forks Count': data.get('forks_count'),
                'Watchers Count': data.get('subscribers_count'), 
                'Open Issues Count': data.get('open_issues_count'),
            }
        except requests.exceptions.RequestException as e:
            print(f"Error fetching GitHub API metrics for {self.repo_owner}/{self.repo_name}: {e}")
            raise Exception(f"GitHub API Error: {e}")
    
    def _analyze_repo(self):
        """Performs analysis and collects all numerical metric values."""
        
        github_api_results = self._get_github_api_metrics()
        git_cli_results = self._get_git_metrics()

        combined_results = {**github_api_results, **git_cli_results}
        
        final_results = {
            k: v for k, v in combined_results.items() if k in TARGET_METRICS and v is not None and isinstance(v, int)
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
            #Clone the repository
            self._clone_repo()

            #Analyze and collect metric values
            metric_results = self._analyze_repo()
            
            print(f"Analysis complete. Metrics found: {len(metric_results)}")
            # metric_results = {'Stars Count': 33,
            #     'Forks Count': 43,
            #     'Watchers Count': 53, 
            #     'Open Issues Count': 73,
            #     'Branch Count': 81,
            #     'Commit Count': 91}
            # Return the data needed by the Serializer
            self._cleanup_repo()
            return {
                'repo_name': self.repo_name,
                'metric_data': metric_results,
                # 'metric_map': self.metric_map
            }

        except Exception as e:
            print(f"!!! CRITICAL FAILURE in analysis for {self.github_url}: {e}")
            raise e
        finally:
            #Cleanup (Always runs, even if errors occur)
            self._cleanup_repo()