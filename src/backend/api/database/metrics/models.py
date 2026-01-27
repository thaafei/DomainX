from django.db import models
import uuid

class Metric(models.Model):
    """
    Represents a metric that can be evaluated for a library.
    """
    value_types = [
        ("float", "Float"),
        ("int", "Integer"),
        ("bool", "Boolean"),
        ("text", "Text"),
    ]
    metric_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    weight = models.FloatField(default=1.0)
    option_category = models.CharField(max_length=100, blank=True, null=True)
    rule = models.CharField(max_length=100, blank=True, null=True)
    value_type = models.CharField(max_length=10, choices=value_types, default="float")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.metric_name
