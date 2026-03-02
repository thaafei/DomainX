from rest_framework import serializers
from .models import Domain
from ..libraries.serializers import LibrarySerializer
from users.serializers import UserProfileSerializer
class DomainSerializer(serializers.ModelSerializer):
    libraries = LibrarySerializer(many=True, read_only=True)
    creators = UserProfileSerializer(many=True, read_only=True)
    class Meta:
        model = Domain
        fields = '__all__'

    def validate(self, data):
        if not data.get("domain_name"):
            raise serializers.ValidationError({"domain_name": "Domain name is required."})

        if not data.get("description"):
            raise serializers.ValidationError({"description": "Description is required."})

        return data