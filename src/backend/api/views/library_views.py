import threading
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..database.services import RepoAnalyzer
from ..database.libraries.models import Domain
from ..database.libraries.models import Library
from ..database.metrics.models import Metric
from ..database.library_metric_values.models import LibraryMetricValue

from ..database.libraries.serializers import LibrarySerializer

def run_repo_analysis_in_background(library_id, repo_url):
    try:
        library = Library.objects.get(pk=library_id)

        analyzer = RepoAnalyzer(github_url=repo_url)
        analysis_results = analyzer.run_analysis_and_get_data()
        metrics_data = analysis_results.get("metric_data", {})

        if metrics_data:
            update_library_metrics(library, metrics_data)

        print("Background GitHub analysis finished.")
    except Exception as e:
        print(f"Error during repository analysis: {e}")

@api_view(["GET"])
def list_libraries(request, domain_id):
    libraries = Library.objects.filter(domain__pk=domain_id)
    serializer = LibrarySerializer(libraries, many=True)
    print(serializer.data)
    return Response({"libraries": serializer.data})

def update_library_metrics(library, metrics_data):
    if not isinstance(metrics_data, dict):
        return
    for metric_name, value in metrics_data.items():
        try:
            metric = Metric.objects.get(metric_name=metric_name)
        except Metric.DoesNotExist:
            continue
        LibraryMetricValue.objects.update_or_create(
            library=library,
            metric=metric,
            defaults={"value": value}
        )    

@api_view(["POST"])
def create_library(request):
    print(request.data)
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

    repo_url = serializer.validated_data.get("url")
    threading.Thread(
        target=run_repo_analysis_in_background,
        args=(new_library.pk, repo_url),
        daemon=True,
    ).start()

    return Response(
        {"library": LibrarySerializer(new_library).data, "message": "Library created. Analysis running in background."},
        status=status.HTTP_201_CREATED
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

    for metric_name, value in metrics_data.items():
        try:
            metric = Metric.objects.get(metric_name=metric_name)
        except Metric.DoesNotExist:
            continue  #ignore unrecognized metric names

        LibraryMetricValue.objects.update_or_create(
            library=library,
            metric=metric,
            defaults={"value": value}
        )

    return Response({"success": True})
