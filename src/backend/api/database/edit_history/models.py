from django.db import models
from django.conf import settings
import uuid


class EditHistory(models.Model):
    edit_ID = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edit_history",
    )

    table_name = models.CharField(max_length=100)
    record_ID = models.UUIDField(default=uuid.uuid4)
    field_name = models.CharField(max_length=100)

    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "edit_history"

    def __str__(self):
        return f"{self.table_name}.{self.field_name}"
