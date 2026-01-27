from rest_framework import generics
from .models import Domain
from .serializers import DomainSerializer

class DomainListCreateView(generics.ListCreateAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

class DomainRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
