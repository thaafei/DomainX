import requests
import json
import sys, os
from github import Github
from datetime import datetime, timedelta, timezone # Imported timezone for awareness comparisons
import time
from collections import defaultdict
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import django
from pathlib import Path
from dotenv import load_dotenv
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
import requests
import random

load_dotenv()
SETTINGS_MODULE = 'DomainX.settings'
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BACKEND_ROOT))

# 3. Set the environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', SETTINGS_MODULE) 

# 4. Initialize Django
django.setup()


def fetch_and_process_stars(repo_list: list) -> list:

    results = []
    for repo_full_name in repo_list:
        random_stars = random.randint(1, 5)
        results.append({
            'label': repo_full_name,
            'stars': random_stars
        })

    return results

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")

if not GITHUB_TOKEN:
    print("FATAL ERROR: GITHUB_TOKEN environment variable not set.")

GITHUB_URLS_TO_ANALYZE = [
    "https://github.com/tensorflow/tensorflow",
    "https://github.com/sony/nnabla",
    "https://github.com/pytorch/pytorch",
    "https://github.com/onnx/onnx",
    "https://github.com/pymc-devs/pytensor",
    "https://github.com/BVLC/caffe",
    "https://github.com/keras-team/keras",
    "https://github.com/deeplearning4j/deeplearning4j",
    "https://github.com/apache/mxnet",
    "https://github.com/chainer/chainer",
    "https://github.com/tensorflow/tensorboard",
    "https://github.com/neuroph/neuroph",
    "https://github.com/wekan/wekan",
    "https://github.com/libfann/fann",
    "https://github.com/scikit-learn/scikit-learn",
    "https://github.com/lululxvi/deepxde",
    "https://github.com/Theano/Theano",
    "https://github.com/numpy/numpy",
    "https://github.com/pandas-dev/pandas",
    "https://github.com/mlflow/mlflow",
    "https://github.com/microsoft/LightGBM",
    "https://github.com/dmlc/xgboost",
    "https://github.com/microsoft/FLAML",
    "https://github.com/fastai/fastai",
    "https://github.com/statsmodels/statsmodels",
    "https://github.com/optuna/optuna",
    "https://github.com/h2oai/h2o-3"
]

API_BASE = "https://api.github.com"
HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28"
}

def setup_metrics(library_url):
    """
    Fetches GitHub data for a given library URL.
    - Creates Library if it doesn't exist.
    - Creates Metrics if they don't exist.
    - Uploads or updates LibraryMetricValue entries.
    """
    # Extract owner/repo from the URL
    try:
        words = library_url.split('/')
        owner, repo = words[-2], words[-1]
    except ValueError:
        print("Invalid library URL format. Use 'owner/repo'.")
        return

    # Create or get the Library
    library, _ = Library.objects.get_or_create(
        library_name=repo,
        defaults={"url": library_url}
    )

    # Fetch repository data from GitHub API
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    response = requests.get(api_url)

    if response.status_code != 200:
        print(f"Failed to fetch data from GitHub: {response.status_code}")
        return

    data = response.json()

    # Define which metrics to collect
    metrics_to_update = {
        "stars": data.get("stargazers_count", 0),
        "watchers": data.get("watchers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues": data.get("open_issues_count", 0),
    }

    # Update or create LibraryMetricValue for each metric
    for metric_name, value in metrics_to_update.items():
        metric, _ = Metric.objects.get_or_create(metric_name=metric_name, description=metric_name)
        LibraryMetricValue.objects.update_or_create(
            library=library,
            metric=metric,
            defaults={"value": value}
        )

    return JsonResponse({
        "status": "success",
        "library": library.library_name,
        "updated_metrics": metrics_to_update
    })

# --- Helper Functions ---

def parse_github_url(url):
    """Extracts the owner and repository name from a GitHub URL."""
    try:
        parsed_url = urlparse(url)
        path_parts = parsed_url.path.strip('/').split('/')
        if len(path_parts) >= 2:
            return path_parts[0], path_parts[1]
        else:
            print("Error: URL format is incorrect. Expected: https://github.com/<owner>/<repo>")
            return None, None
    except Exception as e:
        print(f"Error parsing URL: {e}")
        return None, None

def fetch_paginated_data(endpoint, params=None):
    """Fetches all pages of data from a GitHub API endpoint."""
    all_data = []
    current_url = f"{API_BASE}{endpoint}"
    page = 1
    
    print(f"\n[API] Fetching data from: {endpoint}...")

    while current_url:
        print(f"  -> Fetching page {page}...")
        
        # Use the initial URL (current_url) only for the first request (page 1) 
        # to correctly merge `params`.
        if page == 1 and params:
            response = requests.get(current_url, headers=HEADERS, params=params)
        else:
            response = requests.get(current_url, headers=HEADERS)

        if response.status_code == 202:
            # Statistics endpoints often return 202 (Accepted) if data is being computed.
            print("  -> Data is being compiled (Status 202). Retrying in 5 seconds...")
            time.sleep(5)
            continue
        elif response.status_code != 200:
            print(f"Error fetching data. Status Code: {response.status_code}")
            print("Response:", response.json())
            return all_data

        if isinstance(response.json(), list):
            all_data.extend(response.json())
        else:
            # Non-list responses (like single repo metadata) are returned immediately
            return response.json()

        # Handle Pagination via Link header
        current_url = None
        if 'Link' in response.headers:
            links = response.headers['Link'].split(', ')
            for link in links:
                if 'rel="next"' in link:
                    current_url = link.split(';')[0].strip('<>')
                    break
        page += 1
        
        # Rate limit safety: sleep briefly between pages for large fetches
        if current_url:
            time.sleep(0.5) 

    return all_data

# --- Metric Functions (Category 1: Overview) ---

def get_repo_overview_metrics(owner, repo):
    """Fetches core repository statistics (stars, forks, watchers)."""
    endpoint = f"/repos/{owner}/{repo}"
    data = fetch_paginated_data(endpoint)
    
    if data and isinstance(data, dict):
        return {
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "watchers": data.get("subscribers_count", 0), # 'subscribers_count' is the watcher count
        }
    return {}

# --- Metric Functions (Category 2: Pull Requests) ---

def get_pull_request_metrics(owner, repo):
    """Counts open and closed pull requests."""
    
    # NOTE: GitHub API limits PR listing to 250 pages (25,000 PRs).
    
    # 1. Open Pull Requests
    open_prs = fetch_paginated_data(
        f"/repos/{owner}/{repo}/pulls", 
        params={"state": "open", "per_page": 100}
    )
    
    # 2. Closed Pull Requests
    closed_prs = fetch_paginated_data(
        f"/repos/{owner}/{repo}/pulls", 
        params={"state": "closed", "per_page": 100}
    )
    
    return {
        "open_pull_requests": len(open_prs),
        "closed_pull_requests": len(closed_prs),
    }

# --- Metric Functions (Category 3: Git Activity) ---

def get_code_churn_metrics(owner, repo):
    """Calculates total lines added and deleted across the repository's history."""
    
    endpoint = f"/repos/{owner}/{repo}/stats/code_frequency"
    # Data is a list of lists: [[timestamp, additions, deletions], ...]
    code_freq_data = fetch_paginated_data(endpoint)
    
    total_additions = 0
    total_deletions = 0
    
    if isinstance(code_freq_data, list):
        for week in code_freq_data:
            if len(week) == 3:
                # Additions are week[1], Deletions are week[2]
                total_additions += week[1]
                total_deletions += abs(week[2]) # Deletions are negative in API response
    
    return {
        "total_lines_added": total_additions,
        "total_lines_deleted": total_deletions,
    }

def get_commit_history_metrics(owner, repo):
    """Fetches commit data for total count and time-series analysis."""
    
    # Calculate the 'since' date for 5 years ago
    five_years_ago = datetime.now() - timedelta(days=5 * 365 + 1)
    since_date = five_years_ago.isoformat() + 'Z'
    
    # Fetch all commits since 5 years ago (pagination handles full history)
    all_commits = fetch_paginated_data(
        f"/repos/{owner}/{repo}/commits", 
        params={"since": since_date, "per_page": 100}
    )
    
    # Initialize containers
    commits_by_year = defaultdict(int)
    commits_by_month = defaultdict(int)
    total_commits = len(all_commits)

    # Calculate last 12 months for filtering. 
    # By using timezone.utc, this datetime object becomes aware, allowing comparison with commit_date.
    twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)
    
    for commit_obj in all_commits:
        commit_date_str = commit_obj['commit']['author']['date']
        # The replacement creates an offset-aware datetime object (UTC)
        commit_date = datetime.fromisoformat(commit_date_str.replace('Z', '+00:00'))
        
        # 1. Commits by Year (Last 5 years only, due to 'since' filter)
        year = commit_date.year
        commits_by_year[year] += 1
        
        # 2. Commits by Month (Last 12 months only)
        if commit_date >= twelve_months_ago:
            month_key = commit_date.strftime("%Y-%m")
            commits_by_month[month_key] += 1

    # Sort results
    sorted_commits_by_year = dict(sorted(commits_by_year.items()))
    sorted_commits_by_month = dict(sorted(commits_by_month.items()))

    return {
        "total_commits": total_commits,
        "commits_by_year": sorted_commits_by_year,
        "commits_by_month_last_12": sorted_commits_by_month,
    }


# --- Main Execution ---

def analyze_repository(url):
    """Runs all metric gathering functions and compiles the final report."""
    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return {"Error": "Invalid GitHub URL provided."}
        
    print(f"\n--- Starting Analysis for {owner}/{repo} ---")

    # Group 1: Core Repo Metrics
    core_metrics = get_repo_overview_metrics(owner, repo)

    # Group 2: Pull Request Metrics
    pr_metrics = get_pull_request_metrics(owner, repo)

    # Group 3: Git Activity Metrics (Code Churn)
    churn_metrics = get_code_churn_metrics(owner, repo)

    # Group 4: Git Activity Metrics (Commit History)
    commit_metrics = get_commit_history_metrics(owner, repo)

    final_report = {
        "repository": f"{owner}/{repo}",
        
        # Metrics measured via GitHub API
        "github_metrics": {
            **core_metrics,
            **pr_metrics
        },
        
        # Repo Metrics (Measured via git_stats / GitHub API)
        # Note: 'Total Commits' and 'Lines Added/Deleted' are from GitHub API stats
        "git_activity_metrics": {
            "total_commits": commit_metrics.get("total_commits", 0),
            "total_lines_added": churn_metrics.get("total_lines_added", 0),
            "total_lines_deleted": churn_metrics.get("total_lines_deleted", 0),
            "commits_by_year": commit_metrics.get("commits_by_year", {}),
            "commits_by_month_last_12": commit_metrics.get("commits_by_month_last_12", {})
        },
        
        # Metrics that REQUIRE LOCAL ANALYSIS
        "local_analysis_required": {
            "Note": "These metrics require cloning the repository and running external tools like 'scc' or 'cloc', and cannot be retrieved via the GitHub REST API.",
            "git_stats_metrics_not_available": [
                "Number of text-based files",
                "Number of binary files",
                "Number of total lines in text-based files",
            ],
            "scc_metrics_not_available": [
                "Number of code lines in text-based files",
                "Number of comment lines in text-based files",
                "Number of blank lines in text-based files",
            ]
        }
    }
    return final_report
def print_single_report(results):
    """Prints the formatted report for a single repository."""
    
    if 'Error' in results:
        print(f"\n!!! ERROR: {results['Error']} !!!")
        return
        
    print("\n" + "="*50)
    print(f"       FINAL REPOSITORY METRICS REPORT")
    print("="*50)
    
    # Print the GitHub API results in a nicely formatted way
    print(f"\n[REPO: {results['repository']}]")
    
    # --- GitHub Metrics ---
    print("\n--- A. Repository Engagement Metrics (GitHub API) ---")
    gh_metrics = results['github_metrics']
    print(f"  Stars: {gh_metrics.get('stars', 'N/A'):,}")
    print(f"  Forks: {gh_metrics.get('forks', 'N/A'):,}")
    print(f"  Watchers: {gh_metrics.get('watchers', 'N/A'):,}")
    print(f"  Open Pull Requests: {gh_metrics.get('open_pull_requests', 'N/A'):,}")
    print(f"  Closed Pull Requests: {gh_metrics.get('closed_pull_requests', 'N/A'):,}")
    
    # --- Git Activity Metrics ---
    print("\n--- B. Git Activity & Churn Metrics (GitHub API) ---")
    git_metrics = results['git_activity_metrics']
    print(f"  Total Commits (Last 5Y): {git_metrics.get('total_commits', 'N/A'):,}")
    print(f"  Total Lines Added: {git_metrics.get('total_lines_added', 'N/A'):,}")
    print(f"  Total Lines Deleted: {git_metrics.get('total_lines_deleted', 'N/A'):,}")
    
    # Commits by Year
    print("\n  Commits by Year (Last 5):")
    for year, count in git_metrics.get('commits_by_year', {}).items():
        print(f"    {year}: {count:,}")
        
    # Commits by Month
    print("\n  Commits by Month (Last 12):")
    for month, count in git_metrics.get('commits_by_month_last_12', {}).items():
        print(f"    {month}: {count:,}")
        
    # --- Local Analysis Note ---
    print("\n" + "="*50)
    print("!!! C. Metrics Requiring Local Analysis !!!")
    print("The following cannot be retrieved via the API and are NOT in this report:")
    print(" - Line Counts (Code/Comment/Blank)")
    print(" - File Classification (Text vs. Binary)")
    print("To get this data, you must clone the repo and run an external tool.")
    print("="*50)

def print_summary_report(all_results):
    """Prints a concise table summary of all analyzed repositories."""
    print("\n" + "#"*70)
    print("### Comprehensive Summary Report for All Repositories ")
    print("#"*70)
    
    # Filter out error results
    successful_results = [r for r in all_results if 'Error' not in r]

    if not successful_results:
        print("No successful results to display.")
        return

    # Prepare data for a table
    table_data = []
    
    # Calculate 'Activity Score' (simple approximation)
    def calculate_activity_score(res):
        gh = res['github_metrics']
        git = res['git_activity_metrics']
        # Simple weighted score: Stars + Forks + (Open PRs * 5) + (Total Commits / 100)
        score = gh.get('stars', 0) + \
                gh.get('forks', 0) + \
                (gh.get('open_pull_requests', 0) * 5) + \
                (git.get('total_commits', 0) / 100)
        return int(score)

    for res in successful_results:
        gh = res['github_metrics']
        git = res['git_activity_metrics']
        
        # Get last commit date for 'Last Activity'
        last_month = list(git['commits_by_month_last_12'].keys())[-1] if git['commits_by_month_last_12'] else 'N/A'
        
        table_data.append({
            "Repository": res['repository'],
            "Stars": f"{gh.get('stars', 0):,}",
            "Forks": f"{gh.get('forks', 0):,}",
            "Open PRs": f"{gh.get('open_pull_requests', 0):,}",
            "Total Commits (5Y)": f"{git.get('total_commits', 0):,}",
            "Latest Month Commits": f"{git['commits_by_month_last_12'].get(last_month, 0):,}" if last_month != 'N/A' else 'N/A',
            "Activity Score": calculate_activity_score(res)
        })

    # Sort by the Activity Score for better comparison
    table_data.sort(key=lambda x: x['Activity Score'], reverse=True)

    # Print the table
    header = "| {:<30} | {:>8} | {:>6} | {:>8} | {:>18} | {:>22} | {:>14} |".format(
        "Repository", "Stars", "Forks", "Open PRs", "Total Commits (5Y)", "Latest Month Commits", "Activity Score")
    separator = "|{}|{}|{}|{}|{}|{}|{}|".format(
        "-"*32, "-"*10, "-"*8, "-"*10, "-"*20, "-"*24, "-"*16)

    print(header)
    print(separator)

    for row in table_data:
        print("| {:<30} | {:>8} | {:>6} | {:>8} | {:>18} | {:>22} | {:>14,} |".format(
            row["Repository"], row["Stars"], row["Forks"], row["Open PRs"], 
            row["Total Commits (5Y)"], row["Latest Month Commits"], row["Activity Score"]))
            
    print(separator)
    print(f"\nNote: The 'Activity Score' is a custom heuristic based on a weighted sum of key metrics for rough comparative sorting.")

if __name__ == "__main__":
    all_results = []
    for url in GITHUB_URLS_TO_ANALYZE:
        setup_metrics(url)
        time.sleep(1)