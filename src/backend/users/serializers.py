from rest_framework import serializers
from .models import CustomUser

class SignupSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)
    class Meta:
        model = CustomUser
        fields = ["email", "username", "password"]
    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = ["id", "email", "username", "role", "first_name", "last_name", "full_name"]
        read_only_fields = ["email", "role"]