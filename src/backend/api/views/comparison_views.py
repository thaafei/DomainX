from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..database.domain.models import Domain
from ..database.libraries.models import Library
from ..database.metrics.models import Metric
from ..database.library_metric_values.models import LibraryMetricValue
from ..utils.analysis import enqueue_library_analysis


@api_view(["POST"])
def analyze_library(request, library_id):
    try:
        lib = Library.objects.get(pk=library_id)
    except Library.DoesNotExist:
        return Response({"error": "Library not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        task_id = enqueue_library_analysis(lib)
        if task_id is None:
            return Response({"error": lib.analysis_error}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": "Analysis queued.", "library_id": str(lib.library_ID), "task_id": task_id},
            status=status.HTTP_202_ACCEPTED
        )
    except Exception as e:
        lib.analysis_status = Library.ANALYSIS_FAILED
        lib.analysis_error = str(e)
        lib.save(update_fields=["analysis_status", "analysis_error"])
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def analyze_domain_libraries(request, domain_id):
    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Domain not found"}, status=status.HTTP_404_NOT_FOUND)

    libs = Library.objects.filter(domain=domain)

    queued = []
    failed = []

    for lib in libs:
        try:
            task_id = enqueue_library_analysis(lib)
            if task_id:
                queued.append({"library_id": str(lib.library_ID), "task_id": task_id})
            else:
                failed.append({"library_id": str(lib.library_ID), "error": lib.analysis_error})
        except Exception as e:
            lib.analysis_status = Library.ANALYSIS_FAILED
            lib.analysis_error = str(e)
            lib.save(update_fields=["analysis_status", "analysis_error"])
            failed.append({"library_id": str(lib.library_ID), "error": str(e)})

    return Response(
        {
            "message": "Analysis queued for domain libraries.",
            "queued": queued,
            "failed": failed,
            "total": libs.count(),
        },
        status=status.HTTP_202_ACCEPTED
    )

@api_view(["GET"])
def domain_comparison(request, domain_id):
    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Domain not found"}, status=status.HTTP_404_NOT_FOUND)

    libraries = Library.objects.filter(domain=domain)
    metrics = Metric.objects.all()

    table = []
    for lib in libraries:
        table.append({
            "library_ID": str(lib.library_ID),
            "library_name": lib.library_name,
            "url": lib.url,
            "programming_language": lib.programming_language,
            "analysis_status": lib.analysis_status,
            "analysis_task_id": lib.analysis_task_id,
            "analysis_error": lib.analysis_error,
            "analysis_finished_at": lib.analysis_finished_at,
            "metrics": {m.metric_name: None for m in metrics},
        })

    values = LibraryMetricValue.objects.filter(library__in=libraries).select_related("library", "metric")
    by_lib = {row["library_ID"]: row for row in table}
    for val in values:
        lib_id = str(val.library.library_ID)
        metric_name = val.metric.metric_name

        if lib_id in by_lib:
            by_lib[lib_id]["metrics"][metric_name] = val.value
            by_lib[lib_id]["metrics"][f'{metric_name}_evidence'] = val.evidence

    return Response({
        "metrics": [{"metric_ID": str(m.metric_ID), "metric_name": m.metric_name} for m in metrics],
        "libraries": table
    })