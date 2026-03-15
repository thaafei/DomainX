from rest_framework import serializers
from .models import CustomUser
from api.database.domain.models import Domain


class InviteUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["admin", "superadmin"])
    domain_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=[]
    )

    def validate_email(self, value):
        value = value.lower()
        if CustomUser.objects.filter(email__iexact=value, is_deleted=False).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        value = value.lower()
        if CustomUser.objects.filter(username__iexact=value, is_deleted=False).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "username",
            "role",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
        ]


class UserWithDomainsSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True, allow_null=True)
    domains = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "username",
            "role",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "domains",
        ]

    def get_domains(self, obj):
        if obj.role in ["admin", "superadmin"]:
            domains = obj.created_domains.all()
            return [
                {"domain_ID": str(d.domain_ID), "domain_name": d.domain_name}
                for d in domains
            ]
        return []

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
