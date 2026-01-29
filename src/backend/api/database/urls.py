from django.urls import path, include

urlpatterns = [
    path('libraries/', include('api.database.libraries.urls')),
    path('metrics/', include('api.database.metrics.urls')),
    path('library_metric_values/', include('api.database.library_metric_values.urls')),
    path('domain/', include('api.database.domain.urls')),


]
