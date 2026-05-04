import json
import os

from django.conf import settings
from rest_framework import generics, status
from rest_framework.decorators import permission_classes  # noqa: F401
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Metric, MetricOrder
from .serializers import FlatMetricSerializer, MetricSerializer


def load_auto_metric_definitions():
    path = os.path.join(settings.BASE_DIR, "api", "database", "auto_metrics.json")
    with open(path, "r") as f:
        return json.load(f)


class AutoMetricOptionsView(APIView):
    def get(self, request):
        try:
            data = load_auto_metric_definitions()

            grouped = {}
            for key, item in data.items():
                source = item.get("source_type")
                grouped.setdefault(source, []).append(
                    {
                        "key": key,
                        "label": item.get("label"),
                        "description": item.get("description"),
                        "value_type": item.get("value_type"),
                    }
                )

            return Response(grouped, status=status.HTTP_200_OK)

        except FileNotFoundError:
            return Response(
                {"error": "auto_metrics.json not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except json.JSONDecodeError:
            return Response(
                {"error": "Error decoding auto_metrics.json"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MetricRulesView(APIView):
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, "api", "database", "rules.json")
        try:
            with open(path, "r") as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response(
                {"error": f"rules.json not found at {path}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except json.JSONDecodeError:
            return Response(
                {"error": "Error decoding rules.json"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MetricCategoryView(APIView):
    def get(self, request):
        path = os.path.join(settings.BASE_DIR, "api", "database", "categories.json")
        try:
            with open(path, "r") as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response(
                {"error": f"categories.json not found at {path}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except json.JSONDecodeError:
            return Response(
                {"error": "Error decoding categories.json"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MetricListCreateView(generics.ListCreateAPIView):
    queryset = Metric.objects.all().order_by("metric_name")
    serializer_class = MetricSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # noqa: F811


class MetricRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Metric.objects.all()
    serializer_class = MetricSerializer
    lookup_field = "metric_ID"
    lookup_url_kwarg = "metric_id"
    permission_classes = [IsAuthenticatedOrReadOnly]  # noqa: F811


class MetricUpdateWeightView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]  # noqa: F811

    def patch(self, request, metric_id):
        try:
            metric = Metric.objects.get(metric_ID=metric_id)
        except Metric.DoesNotExist:
            return Response(
                {"error": "Metric not found"}, status=status.HTTP_404_NOT_FOUND
            )

        new_weight = request.data.get("weight")
        if new_weight is None:
            return Response(
                {"error": "Weight field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        metric.weight = new_weight
        metric.save()

        return Response(
            {
                "message": f"Weight updated successfully to {new_weight}",
                "metric_id": str(metric.metric_ID),
                "metric_name": metric.metric_name,
            }
        )


class MetricListFlatView(generics.ListAPIView):
    serializer_class = FlatMetricSerializer
    queryset = Metric.objects.all().order_by("metric_name")


class MetricReorderView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]  # noqa: F811

    def get(self, request):
        """Retrieve the current metric display order"""
        try:
            metric_order = MetricOrder.objects.first()
            if metric_order:
                return Response(
                    {"category_order": metric_order.category_order},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"category_order": {}},
                    status=status.HTTP_200_OK,
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        """Save the metric display order"""
        try:
            category_order = request.data.get("category_order")
            if category_order is None:
                return Response(
                    {"error": "category_order field is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate that all metric IDs exist
            all_metric_ids = set()
            for category_metrics in category_order.values():
                if isinstance(category_metrics, list):
                    all_metric_ids.update(category_metrics)

            # Check if all metric IDs exist
            existing_metrics = set(
                str(m_id)
                for m_id in Metric.objects.filter(
                    metric_ID__in=all_metric_ids
                ).values_list("metric_ID", flat=True)
            )

            invalid_ids = all_metric_ids - existing_metrics
            if invalid_ids:
                return Response(
                    {"error": f"Invalid metric IDs: {list(invalid_ids)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get or create the single MetricOrder instance
            metric_order, _ = MetricOrder.objects.get_or_create(pk=1)
            metric_order.category_order = category_order
            metric_order.save()

            return Response(
                {
                    "message": "Metric display order updated successfully",
                    "category_order": metric_order.category_order,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
