import pytest
from unittest.mock import Mock
from rest_framework import status
from rest_framework.test import APIClient

from api.database.domain.models import Domain
from api.database.libraries.models import Library
import api.database.libraries.views as library_views_module


@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc")


@pytest.mark.django_db
def test_list_libraries_returns_only_domain_libraries(api_client, domain):
    other = Domain.objects.create(domain_name="Other", description="x")

    Library.objects.create(
        domain=domain,
        library_name="A",
        github_url="https://github.com/org/a",
        url="https://a.org",
        programming_language="Python",
    )
    Library.objects.create(
        domain=domain,
        library_name="B",
        github_url="https://github.com/org/b",
        url="https://b.org",
        programming_language="JS",
    )
    Library.objects.create(
        domain=other,
        library_name="C",
        github_url="https://github.com/org/c",
        url="https://c.org",
        programming_language="Go",
    )

    resp = api_client.get(f"/api/libraries/by_domain/{domain.domain_ID}/")
    assert resp.status_code == status.HTTP_200_OK

    body = resp.json()
    assert isinstance(body, list)
    assert [row["library_name"] for row in body] == ["A", "B"]
    assert body[0]["url"] == "https://a.org"
    assert body[1]["url"] == "https://b.org"


@pytest.mark.django_db
def test_create_library_requires_domain(api_client):
    resp = api_client.post("/api/libraries/", {}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    data = resp.json()
    assert isinstance(data, dict)
    assert "domain" in data or data.get("error") == "Domain is required."


@pytest.mark.django_db
def test_create_library_invalid_domain(api_client):
    payload = {
        "domain": "00000000-0000-0000-0000-000000000000",
        "library_name": "X",
        "github_url": "https://github.com/x/y",
        "url": "https://x.org",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    data = resp.json()
    assert isinstance(data, dict)
    assert "domain" in data


@pytest.mark.django_db
def test_create_library_success_sets_pending_and_returns_task_ids(api_client, domain, monkeypatch):
    fake_enqueue = Mock(
        return_value={
            "analysis_task_id": "task-123",
            "gitstats_task_id": "git-456",
        }
    )
    monkeypatch.setattr(library_views_module, "enqueue_library_analysis", fake_enqueue)

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "RepoA",
        "github_url": "https://github.com/org/repoA",
        "url": "https://repoa.org",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/", payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED

    body = resp.json()
    assert body["message"] == "Library created. Analysis queued (or failed)."
    assert body["analysis_task_id"] == "task-123"
    assert body["gitstats_task_id"] == "git-456"
    assert body["library"]["library_name"] == "RepoA"
    assert body["library"]["url"] == "https://repoa.org"

    created = Library.objects.get(library_name="RepoA", domain=domain)
    assert created.analysis_status == Library.ANALYSIS_PENDING
    assert created.analysis_task_id == "task-123"
    assert created.gitstats_task_id == "git-456"
    assert created.analysis_error is None
    assert created.analysis_started_at is None
    assert created.analysis_finished_at is None
    assert created.url == "https://repoa.org"

    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_create_library_enqueue_raises_marks_failed_and_task_ids_none(api_client, domain, monkeypatch):
    fake_enqueue = Mock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(library_views_module, "enqueue_library_analysis", fake_enqueue)

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "RepoB",
        "github_url": "https://github.com/org/repoB",
        "url": "https://repob.org",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/", payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED

    body = resp.json()
    assert body["analysis_task_id"] is None
    assert body["gitstats_task_id"] is None
    assert body["library"]["url"] == "https://repob.org"

    created = Library.objects.get(library_name="RepoB", domain=domain)
    assert created.analysis_status == Library.ANALYSIS_FAILED
    assert created.analysis_error == "boom"
    assert created.analysis_task_id is None
    assert created.gitstats_task_id is None
    assert created.url == "https://repob.org"


@pytest.mark.django_db
def test_patch_library_success(api_client, domain):
    lib = Library.objects.create(
        domain=domain,
        library_name="OldName",
        github_url="https://github.com/org/old",
        url="https://old.org",
        programming_language="Python",
    )

    payload = {
        "library_name": "NewName",
        "url": "https://new.org",
    }
    resp = api_client.patch(f"/api/libraries/{lib.library_ID}/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    body = resp.json()
    assert body["message"] == "Library updated successfully."
    assert body["library"]["library_name"] == "NewName"
    assert body["library"]["url"] == "https://new.org"

    lib.refresh_from_db()
    assert lib.library_name == "NewName"
    assert lib.url == "https://new.org"


@pytest.mark.django_db
def test_put_library_success(api_client, domain):
    lib = Library.objects.create(
        domain=domain,
        library_name="Name1",
        github_url="https://github.com/org/repo1",
        url="https://repo1.org",
        programming_language="Python",
    )

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "Name2",
        "github_url": "https://github.com/org/repo2",
        "url": "https://repo2.org",
        "programming_language": "Go",
    }

    resp = api_client.put(f"/api/libraries/{lib.library_ID}/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    body = resp.json()
    assert body["message"] == "Library updated successfully."
    assert body["library"]["library_name"] == "Name2"
    assert body["library"]["programming_language"] == "Go"
    assert body["library"]["github_url"] == "https://github.com/org/repo2"
    assert body["library"]["url"] == "https://repo2.org"

    lib.refresh_from_db()
    assert lib.library_name == "Name2"
    assert lib.github_url == "https://github.com/org/repo2"
    assert lib.url == "https://repo2.org"
    assert lib.programming_language == "Go"


@pytest.mark.django_db
def test_put_library_rejects_non_github_url(api_client, domain):
    lib = Library.objects.create(
        domain=domain,
        library_name="Name1",
        github_url="https://github.com/org/repo1",
        url="https://repo1.org",
        programming_language="Python",
    )

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "Name2",
        "github_url": "https://example.com/not-github",
        "url": "https://repo2.org",
        "programming_language": "Go",
    }

    resp = api_client.put(f"/api/libraries/{lib.library_ID}/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    data = resp.json()
    assert "github_url" in data


@pytest.mark.django_db
def test_create_library_duplicate_name_returns_validation_error(api_client, domain):
    Library.objects.create(
        domain=domain,
        library_name="SameName",
        github_url="https://github.com/org/repo1",
        url="https://repo1.org",
    )

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "SameName",
        "github_url": "https://github.com/org/repo2",
        "url": "https://repo2.org",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    data = resp.json()
    assert "library_name" in data


@pytest.mark.django_db
def test_put_library_duplicate_name_returns_validation_error(api_client, domain):
    Library.objects.create(
        domain=domain,
        library_name="ExistingName",
        github_url="https://github.com/org/repo1",
        url="https://repo1.org",
    )
    lib = Library.objects.create(
        domain=domain,
        library_name="OtherName",
        github_url="https://github.com/org/repo2",
        url="https://repo2.org",
    )

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "ExistingName",
        "github_url": "https://github.com/org/repo2",
        "url": "https://repo2.org",
        "programming_language": "",
    }

    resp = api_client.put(f"/api/libraries/{lib.library_ID}/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    data = resp.json()
    assert "library_name" in data


@pytest.mark.django_db
def test_delete_library_not_found(api_client):
    resp = api_client.delete("/api/libraries/00000000-0000-0000-0000-000000000000/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_delete_library_success(api_client, domain):
    lib = Library.objects.create(
        domain=domain,
        library_name="Temp",
        github_url="https://github.com/org/temp",
        url="https://temp.org",
    )

    resp = api_client.delete(f"/api/libraries/{lib.library_ID}/")
    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not Library.objects.filter(pk=lib.library_ID).exists()