from django.db import models
from ..domain.models import Domain
import uuid

class Library(models.Model):
    """
    Represents a GitHub repository or library (e.g. an open-source neural network).
    """
    library_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='libraries')
    library_name = models.CharField(max_length=100, unique=True)
    programming_language = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    url = models.CharField(max_length=100, blank=True, null=True, unique=True)

    def __str__(self):
        return self.library_name
    
    def get_library_id(self):
        return str(self.library_ID)

