from rest_framework import serializers
from .models import Metric

class MetricSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.category_name", read_only=True, allow_null=True)

    class Meta:
        model = Metric
        fields = (
            "metric_ID",
            "metric_name",
            "value_type",
            "category",
            "category_name",
            "description",
            "weight",
            "created_at",
        )

class FlatMetricSerializer(serializers.ModelSerializer):
    """Used for generating the columns (list of metrics) in the pivot table."""
    category_name = serializers.CharField(source="category.category_name", read_only=True, allow_null=True)
    class Meta:
        model = Metric
        fields = ('metric_ID', 'metric_name', 'category_name')
