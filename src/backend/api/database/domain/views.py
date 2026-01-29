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
        return Response(domain.category_weights or {}, status=status.HTTP_200_OK)

    values = request.data.get("values", {})
    if not isinstance(values, dict):
        return Response({"error": "`values` must be an object/dict"}, status=status.HTTP_400_BAD_REQUEST)

    current = domain.category_weights or {}
    for key, value in values.items():
        current[key] = value

    domain.category_weights = current
    domain.save(update_fields=["category_weights"])

    return Response({"success": True}, status=status.HTTP_200_OK)
