from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import os
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
        metrics_data = results.get("metric_data", {}) or {}

        metric_names = list(metrics_data.keys())
        metrics = Metric.objects.filter(metric_name__in=metric_names)
        metrics_by_name = {m.metric_name: m for m in metrics}

        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for metric_name, value in metrics_data.items():
                metric_obj = metrics_by_name.get(metric_name)
                if not metric_obj:
                    skipped_count += 1
                    logger.debug(
                        "Metric not found in DB; skipping",
                        extra={"library_id": library_id, "task_id": task_id, "metric_name": metric_name},
                    )
                    continue

                try:
                    int_value = int(value)
                except (TypeError, ValueError):
                    skipped_count += 1
                    logger.debug(
                        "Metric value not an int; skipping",
                        extra={"library_id": library_id, "task_id": task_id, "metric_name": metric_name, "value": value},
                    )
                    continue

                LibraryMetricValue.objects.update_or_create(
                    library=lib,
                    metric=metric_obj,
                    defaults={
                        "value": int_value,
                        "evidence": f"Auto-calculated via GitHub API/SCC on {timezone.now().isoformat()}",
                    },
                )
                updated_count += 1

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
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "duration_ms": duration_ms,
                "status": "success",
            },
        )

        return {"ok": True, "metrics_updated": updated_count, "metrics_skipped": skipped_count}

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

@shared_task(bind=True, queue="gitstats")
def analyze_repo_gitstats_task(self, library_id: str, repo_url: str):
    task_id = getattr(self.request, "id", None)

    lib = Library.objects.get(library_ID=library_id)
    lib.gitstats_status = Library.GITSTATS_RUNNING
    lib.gitstats_started_at = timezone.now()
    lib.gitstats_task_id = task_id
    lib.gitstats_error = None
    lib.save(update_fields=["gitstats_status", "gitstats_started_at", "gitstats_task_id", "gitstats_error"])

    try:
        work_dir = os.path.join(settings.GITSTATS_WORK_DIR, library_id)
        serve_dir = os.path.join(settings.GITSTATS_SERVE_DIR, library_id)

        analyzer = RepoAnalyzer(github_url=repo_url)

        results = analyzer.run_gitstats_only(
            work_dir=work_dir,
            serve_dir=serve_dir,
        )

        lib.gitstats_report_path = f"/gitstats/{library_id}/git_stats/index.html"
        lib.gitstats_status = Library.GITSTATS_SUCCESS
        lib.gitstats_finished_at = timezone.now()
        lib.save(update_fields=["gitstats_status", "gitstats_finished_at", "gitstats_report_path"])

        return {"ok": True, "result": results}

    except Exception as e:
        lib.gitstats_status = Library.GITSTATS_FAILED
        lib.gitstats_error = str(e)
        lib.gitstats_finished_at = timezone.now()
        lib.save(update_fields=["gitstats_status", "gitstats_error", "gitstats_finished_at"])
        raise

