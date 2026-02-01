from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
import json, os

from .models import Metric
from .serializers import MetricSerializer, FlatMetricSerializer

class MetricRulesView(APIView):
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, "api", "database", "rules.json")
        try:
            with open(path, "r") as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response({"error": f"rules.json not found at {path}"}, status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError:
            return Response({"error": "Error decoding rules.json"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MetricCategoryView(APIView):
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, "api", "database", "categories.json")
        try:
            with open(path, "r") as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response({"error": f"categories.json not found at {path}"}, status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError:
            return Response({"error": "Error decoding categories.json"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MetricListCreateView(generics.ListCreateAPIView):
    queryset = Metric.objects.all().order_by("metric_name")
    serializer_class = MetricSerializer


class MetricRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Metric.objects.all()
    serializer_class = MetricSerializer
    lookup_field = "metric_ID"
    lookup_url_kwarg = "metric_id"


class MetricUpdateWeightView(APIView):
    def patch(self, request, metric_id):
        try:
            metric = Metric.objects.get(metric_ID=metric_id)
        except Metric.DoesNotExist:
            return Response({"error": "Metric not found"}, status=status.HTTP_404_NOT_FOUND)

        new_weight = request.data.get("weight")
        if new_weight is None:
            return Response({"error": "Weight field is required"}, status=status.HTTP_400_BAD_REQUEST)

        metric.weight = new_weight
        metric.save()

        return Response({
            "message": f"Weight updated successfully to {new_weight}",
            "metric_id": str(metric.metric_ID),
            "metric_name": metric.metric_name,
        })

class MetricListFlatView(generics.ListAPIView):
    serializer_class = FlatMetricSerializer
    queryset = Metric.objects.all().order_by("metric_name")
