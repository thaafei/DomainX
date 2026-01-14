from rest_framework import generics
from .models import Domain
from .serializers import DomainSerializer
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required

class DomainListCreateView(generics.ListCreateAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

class DomainRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer

@login_required
def create_domain(request):
    if request.method == 'POST':
        name = request.POST.get('domain_name', '').strip()
        desc = request.POST.get('description', '').strip()
        if not name:
            messages.error(request, "Domain name is required.")
        elif Domain.objects.filter(domain_name=name).exists():
            messages.error(request, f"The domain '{name}' already exists.")
        else:
            Domain.objects.create(
                domain_name=name,
                description=desc,
                created_by=request.user
            )
            messages.success(request, "Domain created successfully!")
            return redirect('domain_list')
    return render(request, 'create_domain.html')
