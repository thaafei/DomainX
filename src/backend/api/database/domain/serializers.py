from rest_framework import serializers
from .models import Domain
from ..libraries.serializers import LibrarySerializer
class DomainSerializer(serializers.ModelSerializer):
    libraries = LibrarySerializer(many=True, read_only=True)
    class Meta:
        model = Domain
        fields = '__all__'
