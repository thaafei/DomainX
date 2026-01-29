import pytest
from unittest.mock import Mock
from rest_framework import status
from rest_framework.test import APIClient
from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
import api.database.library_metric_values.views as values_views_module


@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc")


@pytest.fixture()
def domain2():
    return Domain.objects.create(domain_name="D2", description="desc")


@pytest.fixture()
def metric1():
    return Metric.objects.create(metric_name="Stars Count")


@pytest.fixture()
def metric2():
    return Metric.objects.create(metric_name="Forks Count")


@pytest.mark.django_db
def test_analyze_library_not_found(api_client):
    resp = api_client.post("/api/library_metric_values/libraries/00000000-0000-0000-0000-000000000000/analyze/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_analyze_library_returns_400_when_enqueue_returns_none(api_client, domain, monkeypatch):
    fake_enqueue = Mock(return_value=None)
    monkeypatch.setattr(values_views_module, "enqueue_library_analysis", fake_enqueue)

    lib = Library.objects.create(domain=domain, library_name="L1", url=None)
    lib.analysis_error = "Library URL is missing."
    lib.save(update_fields=["analysis_error"])

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/analyze/")

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["error"] == "Library URL is missing."
    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_analyze_library_success_202(api_client, domain, monkeypatch):
    fake_enqueue = Mock(return_value="task-123")
    monkeypatch.setattr(values_views_module, "enqueue_library_analysis", fake_enqueue)

    lib = Library.objects.create(domain=domain, library_name="L1", url="https://github.com/org/repo")

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/analyze/")

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.json()
    assert body["message"] == "Analysis queued."
    assert body["library_id"] == str(lib.library_ID)
    assert body["task_id"] == "task-123"
    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_analyze_library_enqueue_raises_sets_failed_and_returns_500(api_client, domain, monkeypatch):
    fake_enqueue = Mock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(values_views_module, "enqueue_library_analysis", fake_enqueue)

    lib = Library.objects.create(domain=domain, library_name="L1", url="https://github.com/org/repo")

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/analyze/")

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert resp.json()["error"] == "boom"

    lib.refresh_from_db()
    assert lib.analysis_status == Library.ANALYSIS_FAILED
    assert lib.analysis_error == "boom"


@pytest.mark.django_db
def test_analyze_domain_libraries_domain_not_found(api_client):
    resp = api_client.post("/api/library_metric_values/00000000-0000-0000-0000-000000000000/analyze-all/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_analyze_domain_libraries_mixed_results(api_client, domain, monkeypatch):
    l1 = Library.objects.create(domain=domain, library_name="A", url="https://a")
    l2 = Library.objects.create(domain=domain, library_name="B", url=None)
    l2.analysis_error = "Library URL is missing."
    l2.save(update_fields=["analysis_error"])

    fake_enqueue = Mock(side_effect=["task-a", None])
    monkeypatch.setattr(values_views_module, "enqueue_library_analysis", fake_enqueue)

    resp = api_client.post(f"/api/library_metric_values/{domain.domain_ID}/analyze-all/")

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.json()

    assert body["message"] == "Analysis queued for domain libraries."
    assert body["total"] == 2

    assert {"library_id": str(l1.library_ID), "task_id": "task-a"} in body["queued"]
    assert {"library_id": str(l2.library_ID), "error": "Library URL is missing."} in body["failed"]


@pytest.mark.django_db
def test_analyze_domain_libraries_enqueue_raises_marks_failed(api_client, domain, monkeypatch):
    l1 = Library.objects.create(domain=domain, library_name="A", url="https://a")
    l2 = Library.objects.create(domain=domain, library_name="B", url="https://b")

    fake_enqueue = Mock(side_effect=["task-a", RuntimeError("boom")])
    monkeypatch.setattr(values_views_module, "enqueue_library_analysis", fake_enqueue)

    resp = api_client.post(f"/api/library_metric_values/{domain.domain_ID}/analyze-all/")

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.json()

    assert {"library_id": str(l1.library_ID), "task_id": "task-a"} in body["queued"]
    assert {"library_id": str(l2.library_ID), "error": "boom"} in body["failed"]

    l2.refresh_from_db()
    assert l2.analysis_status == Library.ANALYSIS_FAILED
    assert l2.analysis_error == "boom"


@pytest.mark.django_db
def test_domain_comparison_domain_not_found(api_client):
    resp = api_client.get("/api/library_metric_values/comparison/00000000-0000-0000-0000-000000000000/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_domain_comparison_returns_metrics_and_library_table(api_client, domain, domain2, metric1, metric2):
    l1 = Library.objects.create(domain=domain, library_name="A", url="https://a", programming_language="Python")
    l2 = Library.objects.create(domain=domain, library_name="B", url="https://b", programming_language="JS")
    Library.objects.create(domain=domain2, library_name="C", url="https://c")

    LibraryMetricValue.objects.create(library=l1, metric=metric1, value=42)

    resp = api_client.get(f"/api/library_metric_values/comparison/{domain.domain_ID}/")

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()

    metric_names = {m["metric_name"] for m in body["metrics"]}
    assert metric_names >= {"Stars Count", "Forks Count"}

    libs = body["libraries"]
    assert {row["library_name"] for row in libs} == {"A", "B"}

    by_name = {row["library_name"]: row for row in libs}
    assert by_name["A"]["metrics"]["Stars Count"] == 42
    assert by_name["A"]["metrics"]["Forks Count"] is None
    assert by_name["B"]["metrics"]["Stars Count"] is None
    assert by_name["B"]["metrics"]["Forks Count"] is None


@pytest.mark.django_db
def test_update_values_creates_and_saves_values(api_client, domain, metric1, metric2):
    lib = Library.objects.create(domain=domain, library_name="L1", url=None)

    payload = {"metrics": {"Stars Count": 10, "Forks Count": 2}}

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"success": True}

    v1 = LibraryMetricValue.objects.get(library=lib, metric=metric1)
    v2 = LibraryMetricValue.objects.get(library=lib, metric=metric2)
    assert v1.value == 10
    assert v2.value == 2


@pytest.mark.django_db
def test_update_values_upserts_existing_value(api_client, domain, metric1):
    lib = Library.objects.create(domain=domain, library_name="L2", url=None)
    LibraryMetricValue.objects.create(library=lib, metric=metric1, value=1)

    payload = {"metrics": {"Stars Count": 777}}

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    updated = LibraryMetricValue.objects.get(library=lib, metric=metric1)
    assert updated.value == 777


@pytest.mark.django_db
def test_update_values_updates_evidence_field(api_client, domain, metric1):
    lib = Library.objects.create(domain=domain, library_name="L3", url=None)

    payload = {"metrics": {"Stars Count_evidence": "sample-evidence"}}

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    v = LibraryMetricValue.objects.get(library=lib, metric=metric1)
    assert v.evidence == "sample-evidence"


@pytest.mark.django_db
def test_update_values_ignores_unknown_metrics(api_client, domain):
    lib = Library.objects.create(domain=domain, library_name="L4", url=None)

    payload = {"metrics": {"Not A Real Metric": 123}}

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK

    assert not LibraryMetricValue.objects.filter(library=lib, metric__metric_name="Not A Real Metric").exists()


@pytest.mark.django_db
def test_update_values_rejects_non_dict_metrics(api_client, domain):
    lib = Library.objects.create(domain=domain, library_name="L5", url=None)

    payload = {"metrics": ["bad", "list"]}

    resp = api_client.post(f"/api/library_metric_values/libraries/{lib.library_ID}/update-values/", payload, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["error"] == "metrics must be an object/dict"
