from django.urls import path
from .views import DomainListCreateView, DomainRetrieveUpdateDestroyView, category_weights

urlpatterns = [
    path("", DomainListCreateView.as_view(), name="domain-list-create"),             # GET list, POST create
    path("<uuid:pk>/", DomainRetrieveUpdateDestroyView.as_view(), name="domain-rud"), # GET/PUT/PATCH/DELETE
    path("<uuid:domain_id>/category-weights/", category_weights, name="category-weights"),
]
