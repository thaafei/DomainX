from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Metric
from .serializers import MetricSerializer
from rest_framework.generics import ListAPIView
from .serializers import FlatMetricSerializer
import json
import os
from django.conf import settings

# Create or list all metrics
class MetricListCreateView(generics.ListCreateAPIView):
    queryset = Metric.objects.all()
    serializer_class = MetricSerializer


# Update the weight of a specific metric
class MetricUpdateWeightView(APIView):
    def patch(self, request, pk):
        try:
            metric = Metric.objects.get(pk=pk)
        except Metric.DoesNotExist:
            return Response({'error': 'Metric not found'}, status=status.HTTP_404_NOT_FOUND)

        new_weight = request.data.get('weight')
        if new_weight is None:
            return Response({'error': 'Weight field is required'}, status=status.HTTP_400_BAD_REQUEST)

        metric.weight = new_weight
        metric.save()

        return Response({
            'message': f'Weight updated successfully to {new_weight}',
            'metric_id': str(metric.metric_ID),
            'metric_name': metric.metric_name,
        })
class MetricListView(ListAPIView):
    """
    2. Returns a list of all Metrics, independent of any Domain or Library.
    This replaces the old combined data fetch for the table columns.
    """
    # Using the FlatMetricSerializer as it contains the necessary metric_ID and metric_name
    serializer_class = FlatMetricSerializer 
    
    # Get all metrics in alphabetical order
    queryset = Metric.objects.all().order_by('metric_name')

class MetricRulesView(APIView):
    def get(self, request):
        # Construct the path to your rules.json
        path = os.path.join(settings.BASE_DIR, 'api', 'database', 'rules.json')
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response(
                {'error': 'rules.json not found at ' + path}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except json.JSONDecodeError:
            return Response(
                {'error': 'Error decoding rules.json'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MetricCategoryView(APIView):
    def get(self, request):
        # Construct the path to your rules.json
        path = os.path.join(settings.BASE_DIR, 'api', 'database', 'categories.json')
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response(
                {'error': 'rules.json not found at ' + path}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except json.JSONDecodeError:
            return Response(
                {'error': 'Error decoding rules.json'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )