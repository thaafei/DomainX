import uuid

import pytest
from django.db import IntegrityError

from api.database.domain.models import Domain
from api.database.libraries.models import Library


@pytest.mark.django_db
def test_library_str_returns_name():
    domain = Domain.objects.create(domain_name="D1", description="desc")
    lib = Library.objects.create(domain=domain, library_name="LibA")
    assert str(lib) == "LibA"


@pytest.mark.django_db
def test_get_library_id_returns_string_uuid():
    domain = Domain.objects.create(domain_name="D2", description="desc")
    lib = Library.objects.create(domain=domain, library_name="LibB")
    lib_id_str = lib.get_library_id()
    assert isinstance(lib_id_str, str)
    assert uuid.UUID(lib_id_str) == lib.library_ID


@pytest.mark.django_db
def test_defaults_and_blank_fields():
    domain = Domain.objects.create(domain_name="D3", description="desc")
    lib = Library.objects.create(domain=domain, library_name="LibC")

    assert lib.ahp_results == {}
    assert isinstance(lib.ahp_results, dict)

    assert lib.programming_language is None
    assert lib.url is None
    assert lib.gitstats_report_path is None

    assert lib.gitstats_status == Library.GITSTATS_PENDING
    assert lib.gitstats_task_id is None
    assert lib.gitstats_error is None
    assert lib.gitstats_started_at is None
    assert lib.gitstats_finished_at is None

    assert lib.analysis_status == Library.ANALYSIS_PENDING
    assert lib.analysis_task_id is None
    assert lib.analysis_error is None
    assert lib.analysis_started_at is None
    assert lib.analysis_finished_at is None

    assert lib.created_at is not None


@pytest.mark.django_db
def test_unique_library_name_per_domain_constraint():
    domain = Domain.objects.create(domain_name="D4", description="desc")

    Library.objects.create(domain=domain, library_name="SameName", url="https://example.com/a")
    with pytest.raises(IntegrityError):
        Library.objects.create(domain=domain, library_name="SameName", url="https://example.com/b")


@pytest.mark.django_db
def test_same_library_name_allowed_in_different_domains():
    d1 = Domain.objects.create(domain_name="D5A", description="desc")
    d2 = Domain.objects.create(domain_name="D5B", description="desc")

    Library.objects.create(domain=d1, library_name="SharedName")
    Library.objects.create(domain=d2, library_name="SharedName")

    assert Library.objects.filter(domain=d1, library_name="SharedName").count() == 1
    assert Library.objects.filter(domain=d2, library_name="SharedName").count() == 1


@pytest.mark.django_db
def test_unique_url_per_domain_constraint():
    domain = Domain.objects.create(domain_name="D6", description="desc")

    Library.objects.create(domain=domain, library_name="Lib1", url="https://github.com/x/y")
    with pytest.raises(IntegrityError):
        Library.objects.create(domain=domain, library_name="Lib2", url="https://github.com/x/y")


@pytest.mark.django_db
def test_same_url_allowed_in_different_domains():
    d1 = Domain.objects.create(domain_name="D7A", description="desc")
    d2 = Domain.objects.create(domain_name="D7B", description="desc")

    Library.objects.create(domain=d1, library_name="Lib1", url="https://github.com/x/y")
    Library.objects.create(domain=d2, library_name="Lib2", url="https://github.com/x/y")

    assert Library.objects.filter(domain=d1, url="https://github.com/x/y").count() == 1
    assert Library.objects.filter(domain=d2, url="https://github.com/x/y").count() == 1


@pytest.mark.django_db
def test_null_url_does_not_break_basic_creation():
    domain = Domain.objects.create(domain_name="D8", description="desc")
    lib = Library.objects.create(domain=domain, library_name="LibNoUrl", url=None)
    assert lib.url is None
