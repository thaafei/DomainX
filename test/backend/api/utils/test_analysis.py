import pytest
from unittest.mock import Mock
from api.database.domain.models import Domain
from api.database.libraries.models import Library
import api.utils.analysis as analysis_module
from api.utils.analysis import enqueue_library_analysis


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="Test Domain", description="desc")


@pytest.mark.django_db
def test_library_analysis_missing_url(monkeypatch, domain):
    fake_task = Mock()
    fake_task.delay = Mock()
    monkeypatch.setattr(analysis_module, "analyze_repo_task", fake_task)

    lib = Library.objects.create(domain=domain, library_name="Repo", url=None)

    task_id = enqueue_library_analysis(lib)
    assert task_id is None

    lib.refresh_from_db()
    assert lib.analysis_status == Library.ANALYSIS_FAILED
    assert lib.analysis_error == "Library URL is missing."
    fake_task.delay.assert_not_called()


@pytest.mark.django_db
def test_library_analysis_with_url(monkeypatch, domain):
    fake_task = Mock()
    fake_task.delay = Mock(return_value=Mock(id="task-123"))
    monkeypatch.setattr(analysis_module, "analyze_repo_task", fake_task)

    lib = Library.objects.create(domain=domain, library_name="Repo", url="https://github.com/org/repo")

    task_id = enqueue_library_analysis(lib)
    assert task_id == "task-123"

    fake_task.delay.assert_called_once_with(str(lib.library_ID), lib.url)

    lib.refresh_from_db()
    assert lib.analysis_status == Library.ANALYSIS_PENDING
    assert lib.analysis_task_id == "task-123"
    assert lib.analysis_error is None
