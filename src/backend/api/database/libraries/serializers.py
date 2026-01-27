from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from ..library_metric_values.serializers import LibraryMetricValueSerializer
from .models import Library
class LibrarySerializer(serializers.ModelSerializer):
    url = serializers.URLField(max_length=500, required=True) 
    
    class Meta:
        model = Library
        fields = ["library_ID", "library_name", "url", "domain", "programming_language", "created_at",
                  "analysis_status", "analysis_task_id", "analysis_error", "analysis_started_at",
                  "analysis_finished_at"]
        read_only_fields = ["library_ID", "created_at", "analysis_status", "analysis_task_id",
                            "analysis_error", "analysis_started_at", "analysis_finished_at"]


    def validate_url(self, value):
        if 'github.com' not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value


    def create(self, validated_data): #analyzer is added on view for quicker page response
        return Library.objects.create(**validated_data)

class FlatLibrarySerializer(serializers.ModelSerializer):
    """Used for generating the rows (list of libraries) in the pivot table."""
    class Meta:
        model = Library
        fields = ('library_ID', 'library_name')

class LibraryWithMetricsSerializer(serializers.ModelSerializer):
    library_metric_values = LibraryMetricValueSerializer(many=True, read_only=True) 

    class Meta:
        model = Library
        fields = [
            'library_ID', 
            'library_name', 
            'url', 
            'description', 
            'domain_id', 
            'created_at',
            'updated_at',
            'library_metric_values' 
        ]
        read_only_fields = ['library_ID', 'created_at', 'updated_at']