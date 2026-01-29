from django.urls import path, include

from .database.domain.views import create_domain, DomainListCreateView, DomainRetrieveUpdateDestroyView

from .database.domain.views import update_category_weights, get_category_weights

urlpatterns = [
    path("", include("api.database.urls")),
    path('domain/create/', create_domain, name='create_domain'),
    path('domain/', DomainListCreateView.as_view(), name='domain-list'),
    path('category_weights/<uuid:domain_id>/', update_category_weights, name='update_category_weights'),
    path('get_category_weights/<uuid:domain_id>/', get_category_weights, name='get_category_weights'),
    path('domain/<uuid:pk>/', DomainRetrieveUpdateDestroyView.as_view(), name='domain-detail'),
    path('category_weights/<uuid:domain_id>/', update_category_weights, name='update_category_weights'),
    path('get_category_weights/<uuid:domain_id>/', get_category_weights, name='get_category_weights'),


]