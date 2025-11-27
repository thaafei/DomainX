from rest_framework import generics
from .models import Library
from .serializers import LibrarySerializer
from rest_framework.generics import ListAPIView
from ..domain.models import Domain
from django.shortcuts import get_object_or_404
# from ..services import RepoAnalysisService
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..domain.models import Domain
from ..libraries.models import Library
from .serializers import LibraryWithMetricsSerializer

class LibraryListCreateView(generics.ListCreateAPIView):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer
# class LibraryAnalysisView(APIView):
#     """Creates a Library, clones its GitHub repo, analyzes metrics, and saves values."""
    
#     def post(self, request, *args, **kwargs):
#         github_url = request.data.get('url')
#         domain_id = request.data.get('domain')
        
#         if not github_url or not domain_id:
#             return Response(
#                 {"error": "Missing 'url' or 'domain' in request data."},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         try:
#             # 1. Initialize and execute the service
#             service = RepoAnalysisService(github_url, domain_id)
#             result = service.execute_analysis()
            
#             # The result contains the new library_id and name
#             return Response(
#                 {"status": "Library created and metrics analyzed successfully.", 
#                  "library_id": result['library_id'],
#                  "library_name": result['library_name']},
#                 status=status.HTTP_201_CREATED
#             )
            
#         except Exception as e:
#             # Catch exceptions from the service (e.g., clone failed, invalid URL)
#             return Response(
#                 {"error": f"Analysis failed: {str(e)}", "url": github_url},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
class LibraryByDomainListView(ListAPIView):
    """
    1. Returns a list of all Libraries belonging to a specific Domain.
    This replaces the old combined data fetch for the table rows.
    """
    serializer_class = LibrarySerializer

    def get_queryset(self):
        # The domain_id comes from the URL pattern defined in api/database/urls.py
        domain_id = self.kwargs['domain_id']
        
        # Ensure the domain exists (or return 404)
        get_object_or_404(Domain, pk=domain_id) 

        # Filter the libraries by the domain ID
        queryset = Library.objects.filter(domain_id=domain_id).order_by('library_name')
        return queryset

# class LibraryAnalysisView(APIView):
#     """Creates a Library, clones its GitHub repo, analyzes metrics, and saves values."""
    
#     def post(self, request, *args, **kwargs):
#         github_url = request.data.get('url')
#         domain_id = request.data.get('domain')
        
#         if not github_url or not domain_id:
#             return Response(
#                 {"error": "Missing 'url' or 'domain' in request data."},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         try:
#             # 1. Initialize and execute the service
#             service = RepoAnalysisService(github_url, domain_id)
#             result = service.execute_analysis()
            
#             # The result contains the new library_id and name
#             return Response(
#                 {"status": "Library created and metrics analyzed successfully.", 
#                  "library_id": result['library_id'],
#                  "library_name": result['library_name']},
#                 status=status.HTTP_201_CREATED
#             )
            
#         except Exception as e:
#             # Catch exceptions from the service (e.g., clone failed, invalid URL)
#             return Response(
#                 {"error": f"Analysis failed: {str(e)}", "url": github_url},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        

class LibrariesByDomainView(generics.ListAPIView):
    """
    GET: Retrieve a list of Libraries filtered by a specific Domain ID.
    The Domain ID is passed in the URL, e.g., /api/libraries/domain/<domain_ID>/
    """
    serializer_class = LibraryWithMetricsSerializer

    def get_queryset(self):
        """
        Custom method to filter the Library queryset based on the 
        domain_id provided in the URL arguments (kwargs).
        """
        # Get the domain_id from the URL path
        domain_id = self.kwargs['domain_ID'] 
        
        # Filter Library objects where the foreign key 'domain_id' matches the URL parameter
        return Library.objects.filter(domain_id=domain_id)