from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..database.libraries.models import Domain
from ..database.libraries.models import Library
from ..database.metrics.models import Metric
from ..database.library_metric_values.models import LibraryMetricValue


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
            "metrics": {m.metric_name: None for m in metrics},
        })

    values = LibraryMetricValue.objects.filter(library__in=libraries).select_related('library', 'metric')

    for val in values:
        metric_name = val.metric.metric_name

        for row in table:
            if row["library_ID"] == str(val.library.library_ID):
                row["metrics"][metric_name] = [val.value]
                row["metrics"][f'{metric_name}_evidence'] = [val.evidence]
                break

    return Response({
        "metrics": [
            {"metric_ID": str(m.metric_ID), "metric_name": m.metric_name}
            for m in metrics
        ],
        "libraries": table
    })