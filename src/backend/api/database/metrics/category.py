from django.db import models
import uuid



class Category(models.Model):
    category_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category_name = models.CharField(max_length=100, unique=True, null=True, blank=True, editable=True)
    category_description = models.TextField(blank=True, null=True, help_text="Optional additional description of the category name.", editable=True)

    def __str__(self):
        return self.category_name