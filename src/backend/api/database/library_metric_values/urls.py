from django.urls import path
from .views import (
    LibraryMetricValueUpdateView,
    MetricValueBulkUpdateView,
    AHPCalculations,
    analyze_library,
    analyze_domain_libraries,
    domain_comparison,
)

urlpatterns = [
    path("comparison/<uuid:domain_id>/", domain_comparison, name="values-comparison"),
    path("libraries/<uuid:library_id>/update-values/", LibraryMetricValueUpdateView.as_view(), name="values-update"),
    path("libraries/<uuid:library_id>/analyze/", analyze_library, name="values-analyze-library"),
    path("<uuid:domain_id>/analyze-all/", analyze_domain_libraries, name="values-analyze-domain"),
    path("bulk-update/", MetricValueBulkUpdateView.as_view(), name="values-bulk-update"),
    path("ahp/<uuid:domain_id>/", AHPCalculations.as_view(), name="values-ahp"),
]
