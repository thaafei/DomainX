from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from ..library_metric_values.serializers import LibraryMetricValueSerializer
from .models import Library


class LibrarySerializer(serializers.ModelSerializer):
    url = serializers.URLField(max_length=500, required=True)

    class Meta:
        model = Library
        fields = [
            "library_ID",
            "library_name",
            "url",
            "domain",
            "programming_language",
            "created_at",
            "analysis_status",
            "analysis_task_id",
            "analysis_error",
            "analysis_started_at",
            "analysis_finished_at",
        ]
        read_only_fields = [
            "library_ID",
            "created_at",
            "analysis_status",
            "analysis_task_id",
            "analysis_error",
            "analysis_started_at",
            "analysis_finished_at",
        ]

    def validate_url(self, value):
        if "github.com" not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value


class LibraryUpdateSerializer(serializers.ModelSerializer):
    url = serializers.URLField(max_length=500, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Library
        fields = ["library_name", "url", "programming_language", "domain"]

    def validate_url(self, value):
        if value in (None, ""):
            return value
        if "github.com" not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value


class FlatLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Library
        fields = ("library_ID", "library_name")


class LibraryWithMetricsSerializer(serializers.ModelSerializer):
    library_metric_values = LibraryMetricValueSerializer(many=True, read_only=True)

    class Meta:
        model = Library
        fields = [
            "library_ID",
            "library_name",
            "url",
            "description",
            "domain_id",
            "created_at",
            "updated_at",
            "library_metric_values",
        ]
        read_only_fields = ["library_ID", "created_at", "updated_at"]
