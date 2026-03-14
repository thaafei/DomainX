import pytest
from unittest.mock import Mock
import time

import api.services.github_http as gh


def test_is_github_app_configured_true(monkeypatch):
    monkeypatch.setenv("GITHUB_APP_ID", "123")
    monkeypatch.setenv("GITHUB_APP_PRIVATE_KEY_PATH", "/fake/key.pem")
    assert gh._is_github_app_configured() is True


def test_is_github_app_configured_false(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_ID", raising=False)
    monkeypatch.delenv("GITHUB_APP_PRIVATE_KEY_PATH", raising=False)
    assert gh._is_github_app_configured() is False


def test_load_private_key_reads_file(monkeypatch, tmp_path):
    key_file = tmp_path / "key.pem"
    key_file.write_text("PRIVATE_KEY_CONTENT")
    monkeypatch.setenv("GITHUB_APP_PRIVATE_KEY_PATH", str(key_file))
    assert gh._load_private_key() == "PRIVATE_KEY_CONTENT"


def test_load_private_key_missing_env(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_PRIVATE_KEY_PATH", raising=False)
    with pytest.raises(RuntimeError):
        gh._load_private_key()


def test_make_app_jwt_missing_app_id(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_ID", raising=False)
    monkeypatch.setattr(gh, "_load_private_key", lambda: "KEY")
    with pytest.raises(RuntimeError):
        gh._make_app_jwt()


def test_make_app_jwt_calls_jwt_encode(monkeypatch):
    monkeypatch.setenv("GITHUB_APP_ID", "123")
    monkeypatch.setattr(gh, "_load_private_key", lambda: "KEY")
    monkeypatch.setattr(time, "time", lambda: 1_000)

    mock_encode = Mock(return_value="JWT_TOKEN")
    monkeypatch.setattr(gh.jwt, "encode", mock_encode)

    token = gh._make_app_jwt()
    assert token == "JWT_TOKEN"

    args, kwargs = mock_encode.call_args
    payload, private_key = args[0], args[1]
    assert private_key == "KEY"
    assert kwargs["algorithm"] == "RS256"
    assert payload["iss"] == "123"
    assert payload["iat"] == 970
    assert payload["exp"] == 1_540


def test_get_installation_id_from_env(monkeypatch):
    monkeypatch.setenv("GITHUB_APP_INSTALLATION_ID", "999")
    assert gh._get_installation_id("jwt") == 999


def test_get_installation_id_from_api(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_INSTALLATION_ID", raising=False)

    response = Mock()
    response.json.return_value = [{"id": 123}]
    response.raise_for_status.return_value = None

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    assert gh._get_installation_id("jwt") == 123


def test_get_installation_id_no_installations(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_INSTALLATION_ID", raising=False)

    response = Mock()
    response.json.return_value = []
    response.raise_for_status.return_value = None

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    with pytest.raises(RuntimeError):
        gh._get_installation_id("jwt")


def test_get_installation_token_cached(monkeypatch):
    now = int(time.time())
    gh._APP_TOKEN_CACHE["token"] = "CACHED"
    gh._APP_TOKEN_CACHE["exp"] = now + 3600
    assert gh._get_installation_token() == "CACHED"


def test_get_installation_token_new(monkeypatch):
    gh._APP_TOKEN_CACHE["token"] = None
    gh._APP_TOKEN_CACHE["exp"] = 0

    monkeypatch.setattr(time, "time", lambda: 1_000)
    monkeypatch.setattr(gh, "_make_app_jwt", lambda: "JWT")
    monkeypatch.setattr(gh, "_get_installation_id", lambda _: 123)

    response = Mock()
    response.json.return_value = {"token": "NEW_TOKEN"}
    response.raise_for_status.return_value = None

    monkeypatch.setattr(gh.requests, "post", lambda *a, **k: response)

    token = gh._get_installation_token()
    assert token == "NEW_TOKEN"
    assert gh._APP_TOKEN_CACHE["token"] == "NEW_TOKEN"
    assert gh._APP_TOKEN_CACHE["exp"] == 1_000 + 55 * 60


def test_get_auth_token_github_app(monkeypatch):
    monkeypatch.setattr(gh, "_is_github_app_configured", lambda: True)
    monkeypatch.setattr(gh, "_get_installation_token", lambda: "APP_TOKEN")
    assert gh._get_auth_token() == "APP_TOKEN"


def test_get_auth_token_pat(monkeypatch):
    monkeypatch.setattr(gh, "_is_github_app_configured", lambda: False)
    monkeypatch.setenv("GITHUB_TOKEN", "PAT")
    assert gh._get_auth_token() == "PAT"


def test_get_auth_token_missing(monkeypatch):
    monkeypatch.setattr(gh, "_is_github_app_configured", lambda: False)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    with pytest.raises(RuntimeError):
        gh._get_auth_token()


def test_github_get_success(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 200

    def fake_get(url, headers=None, params=None, timeout=None):
        assert headers["Authorization"] == "token TOKEN"
        assert headers["Accept"] == "application/vnd.github+json"
        assert headers["X-GitHub-Api-Version"] == "2022-11-28"
        assert params == {"a": 1}
        assert timeout == 7
        assert url == f"{gh.API_BASE}/repos/test/repo"
        return response

    monkeypatch.setattr(gh.requests, "get", fake_get)

    resp = gh.github_get("/repos/test/repo", params={"a": 1}, timeout=7)
    assert resp == response


def test_github_get_success_full_url(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 200

    full_url = "https://api.github.com/repos/test/repo"

    def fake_get(url, headers=None, params=None, timeout=None):
        assert url == full_url
        return response

    monkeypatch.setattr(gh.requests, "get", fake_get)

    resp = gh.github_get(full_url)
    assert resp == response


def test_github_get_error_json_detail(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 404
    response.json.return_value = {"message": "Not Found"}
    response.text = "Not Found"

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    with pytest.raises(RuntimeError) as e:
        gh.github_get("/bad/path")

    msg = str(e.value)
    assert "GitHub API error 404" in msg
    assert f"{gh.API_BASE}/bad/path" in msg
    assert "Not Found" in msg


def test_github_get_error_text_detail_when_json_fails(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 500
    response.text = "Server Error"
    response.json.side_effect = ValueError("no json")

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    with pytest.raises(RuntimeError) as e:
        gh.github_get("/oops")

    msg = str(e.value)
    assert "GitHub API error 500" in msg
    assert f"{gh.API_BASE}/oops" in msg
    assert "Server Error" in msg
