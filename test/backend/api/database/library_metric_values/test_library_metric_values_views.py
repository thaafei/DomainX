import json
from unittest.mock import Mock

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory

from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
import api.database.library_metric_values.views as views_module


@pytest.fixture()
def rf():
    return APIRequestFactory()


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc", category_weights={})


@pytest.fixture()
def domain2():
    return Domain.objects.create(domain_name="D2", description="desc", category_weights={})


@pytest.fixture()
def lib_a(domain):
    return Library.objects.create(domain=domain, library_name="A", url="https://a", programming_language="Python")


@pytest.fixture()
def lib_b(domain):
    return Library.objects.create(domain=domain, library_name="B", url="https://b", programming_language="JS")


@pytest.fixture()
def lib_c(domain2):
    return Library.objects.create(domain=domain2, library_name="C", url="https://c", programming_language="Go")


@pytest.fixture()
def metric_stars():
    return Metric.objects.create(metric_name="Stars Count")


@pytest.fixture()
def metric_forks():
    return Metric.objects.create(metric_name="Forks Count")


@pytest.mark.django_db
def test_analyze_library_success_202(rf, lib_a, monkeypatch):
    fake_enqueue = Mock(return_value={"analysis_task_id": "t1", "gitstats_task_id": "g1"})
    monkeypatch.setattr(views_module, "enqueue_library_analysis", fake_enqueue)

    req = rf.post("/x", {}, format="json")
    resp = views_module.analyze_library(req, library_id=str(lib_a.library_ID))

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.data
    assert body["message"] == "Analysis queued."
    assert body["library_id"] == str(lib_a.library_ID)
    assert body["analysis_task_id"] == "t1"
    assert body["gitstats_task_id"] == "g1"
    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_analyze_library_enqueue_returns_none_400(rf, lib_a, monkeypatch):
    lib_a.analysis_error = "bad"
    lib_a.save(update_fields=["analysis_error"])

    fake_enqueue = Mock(return_value=None)
    monkeypatch.setattr(views_module, "enqueue_library_analysis", fake_enqueue)

    req = rf.post("/x", {}, format="json")
    resp = views_module.analyze_library(req, library_id=str(lib_a.library_ID))

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["error"] == "bad"
    fake_enqueue.assert_called_once()


@pytest.mark.django_db
def test_analyze_library_enqueue_raises_500_and_marks_failed(rf, lib_a, monkeypatch):
    fake_enqueue = Mock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(views_module, "enqueue_library_analysis", fake_enqueue)

    req = rf.post("/x", {}, format="json")
    resp = views_module.analyze_library(req, library_id=str(lib_a.library_ID))

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert resp.data["error"] == "boom"

    lib_a.refresh_from_db()
    assert lib_a.analysis_status == Library.ANALYSIS_FAILED
    assert lib_a.analysis_error == "boom"


@pytest.mark.django_db
def test_analyze_domain_libraries_mixed_results(rf, domain, lib_a, lib_b, monkeypatch):
    def fake_enqueue(lib):
        if lib.library_name == "A":
            return {"analysis_task_id": "tA", "gitstats_task_id": "gA"}
        if lib.library_name == "B":
            lib.analysis_error = "nope"
            lib.save(update_fields=["analysis_error"])
            return None
        return {"analysis_task_id": "tX", "gitstats_task_id": "gX"}

    monkeypatch.setattr(views_module, "enqueue_library_analysis", fake_enqueue)

    req = rf.post("/x", {}, format="json")
    resp = views_module.analyze_domain_libraries(req, domain_id=str(domain.domain_ID))

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.data
    assert body["message"] == "Analysis queued for domain libraries."
    assert body["total"] == 2

    queued = body["queued"]
    failed = body["failed"]

    assert len(queued) == 1
    assert queued[0]["library_id"] == str(lib_a.library_ID)
    assert queued[0]["analysis_task_id"] == "tA"
    assert queued[0]["gitstats_task_id"] == "gA"

    assert len(failed) == 1
    assert failed[0]["library_id"] == str(lib_b.library_ID)
    assert failed[0]["error"] == "nope"


@pytest.mark.django_db
def test_analyze_domain_libraries_exception_marks_failed(rf, domain, lib_a, lib_b, monkeypatch):
    def fake_enqueue(lib):
        if lib.library_name == "A":
            raise RuntimeError("explode")
        return {"analysis_task_id": "tB", "gitstats_task_id": "gB"}

    monkeypatch.setattr(views_module, "enqueue_library_analysis", fake_enqueue)

    req = rf.post("/x", {}, format="json")
    resp = views_module.analyze_domain_libraries(req, domain_id=str(domain.domain_ID))

    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = resp.data

    assert len(body["queued"]) == 1
    assert body["queued"][0]["library_id"] == str(lib_b.library_ID)

    assert len(body["failed"]) == 1
    assert body["failed"][0]["library_id"] == str(lib_a.library_ID)
    assert body["failed"][0]["error"] == "explode"

    lib_a.refresh_from_db()
    assert lib_a.analysis_status == Library.ANALYSIS_FAILED
    assert lib_a.analysis_error == "explode"


@pytest.mark.django_db
def test_domain_comparison_returns_metrics_and_rows_with_values_and_evidence(
    rf, domain, lib_a, lib_b, metric_stars, metric_forks
):
    LibraryMetricValue.objects.create(library=lib_a, metric=metric_stars, value=10, evidence="srcA")
    LibraryMetricValue.objects.create(library=lib_a, metric=metric_forks, value=2, evidence="srcB")
    LibraryMetricValue.objects.create(library=lib_b, metric=metric_stars, value=None, evidence=None)

    lib_a.gitstats_status = Library.GITSTATS_SUCCESS
    lib_a.save(update_fields=["gitstats_status"])

    req = rf.get("/x")
    resp = views_module.domain_comparison(req, domain_id=str(domain.domain_ID))

    assert resp.status_code == status.HTTP_200_OK
    body = resp.data

    assert isinstance(body["metrics"], list)
    assert {m["metric_name"] for m in body["metrics"]} == {"Stars Count", "Forks Count"}

    libs = body["libraries"]
    assert isinstance(libs, list)
    assert {row["library_name"] for row in libs} == {"A", "B"}

    by_name = {row["library_name"]: row for row in libs}

    a_row = by_name["A"]
    assert a_row["library_ID"] == str(lib_a.library_ID)
    assert a_row["metrics"]["Stars Count"] == 10
    assert a_row["metrics"]["Stars Count_evidence"] == "srcA"
    assert a_row["metrics"]["Forks Count"] == 2
    assert a_row["metrics"]["Forks Count_evidence"] == "srcB"
    assert a_row["gitstats_report_url"] == f"/gitstats/{lib_a.library_ID}/git_stats/index.html"

    b_row = by_name["B"]
    assert b_row["metrics"]["Stars Count"] is None
    assert b_row["metrics"]["Stars Count_evidence"] is None
    assert b_row["metrics"]["Forks Count"] is None


@pytest.mark.django_db
def test_library_metric_value_update_requires_metrics_dict(rf, lib_a):
    view = views_module.LibraryMetricValueUpdateView.as_view()
    req = rf.post("/x", {"metrics": ["bad"]}, format="json")
    resp = view(req, library_id=str(lib_a.library_ID))

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["error"] == "metrics must be an object/dict"


@pytest.mark.django_db
def test_library_metric_value_update_creates_value_and_evidence(rf, lib_a, metric_stars, metric_forks):
    view = views_module.LibraryMetricValueUpdateView.as_view()

    req = rf.post(
        "/x",
        {
            "metrics": {
                "Stars Count": 12,
                "Stars Count_evidence": "gh api",
                "Forks Count": "",
                "Forks Count_evidence": None,
                "Unknown Metric": 5,
            }
        },
        format="json",
    )
    resp = view(req, library_id=str(lib_a.library_ID))

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["success"] is True

    stars = LibraryMetricValue.objects.get(library=lib_a, metric=metric_stars)
    assert stars.value == 12
    assert stars.evidence == "gh api"

    forks = LibraryMetricValue.objects.get(library=lib_a, metric=metric_forks)
    assert forks.value is None
    assert forks.evidence is None

    assert LibraryMetricValue.objects.filter(library=lib_a, metric__metric_name="Unknown Metric").count() == 0


@pytest.mark.django_db
def test_metric_value_bulk_update_rejects_non_list(rf):
    view = views_module.MetricValueBulkUpdateView.as_view()
    req = rf.post("/x", {"a": 1}, format="json")
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["error"] == "Expected a list of updates."


@pytest.mark.django_db
def test_metric_value_bulk_update_empty_list_returns_200(rf):
    view = views_module.MetricValueBulkUpdateView.as_view()
    req = rf.post("/x", [], format="json")
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["status"] == "No data received to update."


@pytest.mark.django_db
def test_metric_value_bulk_update_success(rf, lib_a, metric_stars, metric_forks):
    view = views_module.MetricValueBulkUpdateView.as_view()

    updates = [
        {"library_id": str(lib_a.library_ID), "metric_id": str(metric_stars.metric_ID), "value": 99},
        {"library_id": str(lib_a.library_ID), "metric_id": str(metric_forks.metric_ID), "value": ""},
        {"library_id": None, "metric_id": str(metric_forks.metric_ID), "value": 1},
    ]

    req = rf.post("/x", updates, format="json")
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["status"] == "Successfully updated 3 metric values."

    stars = LibraryMetricValue.objects.get(library=lib_a, metric=metric_stars)
    assert stars.value == 99

    forks = LibraryMetricValue.objects.get(library=lib_a, metric=metric_forks)
    assert forks.value is None


@pytest.mark.django_db
def test_ahp_calculations_basic(rf, domain, lib_a, lib_b, monkeypatch, tmp_path):
    rules = {"range": {}, "bool": {}, "options": {}}
    categories = {"Categories": ["Quality"]}

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "rules.json").write_text(json.dumps(rules))
    (tmp_path / "api" / "database" / "categories.json").write_text(json.dumps(categories))

    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    m = Metric.objects.create(metric_name="Score", category="Quality", option_category=None, value_type="range", rule="")

    LibraryMetricValue.objects.create(library=lib_a, metric=m, value=10)
    LibraryMetricValue.objects.create(library=lib_b, metric=m, value=5)

    view = views_module.AHPCalculations.as_view()
    req = rf.get("/x")
    resp = view(req, domain_id=str(domain.domain_ID))

    assert resp.status_code == status.HTTP_200_OK
    body = resp.data
    assert body["domain"] == domain.domain_name
    assert "global_ranking" in body
    assert set(body["global_ranking"].keys()) == {"A", "B"}

    lib_a.refresh_from_db()
    lib_b.refresh_from_db()
    assert "overall_score" in lib_a.ahp_results
    assert "category_scores" in lib_a.ahp_results
    assert "overall_score" in lib_b.ahp_results
    assert "category_scores" in lib_b.ahp_results
