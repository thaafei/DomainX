from django.urls import path, include
from .views import status_views

urlpatterns = [
    path('status/', status_views.status_view, name='api_status'),
    path('github/', include('api.github_urls', namespace='github')),
    path('database/', include('api.database.urls')),
    # path('database/libraries/', include('api.database.libraries.urls')),
    # path('database/metrics/', include('api.database.metrics.urls')),
    # path('database/library-metrics/', include('api.database.library_metric_values.urls')),
    # path('database/domain/', include('api.database.domain.urls')),
]