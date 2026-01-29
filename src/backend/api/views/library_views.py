from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..tasks import analyze_repo_task
from ..database.domain.models import Domain
from ..database.libraries.models import Library
from ..database.metrics.models import Metric
from ..database.library_metric_values.models import LibraryMetricValue
from ..database.libraries.serializers import LibrarySerializer
from ..utils.analysis import enqueue_library_analysis
@api_view(["GET"])
def list_libraries(request, domain_id):
    libraries = Library.objects.filter(domain__pk=domain_id)
    serializer = LibrarySerializer(libraries, many=True)
    print(serializer.data)
    return Response({"libraries": serializer.data})

@api_view(["POST"])
def create_library(request):
    domain_id = request.data.get("domain")
    if not domain_id:
        return Response({"error": "Domain ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Invalid Domain ID"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = LibrarySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    new_library = serializer.save(domain=domain)

    # mark pending
    new_library.analysis_status = Library.ANALYSIS_PENDING
    new_library.analysis_task_id = None
    new_library.analysis_error = None
    new_library.analysis_started_at = None
    new_library.analysis_finished_at = None
    new_library.save(update_fields=[
        "analysis_status", "analysis_task_id", "analysis_error",
        "analysis_started_at", "analysis_finished_at"
    ])

    # enqueue analysis


    try:
        task_id = enqueue_library_analysis(new_library)
    except Exception as e:
        new_library.analysis_status = Library.ANALYSIS_FAILED
        new_library.analysis_error = str(e)
        new_library.save(update_fields=["analysis_status", "analysis_error"])
        task_id = None

    return Response(
        {
            "library": LibrarySerializer(new_library).data,
            "message": "Library created. Analysis queued (or failed).",
            "task_id": task_id,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
def delete_library(request, library_id):
    try:
        library = Library.objects.get(pk=library_id)
    except Library.DoesNotExist:
        return Response({"error": "Library not found"}, status=status.HTTP_404_NOT_FOUND)

    library.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def update_library_values(request, library_id):
    try:
        library = Library.objects.get(pk=library_id)
    except Library.DoesNotExist:
        return Response({"error": "Library not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    library.library_name = data.get("library_name", library.library_name)
    library.url = data.get("url", library.url)
    library.programming_language = data.get("programming_language", library.programming_language)
    library.save()
    metrics_data = data.get("metrics", {})

    for key, value in metrics_data.items():
        if key.endswith("_evidence"):
            base_metric_name = key.replace("_evidence", "")
            field_to_update = "evidence"
        else:
            base_metric_name = key
            field_to_update = "value"
        try:
            metric = Metric.objects.get(metric_name=base_metric_name)
        except Metric.DoesNotExist:
            continue

        LibraryMetricValue.objects.update_or_create(
            library=library,
            metric=metric,
            defaults={field_to_update: value}
        )

    return Response({"success": True})
