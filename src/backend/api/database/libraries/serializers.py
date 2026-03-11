from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from ..library_metric_values.serializers import LibraryMetricValueSerializer
from .models import Library


class LibrarySerializer(serializers.ModelSerializer):
    github_url = serializers.URLField(max_length=500, required=True)

    class Meta:
        model = Library
        fields = [
            "library_ID",
            "library_name",
            "github_url",
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
        validators = []

    def validate_github_url(self, value):
        if "github.com" not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value

    def validate(self, attrs):
        library_name = (attrs.get("library_name") or "").strip()
        domain = attrs.get("domain")

        if not library_name:
            raise ValidationError({"library_name": "Library name is required."})

        if domain is None:
            raise ValidationError({"domain": "Domain is required."})

        duplicate_exists = Library.objects.filter(
            domain=domain,
            library_name__iexact=library_name,
        ).exists()

        if duplicate_exists:
            raise ValidationError({
                "library_name": "A library with this name already exists. Please choose a different name."
            })

        attrs["library_name"] = library_name
        return attrs


class LibraryUpdateSerializer(serializers.ModelSerializer):
    github_url = serializers.URLField(
        max_length=500,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Library
        fields = ["library_name", "github_url","url", "programming_language", "domain"]
        validators = []

    def validate_github_url(self, value):
        if value in (None, ""):
            return value
        if "github.com" not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value

    def validate(self, attrs):
        library_name = (attrs.get("library_name") or self.instance.library_name or "").strip()
        domain = attrs.get("domain") or self.instance.domain

        if not library_name:
            raise ValidationError({"library_name": "Library name is required."})

        if domain is None:
            raise ValidationError({"domain": "Domain is required."})

        duplicate_exists = (
            Library.objects.filter(
                domain=domain,
                library_name__iexact=library_name,
            )
            .exclude(pk=self.instance.pk)
            .exists()
        )

        if duplicate_exists:
            raise ValidationError({
                "library_name": "A library with this name already exists. Please choose a different name."
            })

        attrs["library_name"] = library_name
        return attrs


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
            "github_url",
            "url",
            "domain",
            "created_at",
            "library_metric_values",
        ]
        read_only_fields = ["library_ID", "created_at"]