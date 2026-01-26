from django.db import models
import uuid
from django.conf import settings
class Domain(models.Model):
    domain_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain_name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    category_weights = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    published = models.BooleanField(default=False)

    def __str__(self):
        return self.domain_name
    
    def get_domain_ID(self):
        return str(self.domain_ID)

