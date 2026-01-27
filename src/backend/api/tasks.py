from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone

from .database.services import RepoAnalyzer
from .database.libraries.models import Library
from .database.metrics.models import Metric
from .database.library_metric_values.models import LibraryMetricValue

logger = get_task_logger("api.tasks.analyze_repo")


@shared_task(bind=True)
def analyze_repo_task(self, library_id: str, repo_url: str):
    task_id = getattr(self.request, "id", None)

    logger.info(
        "Starting repo analysis",
        extra={"library_id": library_id, "repo_url": repo_url, "task_id": task_id},
    )

    lib = Library.objects.get(library_ID=library_id)
    lib.analysis_status = Library.ANALYSIS_RUNNING
    lib.analysis_started_at = timezone.now()
    lib.analysis_task_id = task_id
    lib.analysis_error = None
    lib.save(update_fields=["analysis_status", "analysis_started_at", "analysis_task_id", "analysis_error"])

    start = timezone.now()

    try:
        analyzer = RepoAnalyzer(github_url=repo_url)
        results = analyzer.run_analysis_and_get_data()
        metrics_data = results.get("metric_data", {})

        logger.debug(
            "Analyzer returned metrics",
            extra={"library_id": library_id, "task_id": task_id, "metric_keys": list(metrics_data.keys())},
        )

        metric_names = list(metrics_data.keys())
        metrics = Metric.objects.filter(metric_name__in=metric_names)
        metrics_by_name = {m.metric_name: m for m in metrics}

        rows = []
        for metric_name, value in metrics_data.items():
            metric_obj = metrics_by_name.get(metric_name)
            if not metric_obj:
                logger.debug(
                    "Metric not found in DB; skipping",
                    extra={"library_id": library_id, "task_id": task_id, "metric_name": metric_name},
                )
                continue

            rows.append(
                LibraryMetricValue(
                    library=lib,
                    metric=metric_obj,
                    value=int(value),
                    evidence=f"Auto-calculated via GitHub API on {timezone.now().isoformat()}",
                )
            )

        # clear + write (avoids stale values)
        LibraryMetricValue.objects.filter(library=lib).delete()
        if rows:
            LibraryMetricValue.objects.bulk_create(rows)

        lib.analysis_status = Library.ANALYSIS_SUCCESS
        lib.analysis_finished_at = timezone.now()
        lib.save(update_fields=["analysis_status", "analysis_finished_at"])

        duration_ms = int((timezone.now() - start).total_seconds() * 1000)

        logger.info(
            "Repo analysis finished",
            extra={
                "library_id": library_id,
                "repo_url": repo_url,
                "task_id": task_id,
                "metrics_count": len(rows),
                "duration_ms": duration_ms,
                "status": "success",
            },
        )

        return {"ok": True, "metrics": len(rows)}

    except Exception as e:
        lib.analysis_status = Library.ANALYSIS_FAILED
        lib.analysis_error = str(e)
        lib.analysis_finished_at = timezone.now()
        lib.save(update_fields=["analysis_status", "analysis_error", "analysis_finished_at"])

        logger.error(
            "Repo analysis failed",
            exc_info=True,
            extra={"library_id": library_id, "repo_url": repo_url, "task_id": task_id},
        )
        raise
