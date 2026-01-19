from rest_framework import generics
from .models import Domain
from .serializers import DomainSerializer
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

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

    if not name or not desc:
        return Response({"error": "Fields missing"}, status=400)

    try:
        Domain.objects.create(
            domain_name=name,
            description=desc, 
            # created_by=request.user
        )
        return Response({"status": "success"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(["POST"])
def get_domain(request, domain_id):
    try:
        domain = Domain.objects.get(pk=domain_id)
    except Metric.DoesNotExist:
        return Response({"error": "Metric not found"}, status=status.HTTP_404_NOT_FOUND)