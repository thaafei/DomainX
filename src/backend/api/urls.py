from django.urls import path, include
from .views import status_views
from .views.metric_views import (
    list_metrics,
    create_metric,
    update_metric,
    delete_metric
)

urlpatterns = [
    path('status/', status_views.status_view, name='api_status'),
    path('github/', include('api.github_urls', namespace='github')),
    path('metrics/', list_metrics, name='metrics_list'),
    path('metrics/create/', create_metric, name='metrics_create'),
    path('metrics/<uuid:metric_id>/update/', update_metric, name='metrics_update'),
    path('metrics/<uuid:metric_id>/delete/', delete_metric, name='metrics_delete'),
]