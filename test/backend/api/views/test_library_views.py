import pytest
from unittest.mock import Mock

from rest_framework import status
from rest_framework.test import APIClient

from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
import api.views.library_views as library_views_module


@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc")


@pytest.fixture()
def metric1():
    return Metric.objects.create(metric_name="Stars Count")


@pytest.fixture()
def metric2():
    return Metric.objects.create(metric_name="Forks Count")

@pytest.mark.django_db
def test_list_libraries_returns_only_domain_libraries(api_client, domain):
    other = Domain.objects.create(domain_name="Other", description="x")

    Library.objects.create(domain=domain, library_name="A", url="https://a", programming_language="Python")
    Library.objects.create(domain=domain, library_name="B", url="https://b", programming_language="JS")
    Library.objects.create(domain=other, library_name="C", url="https://c", programming_language="Go")

    resp = api_client.get(f"/api/libraries/{domain.domain_ID}/")

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert "libraries" in body
    assert {row["library_name"] for row in body["libraries"]} == {"A", "B"}


@pytest.mark.django_db
def test_create_library_requires_domain(api_client):
    resp = api_client.post("/api/libraries/create/", {}, format="json")

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["error"] == "Domain ID is required"


@pytest.mark.django_db
def test_create_library_invalid_domain(api_client):
    payload = {
        "domain": "00000000-0000-0000-0000-000000000000",
        "library_name": "X",
        "url": "https://github.com/x/y",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/create/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["error"] == "Invalid Domain ID"


@pytest.mark.django_db
def test_create_library_success_sets_pending_and_returns_task_id(api_client, domain, monkeypatch):
    fake_enqueue = Mock(return_value="task-123")
    monkeypatch.setattr(library_views_module, "enqueue_library_analysis", fake_enqueue)

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "RepoA",
        "url": "https://github.com/org/repoA",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/create/", payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED

    body = resp.json()
    assert body["message"] == "Library created. Analysis queued (or failed)."
    assert body["task_id"] == "task-123"
    assert body["library"]["library_name"] == "RepoA"

    created = Library.objects.get(library_name="RepoA", domain=domain)
    assert created.analysis_status == Library.ANALYSIS_PENDING
    assert created.analysis_task_id is None
    assert created.analysis_error is None

    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_create_library_enqueue_raises_marks_failed_and_task_id_none(api_client, domain, monkeypatch):
    fake_enqueue = Mock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(library_views_module, "enqueue_library_analysis", fake_enqueue)

    payload = {
        "domain": str(domain.domain_ID),
        "library_name": "RepoB",
        "url": "https://github.com/org/repoB",
        "programming_language": "Python",
    }

    resp = api_client.post("/api/libraries/create/", payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED

    body = resp.json()
    assert body["task_id"] is None

    created = Library.objects.get(library_name="RepoB", domain=domain)
    assert created.analysis_status == Library.ANALYSIS_FAILED
    assert created.analysis_error == "boom"


@pytest.mark.django_db
def test_delete_library_not_found(api_client):
    resp = api_client.delete("/api/libraries/00000000-0000-0000-0000-000000000000/delete/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["error"] == "Library not found"


@pytest.mark.django_db
def test_delete_library_success(api_client, domain):
    lib = Library.objects.create(domain=domain, library_name="Temp", url="https://temp")

    resp = api_client.delete(f"/api/libraries/{lib.library_ID}/delete/")
    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not Library.objects.filter(pk=lib.library_ID).exists()


@pytest.mark.django_db
def test_update_library_values_not_found(api_client):
    resp = api_client.post("/api/libraries/00000000-0000-0000-0000-000000000000/update-values/", {}, format="json")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["error"] == "Library not found"


@pytest.mark.django_db
def test_update_library_values_updates_fields_and_known_metrics_only(api_client, domain, metric1, metric2):
    lib = Library.objects.create(domain=domain, library_name="Old", url="https://old", programming_language="Python")

    payload = {
        "library_name": "NewName",
        "url": "https://new",
        "programming_language": "JS",
        "metrics": {
            "Stars Count": 99,
            "Forks Count": 5,
            "Not A Real Metric": 123,
        },
    }

    resp = api_client.post(f"/api/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"success": True}

    lib.refresh_from_db()
    assert lib.library_name == "NewName"
    assert lib.url == "https://new"
    assert lib.programming_language == "JS"

    v1 = LibraryMetricValue.objects.get(library=lib, metric=metric1)
    v2 = LibraryMetricValue.objects.get(library=lib, metric=metric2)
    assert v1.value == 99
    assert v2.value == 5

    assert not LibraryMetricValue.objects.filter(library=lib, metric__metric_name="Not A Real Metric").exists()


@pytest.mark.django_db
def test_update_library_values_upserts_existing_value(api_client, domain, metric1):
    lib = Library.objects.create(domain=domain, library_name="Repo", url="https://r")
    LibraryMetricValue.objects.create(library=lib, metric=metric1, value=1)

    payload = {"metrics": {"Stars Count": 777}}

    resp = api_client.post(f"/api/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    updated = LibraryMetricValue.objects.get(library=lib, metric=metric1)
    assert updated.value == 777
