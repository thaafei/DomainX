from ..tasks import analyze_repo_task, analyze_repo_gitstats_task
from ..database.libraries.models import Library
def enqueue_library_analysis(library: Library):
    library.analysis_status = Library.ANALYSIS_PENDING
    library.analysis_task_id = None
    library.analysis_error = None
    library.analysis_started_at = None
    library.analysis_finished_at = None

    library.gitstats_status = Library.GITSTATS_PENDING
    library.gitstats_task_id = None
    library.gitstats_error = None
    library.gitstats_started_at = None
    library.gitstats_finished_at = None
    library.gitstats_report_path = None

    library.save()

    if not library.url:
        library.analysis_status = Library.ANALYSIS_FAILED
        library.analysis_error = "Library URL is missing."
        library.save(update_fields=["analysis_status", "analysis_error"])
        return None

    a = analyze_repo_task.delay(str(library.library_ID), library.url)
    g = analyze_repo_gitstats_task.apply_async(
        args=[str(library.library_ID), library.url],
        queue="gitstats",
    )

    library.analysis_task_id = a.id
    library.gitstats_task_id = g.id
    library.save(update_fields=["analysis_task_id", "gitstats_task_id"])

    return {"analysis_task_id": a.id, "gitstats_task_id": g.id}
