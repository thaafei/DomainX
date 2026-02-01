from rest_framework import generics, status
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from ..domain.models import Domain
from .models import Library
from .serializers import LibrarySerializer
from ...utils.analysis import enqueue_library_analysis


class LibraryListCreateView(generics.ListCreateAPIView):
    queryset = Library.objects.all().order_by("library_name")
    serializer_class = LibrarySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # ✅ domain is a Domain instance (already validated)
        domain = serializer.validated_data.get("domain")
        if domain is None:
            return Response({"error": "Domain is required."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ save normally (domain already inside validated_data)
        new_library = serializer.save()

        # mark pending
        new_library.analysis_status = Library.ANALYSIS_PENDING
        new_library.analysis_task_id = None
        new_library.analysis_error = None
        new_library.analysis_started_at = None
        new_library.analysis_finished_at = None
        new_library.save(update_fields=[
            "analysis_status",
            "analysis_task_id",
            "analysis_error",
            "analysis_started_at",
            "analysis_finished_at",
        ])

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


class LibraryDestroyView(APIView):
    def delete(self, request, library_id):
        library = get_object_or_404(Library, pk=library_id)
        library.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
