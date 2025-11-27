from django.contrib import admin
from .models import Metric
from ..library_metric_values.models import LibraryMetricValue

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ('metric_name', 'category', 'weight', 'created_at')

# admin.site.register(Metric)
