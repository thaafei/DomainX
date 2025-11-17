from django.urls import path, include
from .views import status_views

urlpatterns = [
    path('status/', status_views.status_view, name='api_status'),
    path('github/', include('api.github_urls', namespace='github')),
]