from unittest.mock import Mock

import pytest
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


def test_parse_last_page_from_link_invalid_page_returns_none():
    ra = RepoAnalyzer("https://github.com/o/r")
    link = '<https://api.github.com/repositories/1/commits?per_page=1&page=abc>; rel="last"'
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


def test_get_open_prs_count_builds_expected_query(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")
    fake_search = Mock(return_value=8)
    monkeypatch.setattr(ra, "_search_count", fake_search)

    result = ra._get_open_prs_count()

    assert result == 8
    fake_search.assert_called_once_with("repo:o/r is:pr is:open")


def test_get_closed_prs_count_builds_expected_query(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")
    fake_search = Mock(return_value=14)
    monkeypatch.setattr(ra, "_search_count", fake_search)

    result = ra._get_closed_prs_count()

    assert result == 14
    fake_search.assert_called_once_with("repo:o/r is:pr is:closed")


def test_get_open_issues_count_builds_expected_query(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")
    fake_search = Mock(return_value=5)
    monkeypatch.setattr(ra, "_search_count", fake_search)

    result = ra._get_open_issues_count()

    assert result == 5
    fake_search.assert_called_once_with("repo:o/r is:issue is:open")


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


def test_get_commits_past_five_years_returns_1_when_no_last_page_and_data_exists(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {"Link": None}
    resp.json.return_value = [{"sha": "x"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_commits_past_five_years() == 1


def test_get_commits_past_five_years_returns_0_when_no_last_page_and_no_data(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {"Link": None}
    resp.json.return_value = []

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_commits_past_five_years() == 0


def test_get_total_commit_count_via_api_returns_0_on_409(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 409

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_total_commit_count_via_api() == 0


def test_get_total_commit_count_via_api_uses_last_page_if_present(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {
        "Link": '<https://api.github.com/repositories/1/commits?per_page=1&page=18>; rel="last"'
    }
    resp.json.return_value = [{"sha": "x"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_total_commit_count_via_api() == 18


def test_get_total_commit_count_via_api_falls_back_to_json_length(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {"Link": None}
    resp.json.return_value = [{"sha": "a"}, {"sha": "b"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_total_commit_count_via_api() == 2


def test_get_branch_count_via_api_returns_0_on_409(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 409

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_branch_count_via_api() == 0


def test_get_branch_count_via_api_uses_last_page_if_present(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {
        "Link": '<https://api.github.com/repositories/1/branches?per_page=1&page=6>; rel="last"'
    }
    resp.json.return_value = [{"name": "main"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_branch_count_via_api() == 6


def test_get_branch_count_via_api_falls_back_to_json_length(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    resp = Mock()
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    resp.headers = {"Link": None}
    resp.json.return_value = [{"name": "main"}, {"name": "dev"}]

    monkeypatch.setattr(services_module, "github_get", lambda *a, **k: resp)
    assert ra._get_branch_count_via_api() == 2


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

    def fake_github_get(path, *, params=None):
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
    assert metrics["stars_count"] == 1
    assert metrics["forks_count"] == 2
    assert metrics["watchers_count"] == 3
    assert metrics["open_issues_count"] == 5
    assert metrics["commit_count"] == 6
    assert metrics["branch_count"] == 7
    assert metrics["open_prs_count"] == 8
    assert metrics["closed_prs_count"] == 9
    assert metrics["commits_last_5_years"] == 11
    assert metrics["text_files"] == 10
    assert metrics["binary_files"] == 4


def test_get_github_api_metrics_wraps_request_exception(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    def fake_github_get(*a, **k):
        raise requests.exceptions.RequestException("boom")

    monkeypatch.setattr(services_module, "github_get", fake_github_get)

    with pytest.raises(Exception) as ex:
        ra._get_github_api_metrics()

    assert "GitHub API Error:" in str(ex.value)


def test_run_scc_returns_expected_totals_from_total_row(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    fake_result = Mock()
    fake_result.stdout = """
    [
        {"Name": "Python", "Files": 2, "Lines": 120, "Code": 80, "Comments": 20, "Blanks": 20},
        {"Name": "Total", "Files": 2, "Lines": 120, "Code": 80, "Comments": 20, "Blanks": 20}
    ]
    """

    monkeypatch.setattr(services_module.subprocess, "run", lambda *a, **k: fake_result)

    result = ra._run_scc("/tmp/repo")
    assert result == {
        "text_files_scc": 2,
        "total_lines_scc": 120,
        "blank_lines_scc": 20,
        "comment_lines_scc": 20,
        "code_lines_scc": 80,
    }


def test_run_scc_sums_rows_when_total_row_missing(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    fake_result = Mock()
    fake_result.stdout = """
    [
        {"Name": "Python", "Files": 2, "Lines": 120, "Code": 80, "Comments": 20, "Blanks": 20},
        {"Name": "JavaScript", "Files": 1, "Lines": 30, "Code": 15, "Comments": 10, "Blanks": 5}
    ]
    """

    monkeypatch.setattr(services_module.subprocess, "run", lambda *a, **k: fake_result)

    result = ra._run_scc("/tmp/repo")
    assert result == {
        "text_files_scc": 3,
        "total_lines_scc": 150,
        "blank_lines_scc": 25,
        "comment_lines_scc": 30,
        "code_lines_scc": 95,
    }


def test_run_scc_raises_when_json_invalid(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    fake_result = Mock()
    fake_result.stdout = "not json"

    monkeypatch.setattr(services_module.subprocess, "run", lambda *a, **k: fake_result)

    with pytest.raises(Exception) as ex:
        ra._run_scc("/tmp/repo")

    assert str(ex.value) == "scc output was not valid JSON."


def test_run_scc_raises_when_scc_missing(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    def fake_run(*a, **k):
        raise FileNotFoundError

    monkeypatch.setattr(services_module.subprocess, "run", fake_run)

    with pytest.raises(Exception) as ex:
        ra._run_scc("/tmp/repo")

    assert str(ex.value) == "scc is not installed or not on PATH."


def test_run_scc_raises_when_scc_times_out(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    def fake_run(*a, **k):
        raise services_module.subprocess.TimeoutExpired(cmd="scc", timeout=10)

    monkeypatch.setattr(services_module.subprocess, "run", fake_run)

    with pytest.raises(Exception) as ex:
        ra._run_scc("/tmp/repo")

    assert str(ex.value) == "scc timed out."


def test_analyze_repo_filters_to_target_metrics(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    monkeypatch.setattr(
        ra,
        "_get_github_api_metrics",
        lambda: {"stars_count": 5, "forks_count": None, "other_metric": 9},
    )
    monkeypatch.setattr(ra, "_clone_repo_to_tempdir", lambda: ("/tmp/root", "/tmp/repo"))
    monkeypatch.setattr(
        ra,
        "_run_scc",
        lambda repo_dir: {"total_lines_scc": 100, "code_lines_scc": 80, "ignored_scc": 1},
    )
    monkeypatch.setattr(
        services_module,
        "TARGET_METRICS",
        {"stars_count": {}, "total_lines_scc": {}, "code_lines_scc": {}},
    )
    monkeypatch.setattr(services_module.shutil, "rmtree", lambda *a, **k: None)

    out = ra._analyze_repo()
    assert out == {
        "stars_count": 5,
        "total_lines_scc": 100,
        "code_lines_scc": 80,
    }


def test_analyze_repo_cleans_temp_directory_even_when_scc_fails(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    removed = []

    monkeypatch.setattr(ra, "_get_github_api_metrics", lambda: {"stars_count": 5})
    monkeypatch.setattr(ra, "_clone_repo_to_tempdir", lambda: ("/tmp/root", "/tmp/repo"))

    def fake_run_scc(repo_dir):
        raise Exception("scc failed")

    monkeypatch.setattr(ra, "_run_scc", fake_run_scc)
    monkeypatch.setattr(services_module.shutil, "rmtree", lambda path, ignore_errors=True: removed.append(path))

    with pytest.raises(Exception) as ex:
        ra._analyze_repo()

    assert str(ex.value) == "scc failed"
    assert "/tmp/root" in removed


def test_run_analysis_and_get_data_returns_repo_name_and_metric_data(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")
    monkeypatch.setattr(ra, "_analyze_repo", lambda: {"stars_count": 1})

    out = ra.run_analysis_and_get_data()

    assert out["repo_name"] == "r"
    assert out["metric_data"] == {"stars_count": 1}


def test_run_analysis_and_get_data_reraises_exception(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    def fake_analyze():
        raise Exception("analysis failed")

    monkeypatch.setattr(ra, "_analyze_repo", fake_analyze)

    with pytest.raises(Exception) as ex:
        ra.run_analysis_and_get_data()

    assert str(ex.value) == "analysis failed"


def test_clone_repo_to_dir_returns_repo_dir(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    monkeypatch.setattr(services_module.os.path, "exists", lambda p: False)
    monkeypatch.setattr(services_module.subprocess, "run", lambda *a, **k: None)

    repo_dir = ra._clone_repo_to_dir("/tmp/workdir")
    assert repo_dir == "/tmp/workdir/repo"


def test_clone_repo_to_dir_raises_timeout(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    monkeypatch.setattr(services_module.os.path, "exists", lambda p: False)

    def fake_run(*a, **k):
        raise services_module.subprocess.TimeoutExpired(cmd="git clone", timeout=10)

    monkeypatch.setattr(services_module.subprocess, "run", fake_run)

    with pytest.raises(Exception) as ex:
        ra._clone_repo_to_dir("/tmp/workdir")

    assert str(ex.value) == "Clone timed out."


def test_clone_repo_to_dir_raises_called_process_error(monkeypatch):
    ra = RepoAnalyzer("https://github.com/o/r")

    monkeypatch.setattr(services_module.os.path, "exists", lambda p: False)

    def fake_run(*a, **k):
        raise services_module.subprocess.CalledProcessError(
            returncode=1,
            cmd="git clone",
            stderr="clone failed badly",
        )

    monkeypatch.setattr(services_module.subprocess, "run", fake_run)

    with pytest.raises(Exception) as ex:
        ra._clone_repo_to_dir("/tmp/workdir")

    assert "Clone failed:" in str(ex.value)
    assert "clone failed badly" in str(ex.value)
