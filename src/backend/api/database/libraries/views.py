from rest_framework import generics, status
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from ..domain.models import Domain
from .models import Library
from .serializers import LibrarySerializer, LibraryUpdateSerializer
from ...utils.analysis import enqueue_library_analysis


class LibraryListCreateView(generics.ListCreateAPIView):
    queryset = Library.objects.all().order_by("library_name")
    serializer_class = LibrarySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        domain = serializer.validated_data.get("domain")
        if domain is None:
            return Response({"error": "Domain is required."}, status=status.HTTP_400_BAD_REQUEST)

        new_library = serializer.save()

        new_library.analysis_status = Library.ANALYSIS_PENDING
        new_library.analysis_task_id = None
        new_library.analysis_error = None
        new_library.analysis_started_at = None
        new_library.analysis_finished_at = None
        new_library.save(
            update_fields=[
                "analysis_status",
                "analysis_task_id",
                "analysis_error",
                "analysis_started_at",
                "analysis_finished_at",
            ]
        )

        task_id = None
        try:
            task_id = enqueue_library_analysis(new_library)
            new_library.analysis_task_id = task_id
            new_library.save(update_fields=["analysis_task_id"])
        except Exception as e:
            new_library.analysis_status = Library.ANALYSIS_FAILED
            new_library.analysis_error = str(e)
            new_library.save(update_fields=["analysis_status", "analysis_error"])

        return Response(
            {
                "library": self.get_serializer(new_library).data,
                "message": "Library created. Analysis queued (or failed).",
                "task_id": task_id,
            },
            status=status.HTTP_201_CREATED,
        )


class LibraryByDomainListView(ListAPIView):
    serializer_class = LibrarySerializer

    def get_queryset(self):
        domain_id = self.kwargs["domain_id"]
        get_object_or_404(Domain, pk=domain_id)
        return Library.objects.filter(domain_id=domain_id).order_by("library_name")


from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Library
from .serializers import LibrarySerializer, LibraryUpdateSerializer


class LibraryUpdateView(generics.GenericAPIView):
    queryset = Library.objects.all()
    lookup_url_kwarg = "library_id"

    def get_object(self):
      return get_object_or_404(Library, pk=self.kwargs["library_id"])

    def put(self, request, *args, **kwargs):
        lib = self.get_object()
        serializer = LibraryUpdateSerializer(lib, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(
            {"library": LibrarySerializer(updated).data, "message": "Library updated successfully."},
            status=status.HTTP_200_OK,
        )

    def patch(self, request, *args, **kwargs):
        lib = self.get_object()
        serializer = LibraryUpdateSerializer(lib, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(
            {"library": LibrarySerializer(updated).data, "message": "Library updated successfully."},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, *args, **kwargs):
        lib = self.get_object()
        lib.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
