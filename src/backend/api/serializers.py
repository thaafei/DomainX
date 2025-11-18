from rest_framework import serializers
from .models import Metric
from .models import Library
from .models import Domain

class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = "__all__"
class LibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Library
        fields = "__all__"


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = "__all__"