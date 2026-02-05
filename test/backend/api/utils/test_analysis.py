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
    fake_analyze = Mock()
    fake_analyze.delay = Mock()
    monkeypatch.setattr(analysis_module, "analyze_repo_task", fake_analyze)

    fake_gitstats = Mock()
    fake_gitstats.apply_async = Mock()
    monkeypatch.setattr(analysis_module, "analyze_repo_gitstats_task", fake_gitstats)

    lib = Library.objects.create(domain=domain, library_name="Repo", url=None)

    result = enqueue_library_analysis(lib)
    assert result is None

    lib.refresh_from_db()
    assert lib.analysis_status == Library.ANALYSIS_FAILED
    assert lib.analysis_error == "Library URL is missing."
    assert lib.analysis_task_id is None
    assert lib.gitstats_task_id is None

    fake_analyze.delay.assert_not_called()
    fake_gitstats.apply_async.assert_not_called()


@pytest.mark.django_db
def test_library_analysis_with_url_queues_both_tasks_and_sets_ids(monkeypatch, domain):
    fake_analyze = Mock()
    fake_analyze.delay = Mock(return_value=Mock(id="task-123"))
    monkeypatch.setattr(analysis_module, "analyze_repo_task", fake_analyze)

    fake_gitstats = Mock()
    fake_gitstats.apply_async = Mock(return_value=Mock(id="git-456"))
    monkeypatch.setattr(analysis_module, "analyze_repo_gitstats_task", fake_gitstats)

    lib = Library.objects.create(domain=domain, library_name="Repo", url="https://github.com/org/repo")

    result = enqueue_library_analysis(lib)
    assert result == {"analysis_task_id": "task-123", "gitstats_task_id": "git-456"}

    fake_analyze.delay.assert_called_once_with(str(lib.library_ID), lib.url)
    fake_gitstats.apply_async.assert_called_once()
    _, kwargs = fake_gitstats.apply_async.call_args
    assert kwargs["args"] == [str(lib.library_ID), lib.url]
    assert kwargs["queue"] == "gitstats"

    lib.refresh_from_db()
    assert lib.analysis_status == Library.ANALYSIS_PENDING
    assert lib.analysis_task_id == "task-123"
    assert lib.analysis_error is None

    assert lib.gitstats_status == Library.GITSTATS_PENDING
    assert lib.gitstats_task_id == "git-456"
    assert lib.gitstats_error is None
    assert lib.gitstats_report_path is None
