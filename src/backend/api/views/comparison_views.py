from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import Domain, Library, Metric, LibraryMetricValue


@api_view(["GET"])
def domain_comparison(request, domain_id):
    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Domain not found"}, status=404)

    libraries = Library.objects.filter(Domain=domain)
    metrics = Metric.objects.all()

    table = []
    for lib in libraries:
        table.append({
            "Library_ID": str(lib.Library_ID),
            "Library_Name": lib.Library_Name,
            "metrics": {m.Metric_Name: None for m in metrics}
        })

    values = LibraryMetricValue.objects.filter(Library__in=libraries)

    for val in values:
        metric_name = val.Metric.Metric_Name

        for row in table:
            if row["Library_ID"] == str(val.Library.Library_ID):
                row["metrics"][metric_name] = val.Value
                break

    return Response({
        "metrics": [{"Metric_ID": str(m.Metric_ID), "Metric_Name": m.Metric_Name} for m in metrics],
        "libraries": table
    })
