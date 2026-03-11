from rest_framework import serializers
from django.conf import settings
import json
import os

from .models import Metric


def load_auto_metric_definitions():
    path = os.path.join(settings.BASE_DIR, "api", "database", "auto_metrics.json")
    with open(path, "r") as f:
        return json.load(f)


class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = (
            "metric_ID",
            "metric_name",
            "value_type",
            "source_type",
            "metric_key",
            "category",
            "option_category",
            "rule",
            "description",
            "weight",
            "created_at",
            "scoring_dict",
        )

    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", "manual"))
        metric_key = attrs.get("metric_key", getattr(self.instance, "metric_key", None))

        if source_type == "manual":
            attrs["metric_key"] = None
            return attrs

        try:
            definitions = load_auto_metric_definitions()
        except FileNotFoundError:
            raise serializers.ValidationError({
                "metric_key": "auto_metrics.json not found."
            })
        except json.JSONDecodeError:
            raise serializers.ValidationError({
                "metric_key": "auto_metrics.json is invalid."
            })

        if not metric_key:
            raise serializers.ValidationError({
                "metric_key": "This field is required for automatic metrics."
            })

        definition = definitions.get(metric_key)
        if not definition:
            raise serializers.ValidationError({
                "metric_key": "Invalid automatic metric key."
            })

        if definition.get("source_type") != source_type:
            raise serializers.ValidationError({
                "metric_key": "Selected metric key does not belong to the selected source type."
            })

        attrs["value_type"] = definition.get("value_type")
        return attrs


class FlatMetricSerializer(serializers.ModelSerializer):
    """Used for generating the columns (list of metrics) in the pivot table."""
    class Meta:
        model = Metric
        fields = ("metric_ID", "metric_name")