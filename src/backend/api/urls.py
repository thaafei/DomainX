from django.urls import path, include
from .views import status_views
from .views.comparison_views import domain_comparison
from .database.domain.views import create_domain, DomainListCreateView, DomainRetrieveUpdateDestroyView
from .database.library_metric_values.views import AHPCalculations
from .database.domain.views import update_category_weights, get_category_weights
from .views.comparison_views import analyze_library, analyze_domain_libraries
from .views.library_views import (
    list_libraries,
    create_library,
    delete_library,
    update_library_values
)
urlpatterns = [
    path("", include("api.database.urls")),
    path('status/', status_views.status_view, name='api_status'),
    path("comparison/<uuid:domain_id>/", domain_comparison, name="domain_comparison"),
    path("libraries/<uuid:domain_id>/",list_libraries, name="list_libraries"),
    path("libraries/create/", create_library, name="create_library"),
    path("libraries/<uuid:library_id>/delete/", delete_library, name="delete_library"),
    path("libraries/<uuid:library_id>/update-values/", update_library_values, name="update_library_values"),
    path('domain/create/', create_domain, name='create_domain'),
    path('domain/', DomainListCreateView.as_view(), name='domain-list'),
    # path('domain/<uuid:pk>/', DomainDetailView.as_view(), name='domain-detail'),
    path('category_weights/<uuid:domain_id>/', update_category_weights, name='update_category_weights'),
    path('get_category_weights/<uuid:domain_id>/', get_category_weights, name='get_category_weights'),
    path('domain/<uuid:pk>/', DomainRetrieveUpdateDestroyView.as_view(), name='domain-detail'),
    path('category_weights/<uuid:domain_id>/', update_category_weights, name='update_category_weights'),
    path('get_category_weights/<uuid:domain_id>/', get_category_weights, name='get_category_weights'),
    path('aph/<uuid:domain_id>/', AHPCalculations.as_view(), name='aph_category'),
    path("libraries/<uuid:library_id>/analyze/", analyze_library),
    path("domains/<uuid:domain_id>/analyze-all/", analyze_domain_libraries)

]