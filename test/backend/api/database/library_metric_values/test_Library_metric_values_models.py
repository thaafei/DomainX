import uuid

import pytest

from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc")


@pytest.fixture()
def library(domain):
    return Library.objects.create(
        domain=domain,
        library_name="RepoA",
        url="https://github.com/org/repoA",
        programming_language="Python",
    )


@pytest.fixture()
def metric():
    return Metric.objects.create(metric_name="Stars Count")


@pytest.mark.django_db
def test_library_metric_value_str_format(library, metric):
    lmv = LibraryMetricValue.objects.create(
        library=library,
        metric=metric,
        value={"count": 10},
    )
    assert str(lmv) == "RepoA - Stars Count: {'count': 10}"


@pytest.mark.django_db
def test_value_id_is_uuid(library, metric):
    lmv = LibraryMetricValue.objects.create(library=library, metric=metric, value=5)
    assert isinstance(lmv.value_ID, uuid.UUID)


@pytest.mark.django_db
def test_value_can_be_null(library, metric):
    lmv = LibraryMetricValue.objects.create(library=library, metric=metric, value=None)
    assert lmv.value is None
    assert str(lmv) == "RepoA - Stars Count: None"


@pytest.mark.django_db
def test_optional_fields_defaults(library, metric):
    lmv = LibraryMetricValue.objects.create(library=library, metric=metric)
    assert lmv.value is None
    assert lmv.evidence is None
    assert lmv.collected_by is None
    assert lmv.last_modified is not None


@pytest.mark.django_db
def test_last_modified_updates_on_save(library, metric):
    lmv = LibraryMetricValue.objects.create(library=library, metric=metric, value=1)
    first = lmv.last_modified

    lmv.value = 2
    lmv.save()

    lmv.refresh_from_db()
    assert lmv.last_modified >= first


@pytest.mark.django_db
def test_cascade_delete_when_library_deleted(domain, metric):
    lib = Library.objects.create(domain=domain, library_name="ToDelete", url="https://x")
    lmv = LibraryMetricValue.objects.create(library=lib, metric=metric, value=1)

    lib.delete()
    assert not LibraryMetricValue.objects.filter(pk=lmv.value_ID).exists()


@pytest.mark.django_db
def test_cascade_delete_when_metric_deleted(library):
    met = Metric.objects.create(metric_name="Forks Count")
    lmv = LibraryMetricValue.objects.create(library=library, metric=met, value=1)

    met.delete()
    assert not LibraryMetricValue.objects.filter(pk=lmv.value_ID).exists()
