from celery import shared_task
from django.utils import timezone
from .database.services import RepoAnalyzer
from .database.libraries.models import Library
from .database.metrics.models import Metric
from .database.library_metric_values.models import LibraryMetricValue

@shared_task(bind=True)
def analyze_repo_task(self, library_id: str, repo_url: str):
    lib = Library.objects.get(library_ID=library_id)

    lib.analysis_status = Library.ANALYSIS_RUNNING
    lib.analysis_started_at = timezone.now()
    lib.analysis_task_id = self.request.id
    lib.analysis_error = None
    lib.save(update_fields=["analysis_status", "analysis_started_at", "analysis_task_id", "analysis_error"])

    try:
        analyzer = RepoAnalyzer(github_url=repo_url)
        results = analyzer.run_analysis_and_get_data()
        metrics_data = results.get("metric_data", {})

        metric_names = list(metrics_data.keys())
        metrics = Metric.objects.filter(metric_name__in=metric_names)
        metrics_by_name = {m.metric_name: m for m in metrics}

        rows = []
        for metric_name, value in metrics_data.items():
            metric_obj = metrics_by_name.get(metric_name)
            if not metric_obj:
                continue
            rows.append(
                LibraryMetricValue(
                    library=lib,
                    metric=metric_obj,
                    value=value,
                    evidence=f"Auto-calculated via GitHub API on {timezone.now().isoformat()}",
                )
            )

        if rows:
            LibraryMetricValue.objects.filter(library=lib).delete()
            LibraryMetricValue.objects.bulk_create(rows)

        lib.analysis_status = Library.ANALYSIS_SUCCESS
        lib.analysis_finished_at = timezone.now()
        lib.save(update_fields=["analysis_status", "analysis_finished_at"])

        return {"ok": True, "metrics": len(rows)}

    except Exception as e:
        lib.analysis_status = Library.ANALYSIS_FAILED
        lib.analysis_error = str(e)
        lib.analysis_finished_at = timezone.now()
        lib.save(update_fields=["analysis_status", "analysis_error", "analysis_finished_at"])
        raise
