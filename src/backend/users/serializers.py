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

class UserWithDomainsSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True, allow_null=True)
    domains = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ["id", "email", "username", "role", "first_name", "last_name", "full_name", "domains"]
        read_only_fields = ["email", "role"]
    
    def get_domains(self, obj):
        if obj.role in ['admin', 'superadmin']:
            domains = obj.created_domains.all()
            return [{'domain_ID': str(d.domain_ID), 'domain_name': d.domain_name} for d in domains]
        return []