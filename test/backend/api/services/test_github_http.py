import pytest
from unittest.mock import Mock
import time

import api.services.github_http as gh

def test_github_get_success(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 200
    response.raise_for_status.return_value = None

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    resp = gh.github_get("/repos/test/repo")

    assert resp == response


def test_github_get_error(monkeypatch):
    monkeypatch.setattr(gh, "_get_auth_token", lambda: "TOKEN")

    response = Mock()
    response.status_code = 404
    response.json.return_value = {"message": "Not Found"}
    response.text = "Not Found"

    monkeypatch.setattr(gh.requests, "get", lambda *a, **k: response)

    with pytest.raises(RuntimeError):
        gh.github_get("/bad/path")


def test_is_github_app_configured_true(monkeypatch):
    monkeypatch.setenv("GITHUB_APP_ID", "123")
    monkeypatch.setenv("GITHUB_APP_PRIVATE_KEY_PATH", "/fake/key.pem")

    assert gh._is_github_app_configured() is True


def test_is_github_app_configured_false(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_ID", raising=False)
    monkeypatch.delenv("GITHUB_APP_PRIVATE_KEY_PATH", raising=False)

    assert gh._is_github_app_configured() is False

def test_load_private_key(monkeypatch, tmp_path):
    key_file = tmp_path / "key.pem"
    key_file.write_text("PRIVATE_KEY_CONTENT")

    monkeypatch.setenv("GITHUB_APP_PRIVATE_KEY_PATH", str(key_file))

    assert gh._load_private_key() == "PRIVATE_KEY_CONTENT"


def test_load_private_key_missing_env(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_PRIVATE_KEY_PATH", raising=False)

    with pytest.raises(RuntimeError):
        gh._load_private_key()

def test_make_app_jwt(monkeypatch):
    monkeypatch.setenv("GITHUB_APP_ID", "123")
    monkeypatch.setenv("GITHUB_APP_PRIVATE_KEY_PATH", "/fake/key.pem")

    monkeypatch.setattr(gh, "_load_private_key", lambda: "KEY")
    monkeypatch.setattr(time, "time", lambda: 1_000)

    mock_encode = Mock(return_value="JWT_TOKEN")
    monkeypatch.setattr(gh.jwt, "encode", mock_encode)

    token = gh._make_app_jwt()

    assert token == "JWT_TOKEN"
    mock_encode.assert_called_once()

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

def test_get_installation_token_cached(monkeypatch):
    gh._APP_TOKEN_CACHE["token"] = "CACHED"
    gh._APP_TOKEN_CACHE["exp"] = int(time.time()) + 3600

    assert gh._get_installation_token() == "CACHED"


def test_get_installation_token_new(monkeypatch):
    gh._APP_TOKEN_CACHE["token"] = None
    gh._APP_TOKEN_CACHE["exp"] = 0

    monkeypatch.setattr(gh, "_make_app_jwt", lambda: "JWT")
    monkeypatch.setattr(gh, "_get_installation_id", lambda _: 123)

    response = Mock()
    response.json.return_value = {"token": "NEW_TOKEN"}
    response.raise_for_status.return_value = None

    monkeypatch.setattr(gh.requests, "post", lambda *a, **k: response)

    token = gh._get_installation_token()

    assert token == "NEW_TOKEN"
    assert gh._APP_TOKEN_CACHE["token"] == "NEW_TOKEN"

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

