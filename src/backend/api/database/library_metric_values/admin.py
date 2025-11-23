from django.contrib import admin
from .models import LibraryMetricValue

@admin.register(LibraryMetricValue)
class LibraryMetricValueAdmin(admin.ModelAdmin):
    list_display = ('library', 'metric', 'value', 'collected_by', 'last_modified')
    list_filter = ('library', 'metric')
    search_fields = ('library__Library_Name', 'metric__metric_name', 'collected_by')
    ordering = ('library', 'metric')
