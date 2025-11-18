from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..models import (
    Domain,
    Library,
    Metric,
    LibraryMetricValue
)

from ..serializers import LibrarySerializer


@api_view(["GET"])
def list_libraries(request, domain_id):
    libraries = Library.objects.filter(Domain__pk=domain_id)
    serializer = LibrarySerializer(libraries, many=True)
    return Response({"libraries": serializer.data})


@api_view(["POST"])
def create_library(request):
    domain_id = request.data.get("Domain")
    if not domain_id:
        return Response({"error": "Domain ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Invalid Domain ID"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = LibrarySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(Domain=domain)
        return Response({"library": serializer.data}, status=status.HTTP_201_CREATED)

    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


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
    library.Library_Name = data.get("Library_Name", library.Library_Name)
    library.Repository_URL = data.get("Repository_URL", library.Repository_URL)
    library.Programming_Language = data.get("Programming_Language", library.Programming_Language)
    library.save()
    metrics_data = data.get("metrics", {})

    for metric_name, value in metrics_data.items():
        try:
            metric = Metric.objects.get(Metric_Name=metric_name)
        except Metric.DoesNotExist:
            continue  #ignore unrecognized metric names

        LibraryMetricValue.objects.update_or_create(
            Library=library,
            Metric=metric,
            defaults={"Value": value}
        )

    return Response({"success": True})
