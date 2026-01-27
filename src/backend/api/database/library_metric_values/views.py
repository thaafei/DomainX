from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import LibraryMetricValue
from .serializers import LibraryMetricValueSerializer
from ..libraries.models import Library
from ..metrics.models import Metric
from django.db import transaction
from django.shortcuts import get_object_or_404
# Create or Update a value
class LibraryMetricValueCreateOrUpdateView(APIView):
    """
    Create or update a LibraryMetricValue given library and metric.
    """
    def post(self, request):
        library_id = request.data.get('library')
        metric_id = request.data.get('metric')
        value = request.data.get('value')

        if not (library_id and metric_id and value is not None):
            return Response({'error': 'library, metric, and value are required.'}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = LibraryMetricValue.objects.update_or_create(
            library_id=library_id,
            metric_id=metric_id,
            defaults={'value': value}
        )

        serializer = LibraryMetricValueSerializer(obj)
        return Response({
            'message': 'Created' if created else 'Updated',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# Retrieve a value by library and metric
class LibraryMetricTableView(APIView):
    """
    Returns a table where rows = libraries, columns = metrics,
    FILTERED by the 'domain_id' query parameter.
    """
    def get(self, request):
        #Get the domain_id from the query parameters
        domain_id = request.query_params.get('domain_id')

        if not domain_id:
            return Response({'error': 'The domain_id query parameter is required.'}, 
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            libraries = Library.objects.filter(domain_id=domain_id) 
            metrics = Metric.objects.all()
            table = []

            for lib in libraries:
                row = {
                    'library_id': str(lib.library_ID), 
                    'library_name': lib.library_name,
                    'domain': str(lib.domain.domain_ID) if hasattr(lib, 'domain') else domain_id
                }
                
                for metric in metrics:
                    try:
                        val = LibraryMetricValue.objects.get(library=lib, metric=metric)
                        row[metric.metric_name] = val.value
                    except LibraryMetricValue.DoesNotExist:
                        row[metric.metric_name] = None
                
                table.append(row)

            return Response(table)
            
        except Exception as e:
            return Response({'error': f'A server error occurred: {str(e)}'}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# # Return all values as a table (frontend use)
# class LibraryMetricTableView(APIView):
#     """
#     Returns a table where rows = libraries, columns = metrics.
#     """
#     def get(self, request):
#         libraries = Library.objects.all()
#         metrics = Metric.objects.all()
#         table = []

#         for lib in libraries:
#             row = {'library_id': str(lib.Library_ID), 'library_name': lib.Library_Name}
#             for metric in metrics:
#                 try:
#                     val = LibraryMetricValue.objects.get(library=lib, metric=metric)
#                     row[metric.metric_name] = val.value
#                 except LibraryMetricValue.DoesNotExist:
#                     row[metric.metric_name] = None
#             table.append(row)

#         return Response(table)

class MetricValueBulkUpdateView(APIView):
    """
    Receives a list of metric score updates and processes them efficiently.
    Expected data format:
    [
      {"library_id": "...", "metric_id": "...", "value": 0.5},
      ...
    ]
    """
    def post(self, request):
        updates = request.data  # This is the list of objects from the frontend
        
        if not isinstance(updates, list):
            return Response({"error": "Expected a list of updates."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not updates:
            return Response({"status": "No data received to update."}, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                for item in updates:
                    library_id = item.get('library_id')
                    metric_id = item.get('metric_id')
                    value = item.get('value')
                    
                    if not library_id or not metric_id:
                        continue  # Skip malformed data

                    # Handle empty/null input by setting value to None (as per model)
                    if value == '' or value is None:
                        float_value = None
                    else:
                        # Attempt to parse as float
                        try:
                            float_value = float(value)
                        except ValueError:
                            # Log and skip invalid non-numeric value
                            print(f"Skipping invalid value for L:{library_id}, M:{metric_id}: {value}")
                            continue

                    # Retrieve objects or return an error if relationship fails
                    library = get_object_or_404(Library, pk=library_id)
                    metric = get_object_or_404(Metric, pk=metric_id)

                    # Create or update the record in a single database operation
                    LibraryMetricValue.objects.update_or_create(
                        library=library,
                        metric=metric,
                        defaults={'value': float_value}
                    )
            
            return Response({"status": f"Successfully updated {len(updates)} metric values."}, status=status.HTTP_200_OK)

        except Exception as e:
            # Catch database or internal errors
            return Response({"error": f"Bulk update failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
