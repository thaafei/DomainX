from django.db import models
import uuid
from ..libraries.models import Library
from ..metrics.models import Metric

class LibraryMetricValue(models.Model):
    """
    Stores the value of a given metric for a given library.
    """
    value_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    library = models.ForeignKey(Library, on_delete=models.CASCADE)
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0, null=True, blank=True)
    evidence = models.TextField(blank=True, null=True)
    collected_by = models.CharField(max_length=100, blank=True, null=True)
    last_modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.library.library_name} - {self.metric.metric_name}: {self.value}" 