from rest_framework import generics
from .models import Domain
from .serializers import DomainSerializer
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import os
from django.conf import settings
import json

class DomainListCreateView(generics.ListCreateAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

class DomainRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

class DomainDetailView(generics.RetrieveAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

@api_view(["POST"])
def create_domain(request):
    name = request.data.get('domain_name')
    desc = request.data.get('description')
    creator_ids = request.data.get('creator_ids')
    path = os.path.join(settings.BASE_DIR, 'api', 'database', 'categories.json')
    with open(path, 'r') as f:
        categories = json.load(f).get('Categories', [])
    
    if categories:
        equal_weight = 1.0 / len(categories)
        category_weights = {cat: equal_weight for cat in categories}
    if not name or not desc:
        return Response({"error": "Fields missing"}, status=400)

    try:
        domain = Domain.objects.create(
            domain_name=name,
            description=desc, 
            category_weights=category_weights
        )
        if creator_ids:
            domain.creators.set(creator_ids)
        return Response({"status": "success"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["GET"])
def get_domain(request, domain_id):
    try:
        domain = Domain.objects.get(pk=domain_id)
    except Metric.DoesNotExist:
        return Response({"error": "Metric not found"}, status=status.HTTP_404_NOT_FOUND)