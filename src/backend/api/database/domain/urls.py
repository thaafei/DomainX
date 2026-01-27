from django.urls import path
from .views import DomainListCreateView
from .views import DomainRetrieveUpdateDestroyView
from .views import create_domain

urlpatterns = [
    path('', DomainListCreateView.as_view(), name='domain-list'),
    path('<uuid:pk>/', DomainRetrieveUpdateDestroyView.as_view(), name='domain-detail'),
    path('create/', create_domain, name='create_domain'),
]
