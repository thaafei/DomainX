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
