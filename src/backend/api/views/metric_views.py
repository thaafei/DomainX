from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..models import Metric
from ..serializers import MetricSerializer


@api_view(["GET"])
def list_metrics(request):
    metrics = Metric.objects.all().order_by("Metric_Name")
    serializer = MetricSerializer(metrics, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def create_metric(request):
    serializer = MetricSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
def update_metric(request, metric_id):
    try:
        metric = Metric.objects.get(pk=metric_id)
    except Metric.DoesNotExist:
        return Response({"error": "Metric not found"}, status=404)

    serializer = MetricSerializer(metric, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
def delete_metric(request, metric_id):
    try:
        metric = Metric.objects.get(pk=metric_id)
    except Metric.DoesNotExist:
        return Response({"error": "Metric not found"}, status=404)

    metric.delete()
    return Response(status=204)
