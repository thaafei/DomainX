import pytest
from unittest.mock import Mock

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
    m_stars = Metric.objects.create(metric_name="Stars Count")
    m_forks = Metric.objects.create(metric_name="Forks Count")

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {
        "metric_data": {
            "Stars Count": "10",
            "Forks Count": 2,
            "Unknown Metric": 99,
            "Bad Int": "abc",
        }
    }

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)

    result = tasks_module.analyze_repo_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert result["metrics_updated"] == 2
    assert result["metrics_skipped"] == 2

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

    assert not LibraryMetricValue.objects.filter(library=library, metric__metric_name="Unknown Metric").exists()
    assert not LibraryMetricValue.objects.filter(library=library, metric__metric_name="Bad Int").exists()


@pytest.mark.django_db
def test_analyze_repo_task_sets_running_status_early(monkeypatch, library):
    Metric.objects.create(metric_name="Stars Count")

    state = {"seen_running": False}

    class Ctx:
        def __enter__(self):
            lib = Library.objects.get(library_ID=library.library_ID)
            state["seen_running"] = (lib.analysis_status == Library.ANALYSIS_RUNNING)
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    fake_analyzer = Mock()
    fake_analyzer.run_analysis_and_get_data.return_value = {"metric_data": {"Stars Count": "1"}}

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
    metric = Metric.objects.create(metric_name="GitStats Report")

    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.return_value = {"ok": True}

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")

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
def test_analyze_repo_gitstats_task_success_without_metric_still_succeeds(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.return_value = {"ok": True}

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")

    result = tasks_module.analyze_repo_gitstats_task.apply(
        args=[str(library.library_ID), library.url],
        task_id="celery-task-1",
    ).get(propagate=True)

    assert result["ok"] is True
    assert not LibraryMetricValue.objects.filter(library=library).exists()


@pytest.mark.django_db
def test_analyze_repo_gitstats_task_exception_marks_failed_and_raises(monkeypatch, library):
    fake_analyzer = Mock()
    fake_analyzer.run_gitstats_only.side_effect = RuntimeError("x")

    monkeypatch.setattr(tasks_module, "RepoAnalyzer", lambda github_url: fake_analyzer)
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_WORK_DIR", "/tmp/work")
    monkeypatch.setattr(tasks_module.settings, "GITSTATS_SERVE_DIR", "/tmp/serve")

    with pytest.raises(RuntimeError):
        tasks_module.analyze_repo_gitstats_task.apply(
            args=[str(library.library_ID), library.url],
            task_id="celery-task-1",
        ).get(propagate=True)

    library.refresh_from_db()
    assert library.gitstats_status == Library.GITSTATS_FAILED
    assert library.gitstats_error == "GitStats failed. Please check server logs."
    assert library.gitstats_finished_at is not None
