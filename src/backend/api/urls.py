from django.urls import path, include
from .views import status_views
from .views.comparison_views import domain_comparison
from .database.domain.views import create_domain, DomainListCreateView, DomainDetailView, DomainRetrieveUpdateDestroyView
from .database.metrics.views import MetricRulesView
from .database.metrics.views import MetricCategoryView
from .database.library_metric_values.views import AHPCalculations
from .views.comparison_views import analyze_library, analyze_domain_libraries
from .views.metric_views import (
    list_metrics,
    create_metric,
    update_metric,
    delete_metric
)
from .views.library_views import (
    list_libraries,
    create_library,
    delete_library,
    update_library_values
)
urlpatterns = [
    path('status/', status_views.status_view, name='api_status'),
    path("comparison/<uuid:domain_id>/", domain_comparison, name="domain_comparison"),
    path('metrics/', list_metrics, name='metrics_list'),
    path('metrics/create/', create_metric, name='metrics_create'),
    path('metrics/<uuid:metric_id>/update/', update_metric, name='metrics_update'),
    path('metrics/<uuid:metric_id>/delete/', delete_metric, name='metrics_delete'),
    path("libraries/<uuid:domain_id>/",list_libraries, name="list_libraries"),
    path("libraries/create/", create_library, name="create_library"),
    path("libraries/<uuid:library_id>/delete/", delete_library, name="delete_library"),
    path("libraries/<uuid:library_id>/update-values/", update_library_values, name="update_library_values"),
    path('database/', include('api.database.urls')),
    path('domain/create/', create_domain, name='create_domain'),
    path('domain/', DomainListCreateView.as_view(), name='domain-list'),
    path('domain/<uuid:pk>/', DomainRetrieveUpdateDestroyView.as_view(), name='domain-detail'),
    path('metric-rules/', MetricRulesView.as_view(), name='metric-rules'),
    path('metric-categories/', MetricCategoryView.as_view(), name='metric-categories'),
    path('aph/<uuid:domain_id>/', AHPCalculations.as_view(), name='aph_category')
    path("libraries/<uuid:library_id>/analyze/", analyze_library),
    path("domains/<uuid:domain_id>/analyze-all/", analyze_domain_libraries)

]