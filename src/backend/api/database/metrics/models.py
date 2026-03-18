from django.db import models
import uuid

class Metric(models.Model):
    VALUE_TYPES = [
        ("float", "Float"),
        ("int", "Integer"),
        ("bool", "Boolean"),
        ("range", "Range"),
        ("text", "Text"),
        ("date", "Date"),
        ("time", "Time"),
        ("datetime", "Date & Time"),
    ]

    SOURCE_TYPES = [
        ("manual", "Manual"),
        ("github_api", "GitHub API"),
        ("scc", "SCC"),
        ("gitstats", "GitStats"),
    ]

    metric_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    weight = models.FloatField(default=1.0)
    option_category = models.CharField(max_length=100, blank=True, null=True)
    rule = models.CharField(max_length=100, blank=True, null=True)
    value_type = models.CharField(max_length=10, choices=VALUE_TYPES, default="float")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES, default="manual")
    metric_key = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    scoring_dict = models.JSONField(default=dict, blank=True, null=True)

    def __str__(self):
        return self.metric_name