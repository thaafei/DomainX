from django.db import models
from django.conf import settings


class BackupLog(models.Model):
    backup_ID = models.BigAutoField(primary_key=True)

    backup_date = models.DateTimeField(auto_now_add=True)
    backup_file = models.CharField(max_length=255)
    status = models.CharField(max_length=50)

    performedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backups_performed",
    )

    class Meta:
        db_table = "backup_log"

    def __str__(self):
        return f"{self.status} - {self.backup_file}"
