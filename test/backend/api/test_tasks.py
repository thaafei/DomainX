import pytest
from unittest.mock import Mock
from celery.exceptions import SoftTimeLimitExceeded

from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
import api.tasks as tasks_module


@pytest.fixture()
def domain():
    return Domain.objects.create(domain_name="D1", description="desc", category_weights={})


@pytest.fixture()
def library(domain):
    return Library.objects.create(
        domain=domain,
        library_name="RepoA",
        url="https://github.com/org/repoA",
        programming_language="Python",
    )


@pytest.mark.django_db
def test_analyze_repo_task_success_updates_metrics_and_marks_success(monkeypatch, library):
    m_stars = Metric.objects.create(
        metric_name="Stars Count",
        metric_key="stars_count",
        value_type="int",
    )
    m_forks = Metric.objects.create(
        metric_name="Forks Count",
        metric_key="forks_count",
        value_type="int",
    )

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {
        "metric_data": {
            "stars_count": "10",
            "forks_count": 2,
            "unknown_metric": 99,
        }
    }

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    result = tasks_module.analyze_repo_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert result["metrics_updated"] == 2
    assert result["metrics_skipped"] == 1

    library.refresh_from_db()
    assert library.analysis_status == Library.ANALYSIS_SUCCESS
    assert library.analysis_task_id == "celery-task-1"
    assert library.analysis_error is None
    assert library.analysis_started_at is not None
    assert library.analysis_finished_at is not None

    v_stars = LibraryMetricValue.objects.get(library=library, metric=m_stars)
    assert v_stars.value == 10
    assert isinstance(v_stars.evidence, str)
    assert "Auto-calculated via GitHub API/SCC on" in v_stars.evidence

    v_forks = LibraryMetricValue.objects.get(library=library, metric=m_forks)
    assert v_forks.value == 2
    assert isinstance(v_forks.evidence, str)
    assert "Auto-calculated via GitHub API/SCC on" in v_forks.evidence

    assert not LibraryMetricValue.objects.filter(library=library, metric__metric_key="unknown_metric").exists()


@pytest.mark.django_db
def test_analyze_repo_task_skips_value_that_cannot_be_converted(monkeypatch, library):
    Metric.objects.create(
        metric_name="Stars Count",
        metric_key="stars_count",
        value_type="int",
    )

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {
        "metric_data": {
            "stars_count": "abc",
        }
    }

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    result = tasks_module.analyze_repo_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert result["metrics_updated"] == 0
    assert result["metrics_skipped"] == 1
    assert not LibraryMetricValue.objects.filter(library=library).exists()

    library.refresh_from_db()
    assert library.analysis_status == Library.ANALYSIS_SUCCESS


@pytest.mark.django_db
def test_analyze_repo_task_converts_float_bool_and_text_values(monkeypatch, library):
    m_float = Metric.objects.create(
        metric_name="Coverage",
        metric_key="coverage",
        value_type="float",
    )
    m_bool = Metric.objects.create(
        metric_name="Has Wiki",
        metric_key="has_wiki",
        value_type="bool",
    )
    m_text = Metric.objects.create(
        metric_name="Repository Label",
        metric_key="repository_label",
        value_type="text",
    )

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {
        "metric_data": {
            "coverage": "91.5",
            "has_wiki": 1,
            "repository_label": 123,
        }
    }

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    result = tasks_module.analyze_repo_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert result["metrics_updated"] == 3
    assert result["metrics_skipped"] == 0

    v_float = LibraryMetricValue.objects.get(library=library, metric=m_float)
    v_bool = LibraryMetricValue.objects.get(library=library, metric=m_bool)
    v_text = LibraryMetricValue.objects.get(library=library, metric=m_text)

    assert v_float.value == 91.5
    assert v_bool.value is True
    assert v_text.value == "123"


@pytest.mark.django_db
def test_analyze_repo_task_sets_running_status_early(monkeypatch, library):
    Metric.objects.create(
        metric_name="Stars Count",
        metric_key="stars_count",
        value_type="int",
    )

    state = {"seen_running": False}

    class Ctx:
        def __enter__(self):
            lib = Library.objects.get(library_ID=library.library_ID)
            state["seen_running"] = (lib.analysis_status == Library.ANALYSIS_RUNNING)
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {
        "metric_data": {"stars_count": "1"}
    }

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    original_atomic = tasks_module.transaction.atomic

    def atomic_wrapper(*args, **kwargs):
        if args or kwargs:
            return original_atomic(*args, **kwargs)
        return Ctx()

    monkeypatch.setattr(tasks_module.transaction, "atomic", atomic_wrapper)

    tasks_module.analyze_repo_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert state["seen_running"] is True


@pytest.mark.django_db
def test_analyze_repo_task_exception_marks_failed_and_raises(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.side_effect = RuntimeError("x")
    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    with pytest.raises(RuntimeError):
        tasks_module.analyze_repo_task.apply(
            args=[str(library.library_ID), library.url],
            task_id="celery-task-1",
        ).get(propagate=True)

    library.refresh_from_db()
    assert library.analysis_status == Library.ANALYSIS_FAILED
    assert library.analysis_error == "Analysis failed. Please check server logs."
    assert library.analysis_finished_at is not None


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_success_sets_report_and_metric(monkeypatch, library):
    metric = Metric.objects.create(
        metric_name="GitStats Report",
        metric_key="gitstats_report",
        value_type="text",
    )

    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.return_value = {"ok": True}

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")
    monkeypatch.setattr(tasks_module.os.path, "exists", lambda path: False)

    result = tasks_module.analyze_repo_gitstats_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True

    args, kwargs = fake_analyzer.run_gitstats_only.call_args
    assert kwargs["work_dir"] == f"/tmp/work/{library.library_ID}"
    assert kwargs["serve_dir"] == f"/tmp/serve/{library.library_ID}"
    assert kwargs["library_id"] == str(library.library_ID)

    library.refresh_from_db()
    assert library.gitstats_status == Library.GITSTATS_SUCCESS
    assert library.gitstats_task_id == "celery-task-1"
    assert library.gitstats_error is None
    assert library.gitstats_started_at is not None
    assert library.gitstats_finished_at is not None
    assert library.gitstats_report_path == f"/gitstats/{library.library_ID}/git_stats/index.html"

    lmv = LibraryMetricValue.objects.get(library=library, metric=metric)
    assert lmv.value == library.gitstats_report_path
    assert lmv.evidence is None


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_existing_report_skips_generation(monkeypatch, library):
    metric = Metric.objects.create(
        metric_name="GitStats Report",
        metric_key="gitstats_report",
        value_type="text",
    )

    fake_analyzer = Mock()

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")
    monkeypatch.setattr(tasks_module.os.path, "exists", lambda path: True)

    result = tasks_module.analyze_repo_gitstats_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result == {"ok": True, "result": {"skipped": True}}
    fake_analyzer.run_gitstats_only.assert_not_called()

    library.refresh_from_db()
    assert library.gitstats_status == Library.GITSTATS_SUCCESS
    assert library.gitstats_report_path == f"/gitstats/{library.library_ID}/git_stats/index.html"

    lmv = LibraryMetricValue.objects.get(library=library, metric=metric)
    assert lmv.value == library.gitstats_report_path
    assert lmv.evidence is None


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_success_without_metric_still_succeeds(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.return_value = {"ok": True}

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")
    monkeypatch.setattr(tasks_module.os.path, "exists", lambda path: False)

    result = tasks_module.analyze_repo_gitstats_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert not LibraryMetricValue.objects.filter(library=library).exists()


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_soft_time_limit_marks_failed_and_raises(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.side_effect = SoftTimeLimitExceeded()

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")
    monkeypatch.setattr(tasks_module.os.path, "exists", lambda path: False)

    with pytest.raises(SoftTimeLimitExceeded):
        tasks_module.analyze_repo_gitstats_task.apply(
            args=[str(library.library_ID), library.url],
            task_id="celery-task-1",
        ).get(propagate=True)

    library.refresh_from_db()
    assert library.gitstats_status == Library.GITSTATS_FAILED
    assert library.gitstats_error == "GitStats timed out. Please try again later."
    assert library.gitstats_finished_at is not None


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_exception_marks_failed_and_raises(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.side_effect = RuntimeError("x")

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")
    monkeypatch.setattr(tasks_module.os.path, "exists", lambda path: False)

    with pytest.raises(RuntimeError):
        tasks_module.analyze_repo_gitstats_task.apply(
            args=[str(library.library_ID), library.url],
            task_id="celery-task-1",
        ).get(propagate=True)

    library.refresh_from_db()
    assert library.gitstats_status == Library.GITSTATS_FAILED
    assert library.gitstats_error == "GitStats failed. Please check server logs."
    assert library.gitstats_finished_at is not None