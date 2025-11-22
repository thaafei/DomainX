from rest_framework import serializers
from django.db import transaction
from ..metrics.models import Metric
from rest_framework.exceptions import ValidationError
from .models import Library
from ..library_metric_values.serializers import LibraryMetricValueSerializer
from ..library_metric_values.models import LibraryMetricValue
from datetime import datetime

from .models import Library
from ..library_metric_values.models import LibraryMetricValue 

from ..services import RepoAnalyzer 

class LibrarySerializer(serializers.ModelSerializer):
    url = serializers.URLField(max_length=500, required=True) 
    
    class Meta:
        model = Library
        fields = ['library_ID', 'library_name', 'url', 'domain', 'created_at']
        read_only_fields = ['library_ID', 'library_name', 'created_at']

    def validate_url(self, value):
        if 'github.com' not in value:
            raise ValidationError("Only GitHub repository URLs are currently supported.")
        return value

    def create(self, validated_data):
        github_url = validated_data.pop('url')
        domain_instance = validated_data.pop('domain')
        
        try:
            analyzer = RepoAnalyzer(github_url=github_url)
            analysis_results = analyzer.run_analysis_and_get_data()
            
        except Exception as e:
            raise ValidationError({'url': f"Analysis failed for URL: {e}"})

        repo_name = analysis_results['repo_name']
        metric_data = analysis_results['metric_data']
        metric_map = analysis_results['metric_map']

        with transaction.atomic():
            
            library = Library.objects.create(
                library_name=repo_name,
                url=github_url,
                domain=domain_instance,
                **validated_data 
            )

            metric_value_objects = []
            now_iso = datetime.now().isoformat()
            
            for metric_name, value in metric_data.items():
                
                metric_id = metric_map.get(metric_name)
                
                if metric_id is not None:
                    metric_value_objects.append(
                        LibraryMetricValue(
                            library=library,
                            metric_id=metric_id,
                            value=value,
                            evidence=f"Auto-calculated via Git/GitHub API on {now_iso}",
                        )
                    )

            if metric_value_objects:
                LibraryMetricValue.objects.bulk_create(metric_value_objects)
                print(f"Successfully created {len(metric_value_objects)} metric values for {repo_name}.")
            else:
                print(f"WARNING: No metric values found to save for {repo_name}.")

            return library
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