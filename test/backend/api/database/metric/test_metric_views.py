import json

import pytest
from rest_framework import status
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model

from api.database.metrics.models import Metric
import api.database.metrics.views as views_module


@pytest.fixture()
def rf():
    return APIRequestFactory()

@pytest.fixture()
def user_factory():
    def _factory(email: str, username: str, role: str = "admin"):
        User = get_user_model()
        return User.objects.create_user(
            username=username,
            email=email,
            password="password123",
            role=role,
        )

    return _factory

@pytest.mark.django_db
def test_load_auto_metric_definitions_reads_json(monkeypatch, tmp_path):
    data = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        },
        "commit_count": {
            "label": "Commit Count",
            "description": "Number of commits",
            "value_type": "int",
            "source_type": "gitstats",
        },
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(data))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    result = views_module.load_auto_metric_definitions()
    assert result == data


@pytest.mark.django_db
def test_auto_metric_options_view_returns_grouped_options(rf, monkeypatch, tmp_path, user_factory):
    data = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        },
        "forks_count": {
            "label": "Forks Count",
            "description": "Number of repository forks",
            "value_type": "int",
            "source_type": "github_api",
        },
        "commit_count": {
            "label": "Commit Count",
            "description": "Number of commits",
            "value_type": "int",
            "source_type": "gitstats",
        },
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(data))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.AutoMetricOptionsView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    assert set(resp.data.keys()) == {"github_api", "gitstats"}

    github_metrics = resp.data["github_api"]
    gitstats_metrics = resp.data["gitstats"]

    assert len(github_metrics) == 2
    assert {item["key"] for item in github_metrics} == {"stars_count", "forks_count"}

    stars_item = next(item for item in github_metrics if item["key"] == "stars_count")
    assert stars_item["label"] == "Stars Count"
    assert stars_item["description"] == "Number of repository stars"
    assert stars_item["value_type"] == "int"

    assert len(gitstats_metrics) == 1
    assert gitstats_metrics[0]["key"] == "commit_count"
    assert gitstats_metrics[0]["label"] == "Commit Count"


@pytest.mark.django_db
def test_auto_metric_options_view_returns_404_when_file_missing(rf, monkeypatch, tmp_path, user_factory):
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.AutoMetricOptionsView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.data["error"] == "auto_metrics.json not found"


@pytest.mark.django_db
def test_auto_metric_options_view_returns_500_for_invalid_json(rf, monkeypatch, tmp_path, user_factory):
    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text("{bad json")
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.AutoMetricOptionsView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert resp.data["error"] == "Error decoding auto_metrics.json"


@pytest.mark.django_db
def test_metric_rules_view_returns_json_data(rf, monkeypatch, tmp_path, user_factory):
    rules_data = {
        "range": {
            "repository_activity": {
                "templates": {
                    "activity_rule": {"low": 1, "high": 5}
                }
            }
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "rules.json").write_text(json.dumps(rules_data))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricRulesView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data == rules_data


@pytest.mark.django_db
def test_metric_rules_view_returns_404_when_file_missing(rf, monkeypatch, tmp_path, user_factory):
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricRulesView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert "rules.json not found at" in resp.data["error"]


@pytest.mark.django_db
def test_metric_rules_view_returns_500_for_invalid_json(rf, monkeypatch, tmp_path, user_factory):
    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "rules.json").write_text("{bad json")
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricRulesView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert resp.data["error"] == "Error decoding rules.json"


@pytest.mark.django_db
def test_metric_category_view_returns_json_data(rf, monkeypatch, tmp_path, user_factory):
    categories_data = {
        "Categories": ["Quality", "Popularity", "Maintenance"]
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "categories.json").write_text(json.dumps(categories_data))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricCategoryView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data == categories_data


@pytest.mark.django_db
def test_metric_category_view_returns_404_when_file_missing(rf, monkeypatch, tmp_path, user_factory):
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricCategoryView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert "categories.json not found at" in resp.data["error"]


@pytest.mark.django_db
def test_metric_category_view_returns_500_for_invalid_json(rf, monkeypatch, tmp_path, user_factory):
    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "categories.json").write_text("{bad json")
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricCategoryView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert resp.data["error"] == "Error decoding categories.json"


@pytest.mark.django_db
def test_metric_list_create_view_lists_metrics_ordered_by_name(rf, user_factory):
    Metric.objects.create(metric_name="Repository Forks", value_type="int")
    Metric.objects.create(metric_name="Commit Activity", value_type="int")
    Metric.objects.create(metric_name="Branch Coverage", value_type="float")

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK
    names = [item["metric_name"] for item in resp.data]
    assert names == ["Branch Coverage", "Commit Activity", "Repository Forks"]


@pytest.mark.django_db
def test_metric_list_create_view_creates_manual_metric_and_clears_metric_key(rf, user_factory):
    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Release Frequency",
            "description": "How often releases happen",
            "category": "Maintenance",
            "weight": 2.0,
            "value_type": "float",
            "source_type": "manual",
            "metric_key": "should_be_removed",
            "scoring_dict": {},
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_201_CREATED
    assert Metric.objects.filter(metric_name="Release Frequency").exists()

    metric = Metric.objects.get(metric_name="Release Frequency")
    assert metric.description == "How often releases happen"
    assert metric.category == "Maintenance"
    assert metric.weight == 2.0
    assert metric.value_type == "float"
    assert metric.source_type == "manual"
    assert metric.metric_key is None


@pytest.mark.django_db
def test_metric_list_create_view_creates_automatic_metric_from_definition(rf, monkeypatch, tmp_path, user_factory):
    auto_metrics = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "description": "Repository stars from GitHub",
            "category": "Popularity",
            "weight": 1.5,
            "value_type": "float",
            "source_type": "github_api",
            "metric_key": "stars_count",
            "scoring_dict": {},
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_201_CREATED

    metric = Metric.objects.get(metric_name="Repository Stars")
    assert metric.source_type == "github_api"
    assert metric.metric_key == "stars_count"
    assert metric.value_type == "int"


@pytest.mark.django_db
def test_metric_list_create_view_rejects_automatic_metric_without_metric_key(rf, monkeypatch, tmp_path, user_factory):
    auto_metrics = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "source_type": "github_api",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "This field is required for automatic metrics."


@pytest.mark.django_db
def test_metric_list_create_view_rejects_invalid_metric_key(rf, monkeypatch, tmp_path, user_factory):
    auto_metrics = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "source_type": "github_api",
            "metric_key": "commit_count",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "Invalid automatic metric key."


@pytest.mark.django_db
def test_metric_list_create_view_rejects_metric_key_with_wrong_source_type(rf, monkeypatch, tmp_path, user_factory):
    auto_metrics = {
        "stars_count": {
            "label": "Stars Count",
            "description": "Number of repository stars",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "source_type": "gitstats",
            "metric_key": "stars_count",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "Selected metric key does not belong to the selected source type."


@pytest.mark.django_db
def test_metric_list_create_view_returns_error_when_auto_metrics_file_missing_for_automatic_metric(
    rf, monkeypatch, tmp_path, user_factory
):
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "source_type": "github_api",
            "metric_key": "stars_count",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "auto_metrics.json not found."


@pytest.mark.django_db
def test_metric_list_create_view_returns_error_when_auto_metrics_file_invalid_for_automatic_metric(
    rf, monkeypatch, tmp_path, user_factory
):
    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text("{bad json")
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    view = views_module.MetricListCreateView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.post(
        "/x",
        {
            "metric_name": "Repository Stars",
            "source_type": "github_api",
            "metric_key": "stars_count",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "auto_metrics.json is invalid."


@pytest.mark.django_db
def test_metric_retrieve_update_destroy_view_retrieves_metric(rf, user_factory):
    metric = Metric.objects.create(
        metric_name="Issue Resolution Time",
        description="Average time to resolve issues",
        value_type="float",
        source_type="manual",
    )

    view = views_module.MetricRetrieveUpdateDestroyView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["metric_name"] == "Issue Resolution Time"
    assert resp.data["description"] == "Average time to resolve issues"


@pytest.mark.django_db
def test_metric_retrieve_update_destroy_view_updates_manual_metric_and_clears_metric_key(rf, user_factory):
    metric = Metric.objects.create(
        metric_name="Repository Size",
        description="Initial description",
        value_type="float",
        source_type="manual",
        metric_key="old_key",
    )

    view = views_module.MetricRetrieveUpdateDestroyView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch(
        "/x",
        {
            "description": "Updated repository size description",
            "weight": 3.5,
            "metric_key": "should_be_removed",
        },
        format="json",
    )
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_200_OK

    metric.refresh_from_db()
    assert metric.description == "Updated repository size description"
    assert metric.weight == 3.5
    assert metric.metric_key is None


@pytest.mark.django_db
def test_metric_retrieve_update_destroy_view_updates_automatic_metric_value_type_from_definition(
    rf, monkeypatch, tmp_path, user_factory
):
    auto_metrics = {
        "forks_count": {
            "label": "Forks Count",
            "description": "Number of repository forks",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    metric = Metric.objects.create(
        metric_name="Repository Forks",
        source_type="github_api",
        metric_key="forks_count",
        value_type="float",
    )

    view = views_module.MetricRetrieveUpdateDestroyView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch(
        "/x",
        {
            "metric_key": "forks_count",
            "value_type": "float",
        },
        format="json",
    )
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_200_OK

    metric.refresh_from_db()
    assert metric.metric_key == "forks_count"
    assert metric.value_type == "int"


@pytest.mark.django_db
def test_metric_retrieve_update_destroy_view_rejects_invalid_metric_key_on_update(
    rf, monkeypatch, tmp_path, user_factory
):
    auto_metrics = {
        "forks_count": {
            "label": "Forks Count",
            "description": "Number of repository forks",
            "value_type": "int",
            "source_type": "github_api",
        }
    }

    (tmp_path / "api" / "database").mkdir(parents=True, exist_ok=True)
    (tmp_path / "api" / "database" / "auto_metrics.json").write_text(json.dumps(auto_metrics))
    monkeypatch.setattr(views_module.settings, "BASE_DIR", str(tmp_path))

    metric = Metric.objects.create(
        metric_name="Repository Forks",
        source_type="github_api",
        metric_key="forks_count",
        value_type="int",
    )

    view = views_module.MetricRetrieveUpdateDestroyView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch(
        "/x",
        {
            "metric_key": "contributors_count",
        },
        format="json",
    )
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["metric_key"][0] == "Invalid automatic metric key."


@pytest.mark.django_db
def test_metric_retrieve_update_destroy_view_deletes_metric(rf, user_factory):
    metric = Metric.objects.create(metric_name="Open Pull Requests")

    view = views_module.MetricRetrieveUpdateDestroyView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.delete("/x")
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not Metric.objects.filter(metric_ID=metric.metric_ID).exists()


@pytest.mark.django_db
def test_metric_update_weight_view_updates_weight(rf, user_factory):
    metric = Metric.objects.create(
        metric_name="Documentation Completeness",
        weight=1.0,
    )

    view = views_module.MetricUpdateWeightView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch("/x", {"weight": 4.25}, format="json")
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["message"] == "Weight updated successfully to 4.25"
    assert resp.data["metric_id"] == str(metric.metric_ID)
    assert resp.data["metric_name"] == "Documentation Completeness"

    metric.refresh_from_db()
    assert metric.weight == 4.25


@pytest.mark.django_db
def test_metric_update_weight_view_returns_400_when_weight_missing(rf, user_factory):
    metric = Metric.objects.create(metric_name="Repository Tags", weight=1.0)

    view = views_module.MetricUpdateWeightView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch("/x", {}, format="json")
    req.user = user
    resp = view(req, metric_id=str(metric.metric_ID))

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["error"] == "Weight field is required"


@pytest.mark.django_db
def test_metric_update_weight_view_returns_404_when_metric_missing(rf, user_factory):
    view = views_module.MetricUpdateWeightView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.patch("/x", {"weight": 2.0}, format="json")
    req.user = user
    resp = view(req, metric_id="3c3d9e13-91fd-4fd2-8d97-4d04d42a0001")

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.data["error"] == "Metric not found"


@pytest.mark.django_db
def test_metric_list_flat_view_lists_metrics_ordered_by_name_and_returns_flat_fields_only(rf, user_factory):
    metric_a = Metric.objects.create(
        metric_name="Repository Forks",
        value_type="int",
        source_type="github_api",
    )
    metric_b = Metric.objects.create(
        metric_name="Commit Activity",
        value_type="int",
        source_type="gitstats",
    )
    metric_c = Metric.objects.create(
        metric_name="Branch Coverage",
        value_type="float",
        source_type="manual",
    )

    view = views_module.MetricListFlatView.as_view()
    user = user_factory("test@example.com", "testuser")
    req = rf.get("/x")
    req.user = user
    resp = view(req)

    assert resp.status_code == status.HTTP_200_OK

    names = [item["metric_name"] for item in resp.data]
    assert names == ["Branch Coverage", "Commit Activity", "Repository Forks"]

    expected_ids = {
        str(metric_a.metric_ID),
        str(metric_b.metric_ID),
        str(metric_c.metric_ID),
    }
    returned_ids = {item["metric_ID"] for item in resp.data}
    assert returned_ids == expected_ids

    for item in resp.data:
        assert set(item.keys()) == {"metric_ID", "metric_name"}