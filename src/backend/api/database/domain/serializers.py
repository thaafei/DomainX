from rest_framework import serializers

from users.serializers import UserProfileSerializer

from ..libraries.serializers import LibrarySerializer
from .models import Domain


class DomainSerializer(serializers.ModelSerializer):
    libraries = LibrarySerializer(many=True, read_only=True)
    creators = UserProfileSerializer(many=True, read_only=True)

    class Meta:
        model = Domain
        fields = "__all__"
