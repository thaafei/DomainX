import uuid

import pytest
from django.db import IntegrityError

from api.database.metrics.models import Metric


@pytest.mark.django_db
def test_metric_str_returns_name():
    metric = Metric.objects.create(metric_name="Stars Count")
    assert str(metric) == "Stars Count"


@pytest.mark.django_db
def test_metric_id_is_uuid():
    metric = Metric.objects.create(metric_name="Forks Count")
    assert isinstance(metric.metric_ID, uuid.UUID)


@pytest.mark.django_db
def test_metric_defaults_and_blank_fields():
    metric = Metric.objects.create(metric_name="Coverage")

    assert metric.description is None
    assert metric.category is None
    assert metric.weight == 1.0
    assert metric.option_category is None
    assert metric.rule is None
    assert metric.value_type == "float"
    assert metric.source_type == "manual"
    assert metric.metric_key is None
    assert metric.created_at is not None
    assert metric.scoring_dict == {}
    assert isinstance(metric.scoring_dict, dict)


@pytest.mark.django_db
def test_metric_name_must_be_unique():
    Metric.objects.create(metric_name="Bus Factor")

    with pytest.raises(IntegrityError):
        Metric.objects.create(metric_name="Bus Factor")


@pytest.mark.django_db
def test_metric_allows_nullable_optional_fields():
    metric = Metric.objects.create(
        metric_name="Issue Activity",
        description=None,
        category=None,
        option_category=None,
        rule=None,
        metric_key=None,
        scoring_dict=None,
    )

    assert metric.description is None
    assert metric.category is None
    assert metric.option_category is None
    assert metric.rule is None
    assert metric.metric_key is None
    assert metric.scoring_dict is None


@pytest.mark.django_db
def test_metric_can_store_non_default_choice_values():
    metric = Metric.objects.create(
        metric_name="License Type",
        value_type="text",
        source_type="github_api",
    )

    assert metric.value_type == "text"
    assert metric.source_type == "github_api"


@pytest.mark.django_db
def test_metric_can_store_scoring_dict():
    scoring = {"low": 1, "medium": 2, "high": 3}

    metric = Metric.objects.create(
        metric_name="Risk Level",
        scoring_dict=scoring,
    )

    assert metric.scoring_dict == scoring
    assert metric.scoring_dict["low"] == 1
    assert metric.scoring_dict["medium"] == 2
    assert metric.scoring_dict["high"] == 3


@pytest.mark.django_db
def test_metric_can_store_metric_key_and_metadata():
    metric = Metric.objects.create(
        metric_name="GitHub Stars",
        description="Number of stars on GitHub",
        category="Popularity",
        weight=2.5,
        option_category="repo_stats",
        rule="stars_rule",
        value_type="int",
        source_type="github_api",
        metric_key="stargazers_count",
    )

    assert metric.description == "Number of stars on GitHub"
    assert metric.category == "Popularity"
    assert metric.weight == 2.5
    assert metric.option_category == "repo_stats"
    assert metric.rule == "stars_rule"
    assert metric.value_type == "int"
    assert metric.source_type == "github_api"
    assert metric.metric_key == "stargazers_count"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "value_type",
    ["float", "int", "bool", "range", "text", "date", "time", "datetime"],
)
def test_metric_accepts_all_value_type_choices(value_type):
    metric = Metric.objects.create(
        metric_name=f"Metric-{value_type}",
        value_type=value_type,
    )
    assert metric.value_type == value_type


@pytest.mark.django_db
@pytest.mark.parametrize("source_type", ["manual", "github_api", "scc", "gitstats"])
def test_metric_accepts_all_source_type_choices(source_type):
    metric = Metric.objects.create(
        metric_name=f"Metric-{source_type}",
        source_type=source_type,
    )
    assert metric.source_type == source_type
