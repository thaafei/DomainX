from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Metric
from .serializers import MetricSerializer
from rest_framework.generics import ListAPIView
from .serializers import FlatMetricSerializer
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