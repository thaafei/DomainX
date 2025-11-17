from django.urls import path
from .views import github_views

app_name = 'github'

urlpatterns = [
    path('stars/', github_views.get_repo_stars, name='get_repo_stars'),
]