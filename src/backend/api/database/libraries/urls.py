from django.urls import path
from .views import LibraryListCreateView
from .views import LibraryByDomainListView#, LibraryAnalysisView, LibrariesByDomainView
urlpatterns = [
    path('', LibraryListCreateView.as_view(), name='library-list'),
    path('by_domain/<uuid:domain_id>/', LibraryByDomainListView.as_view(), name='libraries-by-domain'),
    # path('analyze/', LibraryAnalysisView.as_view(), name='library-analyze'), 
    # path('by_domain/<uuid:domain_id>/', LibrariesByDomainView.as_view(), name='libraries-by-domain'),
]
