from ..tasks import analyze_repo_task
from ..database.libraries.models import Library

def enqueue_library_analysis(library: Library):
    library.analysis_status = Library.ANALYSIS_PENDING
    library.analysis_task_id = None
    library.analysis_error = None
    library.analysis_started_at = None
    library.analysis_finished_at = None
    library.save(update_fields=[
        "analysis_status", "analysis_task_id", "analysis_error",
        "analysis_started_at", "analysis_finished_at"
    ])

    if not library.url:
        library.analysis_status = Library.ANALYSIS_FAILED
        library.analysis_error = "Library URL is missing."
        library.save(update_fields=["analysis_status", "analysis_error"])
        return None

    async_result = analyze_repo_task.delay(str(library.library_ID), library.url)
    library.analysis_task_id = async_result.id
    library.save(update_fields=["analysis_task_id"])
    return async_result.id
