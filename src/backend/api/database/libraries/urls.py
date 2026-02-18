from django.urls import path
from .views import LibraryListCreateView, LibraryByDomainListView, LibraryUpdateView

urlpatterns = [
    path("", LibraryListCreateView.as_view(), name="library-list-create"),
    path("by_domain/<uuid:domain_id>/", LibraryByDomainListView.as_view(), name="libraries-by-domain"),
    path("<uuid:library_id>/", LibraryUpdateView.as_view(), name="library-detail"),
]
