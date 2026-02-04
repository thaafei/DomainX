import pytest
from unittest.mock import Mock

import requests

import api.database.services as services_module
from api.database.services import RepoAnalyzer


def test_extract_repo_info_valid_url():
    ra = RepoAnalyzer("https://github.com/onnx/onnxrepo")
    assert ra.repo_owner == "onnx"
    assert ra.repo_name == "onnxrepo"


def test_extract_repo_info_strips_git_suffix():
    ra = RepoAnalyzer("https://github.com/repo/reponame.git")
    assert ra.repo_owner == "repo"
    assert ra.repo_name == "reponame"


def test_extract_repo_info_invalid_url_raises():
    with pytest.raises(ValueError):
        RepoAnalyzer("https://github.com/owner")


def test_parse_last_page_from_link_returns_page_number():
    ra = RepoAnalyzer("https://github.com/o/r")
    link = '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=42>; rel="last"'
    assert ra._parse_last_page_from_link(link) == 42


def test_parse_last_page_from_link_none_or_missing_last_returns_none():
    ra = RepoAnalyzer("https://github.com/o/r")
    assert ra._parse_last_page_from_link("") is None
    assert ra._parse_last_page_from_link(None) is None
    link = '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next"'
    assert ra._parse_last_page_from_link(link) is None


def test_search_count_uses_search_endpoint_and_reads_total_count(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"total_count": 123}

    fake_get = Mock(return_value=resp)
    monkeypatch.setattr(services_module, "github_get", fake_get)

    assert ra._search_count("repo:o/r is:pr is:open") == 123
    fake_get.assert_called_once()
    args, kwargs = fake_get.call_args
    assert args[0] == "/search/issues"
    assert kwargs["params"]["q"] == "repo:o/r is:pr is:open"
    assert kwargs["params"]["per_page"] == 1


def test_get_commits_past_five_years_returns_0_on_409(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 409

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_commits_past_five_years() == 0


def test_get_commits_past_five_years_uses_last_page_if_present(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {
        "Link": '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=77>; rel="last"'
    }
    resp.json.return_value = [{"sha": "x"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_commits_past_five_years() == 77


def test_get_commits_past_five_years_falls_back_to_json_length(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {"Link": None}
    resp.json.return_value = [{"sha": "x"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_commits_past_five_years() == 1


def test_get_file_type_counts_counts_text_and_binary(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {
        "tree": [
            {"type": "blob", "path": "src/main.py"},
            {"type": "blob", "path": "README.md"},
            {"type": "blob", "path": "assets/logo.PNG"},
            {"type": "blob", "path": "bin/app.exe"},
            {"type": "tree", "path": "src"},
        ]
    }

    fake_get = Mock(return_value=resp)
    monkeypatch.setattr(services_module, "github_get", fake_get)

    text, binary = ra._get_file_type_counts("main")
    assert text == 2
    assert binary == 2


def test_get_file_type_counts_returns_0_0_on_non_200(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 500
    resp.json.return_value = {}

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_file_type_counts("main") == (0, 0)


def test_get_github_api_metrics_happy_path(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    repo_resp = Mock()
    repo_resp.raise_for_status.return_value = None
    repo_resp.json.return_value = {
        "default_branch": "main",
        "stargazers_count": 1,
        "forks_count": 2,
        "subscribers_count": 3,
    }

    def fake_github_get(path, *, params=None, timeout=20):
        if path == "/repos/o/r":
            return repo_resp
        raise AssertionError(f"Unexpected path: {path}")

    monkeypatch.setattr(services_module, "github_get", fake_github_get)
    monkeypatch.setattr(ra, "_get_file_type_counts", lambda branch: (10, 4))
    monkeypatch.setattr(ra, "_get_open_issues_count", lambda: 5)
    monkeypatch.setattr(ra, "_get_total_commit_count_via_api", lambda: 6)
    monkeypatch.setattr(ra, "_get_branch_count_via_api", lambda: 7)
    monkeypatch.setattr(ra, "_get_open_prs_count", lambda: 8)
    monkeypatch.setattr(ra, "_get_closed_prs_count", lambda: 9)
    monkeypatch.setattr(ra, "_get_commits_past_five_years", lambda: 11)

    metrics = ra._get_github_api_metrics()
    assert metrics["Stars Count"] == 1
    assert metrics["Forks Count"] == 2
    assert metrics["Watchers Count"] == 3
    assert metrics["Open Issues Count"] == 5
    assert metrics["Commit Count"] == 6
    assert metrics["Branch Count"] == 7
    assert metrics["Open PRs Count"] == 8
    assert metrics["Closed PRs Count"] == 9
    assert metrics["Commits (Last 5 Years)"] == 11
    assert metrics["Text Files"] == 10
    assert metrics["Binary Files"] == 4


def test_get_github_api_metrics_wraps_request_exception(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    def fake_github_get(*a, **k):
        raise requests.exceptions.RequestException("boom")

    monkeypatch.setattr(services_module, "github_get", fake_github_get)

    with pytest.raises(Exception) as ex:
        ra._get_github_api_metrics()
    assert "GitHub API Error:" in str(ex.value)


def test_analyze_repo_filters_to_target_int_metrics(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    monkeypatch.setattr(ra, "_get_github_api_metrics", lambda: {"Stars Count": 5, "Forks Count": None, "Other": 9})
    monkeypatch.setattr(ra, "_clone_repo_to_tempdir", lambda: ("/tmp/root", "/tmp/repo"))
    monkeypatch.setattr(ra, "_run_scc", lambda repo_dir: {"Total Lines (SCC)": 100, "Code Lines (SCC)": "bad"})
    monkeypatch.setattr(services_module.shutil, "rmtree", lambda *a, **k: None)

    out = ra._analyze_repo()
    assert out == {"Stars Count": 5, "Total Lines (SCC)": 100}


def test_run_analysis_and_get_data_returns_repo_name_and_metric_data(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")
    monkeypatch.setattr(ra, "_analyze_repo", lambda: {"Stars Count": 1})
    out = ra.run_analysis_and_get_data()
    assert out["repo_name"] == "r"
    assert out["metric_data"] == {"Stars Count": 1}
