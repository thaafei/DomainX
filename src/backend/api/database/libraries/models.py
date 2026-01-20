from django.db import models
from ..domain.models import Domain
import uuid

class Library(models.Model):
    """
    Represents a GitHub repository or library (e.g. an open-source neural network).
    """
    library_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='libraries')
    library_name = models.CharField(max_length=100)
    programming_language = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    url = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["domain", "library_name"], name="uniq_library_name_per_domain"),
            models.UniqueConstraint(fields=["domain", "url"], name="uniq_url_per_domain")
        ]


    def __str__(self):
        return self.library_name
    
    def get_library_id(self):
        return str(self.library_ID)

    ANALYSIS_PENDING = "pending"
    ANALYSIS_RUNNING = "running"
    ANALYSIS_SUCCESS = "success"
    ANALYSIS_FAILED = "failed"

    ANALYSIS_STATUS_CHOICES = [
        (ANALYSIS_PENDING, "Pending"),
        (ANALYSIS_RUNNING, "Running"),
        (ANALYSIS_SUCCESS, "Success"),
        (ANALYSIS_FAILED, "Failed"),
    ]

    analysis_status = models.CharField(
        max_length=20,
        choices=ANALYSIS_STATUS_CHOICES,
        default=ANALYSIS_PENDING,
    )
    analysis_task_id = models.CharField(max_length=255, blank=True, null=True)
    analysis_error = models.TextField(blank=True, null=True)
    analysis_started_at = models.DateTimeField(blank=True, null=True)
    analysis_finished_at = models.DateTimeField(blank=True, null=True)

