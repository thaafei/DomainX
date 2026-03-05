from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
import os
import json

from .models import Domain
from .serializers import DomainSerializer


class DomainListCreateView(generics.ListCreateAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

    def perform_create(self, serializer):
        path = os.path.join(settings.BASE_DIR, "api", "database", "categories.json")

        categories = []
        try:
            with open(path, "r") as f:
                categories = json.load(f).get("Categories", [])
        except Exception:
            categories = []

        category_weights = {}
        if categories:
            equal_weight = 1.0 / len(categories)
            category_weights = {cat: equal_weight for cat in categories}

        creator_ids = self.request.data.get("creator_ids")
        domain = serializer.save(category_weights=category_weights)

        if creator_ids:
            domain.creators.set(creator_ids)


class DomainRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

    def perform_update(self, serializer):
        creator_ids = self.request.data.get("creator_ids")
        instance = serializer.save()
        if creator_ids is not None:
            instance.creators.set(creator_ids)
        return instance


@api_view(["GET", "POST"])
def category_weights(request, domain_id):

    try:
        domain = Domain.objects.get(pk=domain_id)
    except Domain.DoesNotExist:
        return Response({"error": "Domain not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        # Returns both the dictionary of weights and the raw matrix
        return Response({
            "category_weights": domain.category_weights or {},
            "ahp_matrix": domain.ahp_matrix or {}
        }, status=status.HTTP_200_OK)

    if request.method == "POST":
        # Get data from request
        new_weights = request.data.get("values", {}) # The AHP results
        matrix_data = request.data.get("matrix", {}) # The UI matrix

        # Update the category_weights dictionary
        current_weights = dict(domain.category_weights or {})
        for key, value in new_weights.items():
            current_weights[key] = value
        
        domain.category_weights = current_weights
        
        # Save the raw matrix into its own field
        domain.ahp_matrix = matrix_data
        
        domain.save()

        return Response({"success": True}, status=status.HTTP_200_OK)