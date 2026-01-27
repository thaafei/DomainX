from django.urls import path
from .views import DomainListCreateView
from .views import DomainRetrieveUpdateDestroyView
urlpatterns = [
    path('', DomainListCreateView.as_view(), name='domain-list'),
    path('<uuid:pk>/', DomainRetrieveUpdateDestroyView.as_view(), name='domain-detail'),
]
