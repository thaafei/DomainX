from rest_framework import serializers
from .models import Metric

class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = ('metric_name', 'description', 'category', 'weight')

class FlatMetricSerializer(serializers.ModelSerializer):
    """Used for generating the columns (list of metrics) in the pivot table."""
    class Meta:
        model = Metric
        fields = ('metric_ID', 'metric_name')
