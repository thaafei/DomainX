import os
import time
import requests
import jwt
from pathlib import Path
from urllib.parse import urlparse

API_BASE = "https://api.github.com"
_APP_TOKEN_CACHE = {"token": None, "exp": 0}

def _is_github_app_configured() -> bool:
    return bool(os.getenv("GITHUB_APP_ID") and os.getenv("GITHUB_APP_PRIVATE_KEY_PATH"))

def _load_private_key() -> str:
    key_path = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH")
    if not key_path:
        raise RuntimeError("GITHUB_APP_PRIVATE_KEY_PATH is not set.")
    return Path(key_path).read_text()

def _make_app_jwt() -> str:
    app_id = os.getenv("GITHUB_APP_ID")
    if not app_id:
        raise RuntimeError("GITHUB_APP_ID is not set.")

    private_key = _load_private_key()
    now = int(time.time())

    payload = {
        "iat": now - 30,
        "exp": now + 9 * 60,  # <= 10 minutes
        "iss": app_id,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")

def _get_installation_id(app_jwt: str) -> int:
    env_id = os.getenv("GITHUB_APP_INSTALLATION_ID")
    if env_id:
        return int(env_id)

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {app_jwt}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    resp = requests.get(f"{API_BASE}/app/installations", headers=headers, timeout=20)
    resp.raise_for_status()
    installs = resp.json()
    if not installs:
        raise RuntimeError("No installations found. Install the GitHub App on an account/org first.")
    return installs[0]["id"]

def _get_installation_token() -> str:
    now = int(time.time())
    if _APP_TOKEN_CACHE["token"] and now < _APP_TOKEN_CACHE["exp"] - 60:
        return _APP_TOKEN_CACHE["token"]

    app_jwt = _make_app_jwt()
    installation_id = _get_installation_id(app_jwt)

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {app_jwt}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    resp = requests.post(
        f"{API_BASE}/app/installations/{installation_id}/access_tokens",
        headers=headers,
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data["token"]
    _APP_TOKEN_CACHE["token"] = token
    _APP_TOKEN_CACHE["exp"] = now + 55 * 60
    return token

def _get_auth_token() -> str:
    if _is_github_app_configured():
        return _get_installation_token()

    pat = os.getenv("GITHUB_TOKEN")
    if pat:
        return pat

    raise RuntimeError(
        "No GitHub credentials found. Set either:\n"
        "- GitHub App: GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY_PATH (+ optional GITHUB_APP_INSTALLATION_ID)\n"
        "or\n"
        "- PAT: GITHUB_TOKEN"
    )

def github_get(path: str, *, params=None, timeout=20):
    token = _get_auth_token()

    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"token {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    url = path if path.startswith("http") else f"{API_BASE}{path}"
    resp = requests.get(url, headers=headers, params=params, timeout=timeout)

    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise RuntimeError(f"GitHub API error {resp.status_code} for {url}: {detail}")

    return resp
