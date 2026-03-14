import hashlib
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import CustomUser, UserInvite
from api.database.domain.models import Domain
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from ..tasks import send_invite_email_task
from ..serializers import (
    InviteUserSerializer,
    AcceptInviteSerializer,
    UserProfileSerializer,
    UserWithDomainsSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login_value = request.data.get("login")
        password = request.data.get("password")

        user = authenticate(request, username=login_value, password=password)
        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


        refresh = RefreshToken.for_user(user)

        response = Response({"user": UserProfileSerializer(user).data}, status=status.HTTP_200_OK)

        response.set_cookie(
            "access_token",
            str(refresh.access_token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
        )
        response.set_cookie(
            "refresh_token",
            str(refresh),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
        )
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": UserProfileSerializer(request.user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"message": "Logged out"}, status=200)
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        return response


class InviteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "superadmin":
            return Response(
                {"error": "You do not have permission to invite users."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = InviteUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        with transaction.atomic():
            user = CustomUser.objects.filter(email__iexact=data["email"].lower(), is_deleted=True).first()

            if user:
                user.email = data["email"].lower()
                user.username = data["username"].lower()
                user.first_name = data.get("first_name", "")
                user.last_name = data.get("last_name", "")
                user.role = data["role"]
                user.is_active = False
                user.is_deleted = False
                user.set_unusable_password()
                user.save()
            else:
                user = CustomUser.objects.create_user(
                    email=data["email"].lower(),
                    username=data["username"].lower(),
                    first_name=data.get("first_name", ""),
                    last_name=data.get("last_name", ""),
                    role=data["role"],
                    is_active=False,
                )
                user.set_unusable_password()
                user.save()

            domain_ids = data.get("domain_ids", [])
            if domain_ids:
                domains = Domain.objects.filter(domain_ID__in=domain_ids)
                user.created_domains.set(domains)
            else:
                user.created_domains.clear()

            invite, raw_token = UserInvite.create_for_user(
                user=user,
                invited_by=request.user,
                hours_valid=24 * 7,
            )

        invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={raw_token}"

        subject = "You're invited to DomainX"
        body = (
            f"Hi {user.first_name or user.username},\n\n"
            f"You've been invited to join DomainX.\n\n"
            f"To activate your account, please set your password using the link below:\n\n"
            f"{invite_url}\n\n"
            f"This invitation link will expire in 7 days.\n"
            f"If it expires before you use it, please contact your administrator to request a new invitation.\n\n"
            f"Welcome to DomainX,\n"
            f"The DomainX Team"
        )

        send_invite_email_task.delay(user.email, subject, body)

        return Response(
            {"message": "Invitation sent successfully."},
            status=status.HTTP_201_CREATED
        )


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        token_hash = hashlib.sha256(token.encode()).hexdigest()

        try:
            invite = UserInvite.objects.select_related("user").get(token_hash=token_hash)
        except UserInvite.DoesNotExist:
            return Response({"error": "Invalid invite link."}, status=status.HTTP_400_BAD_REQUEST)

        if invite.is_used():
            return Response({"error": "This invite link has already been used."}, status=400)

        if invite.user.is_active:
            return Response({"error": "Account already activated."}, status=400)
        if invite.is_expired():
            return Response(
                {
                    "error": "This invite link has expired. Please contact your administrator to request a new invitation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(password, user=invite.user)
        except ValidationError as e:
            return Response({"errors": {"password": e.messages}}, status=status.HTTP_400_BAD_REQUEST)

        user = invite.user
        user.set_password(password)
        user.is_active = True
        user.save()

        invite.used_at = timezone.now()
        invite.save(update_fields=["used_at"])


        return Response({"message": "Account activated successfully."}, status=status.HTTP_200_OK)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'superadmin':
            return Response(
                {"error": "You do not have permission to access this resource."},
                status=status.HTTP_403_FORBIDDEN
            )

        role = request.query_params.get('role', None)
        include_domains = request.query_params.get('include_domains', 'false').lower() == 'true'

        users = CustomUser.objects.filter(is_deleted=False)

        if role:
            roles = [r.strip() for r in role.split(',')]
            users = users.filter(role__in=roles)

        if include_domains:
            users = users.prefetch_related('created_domains')
            return Response(UserWithDomainsSerializer(users, many=True).data)

        return Response(UserProfileSerializer(users, many=True).data)


class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        is_self = str(request.user.id) == str(user_id)
        is_admin = request.user.role == 'admin'
        is_super = request.user.role == 'superadmin'

        if not is_self and not (is_admin or is_super):
            return Response({"error": "Forbidden"}, status=403)

        try:
            user_to_update = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if is_self or is_super:
            fields = ['first_name', 'last_name', 'username', 'email']
            for field in fields:
                val = request.data.get(field if field != 'username' else 'user_name')
                if val is not None:
                    if field in ["email", "username"] and isinstance(val, str):
                        val = val.lower()
                    setattr(user_to_update, field, val)

        if is_super:
            role = request.data.get('role')
            if role in ['admin', 'superadmin']:
                user_to_update.role = role

        domain_ids = request.data.get('domain_ids')
        if domain_ids is not None and (is_admin or is_super):
            if is_admin:
                my_domains = set(request.user.created_domains.values_list('domain_ID', flat=True))
                valid_ids = [d_id for d_id in domain_ids if d_id in my_domains]
            else:
                valid_ids = domain_ids

            user_to_update.created_domains.clear()
            for d_id in valid_ids:
                try:
                    domain = Domain.objects.get(domain_ID=d_id)
                    user_to_update.created_domains.add(domain)
                except Domain.DoesNotExist:
                    continue
        if CustomUser.objects.exclude(id=user_to_update.id).filter(email__iexact=user_to_update.email).exists():
            return Response({"error": "A user with this email already exists."}, status=400)

        if CustomUser.objects.exclude(id=user_to_update.id).filter(username__iexact=user_to_update.username).exists():
            return Response({"error": "A user with this username already exists."}, status=400)
        user_to_update.save()
        return Response({"message": "Profile updated successfully"}, status=200)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        is_owner = request.user.id == int(user_id)
        is_superadmin = request.user.role == 'superadmin'

        if not is_owner and not is_superadmin:
            return Response(
                {"error": "You do not have permission to change this password."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            target_user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if is_owner:
            if not old_password:
                return Response({"error": "Current password is required."}, status=400)
            if not target_user.check_password(old_password):
                return Response({"error": "Current password is incorrect."}, status=400)

        try:
            validate_password(new_password, user=target_user)
        except ValidationError as e:
            return Response({"errors": {"new_password": e.messages}}, status=400)

        target_user.set_password(new_password)
        target_user.save()

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


class UserDomainListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id)
            if user.role in ['admin', 'superadmin']:
                domains = user.created_domains.all()
                data = [{'domain_ID': str(d.domain_ID), 'domain_name': d.domain_name} for d in domains]
                return Response(data, status=200)
            return Response([], status=200)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

class ValidateInviteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")

        if not token:
            return Response({"error": "Invalid token"}, status=400)

        token_hash = hashlib.sha256(token.encode()).hexdigest()

        try:
            invite = UserInvite.objects.select_related("user").get(token_hash=token_hash)
        except UserInvite.DoesNotExist:
            return Response({"valid": False}, status=200)

        if invite.is_used() or invite.user.is_active:
            return Response({"valid": False}, status=200)

        if invite.is_expired():
            return Response({"valid": False}, status=200)

        return Response({"valid": True}, status=200)

class DeactivateUserView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):

        if request.user.role != "superadmin":
            return Response(
                {"error": "You do not have permission to deactivate users."},
                status=403,
            )

        try:
            target_user = CustomUser.objects.get(id=user_id, is_deleted=False)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if target_user.id == request.user.id:
            return Response(
                {"error": "You cannot deactivate yourself."},
                status=400,
            )

        if target_user.role == "superadmin":
            remaining = CustomUser.objects.filter(
                role="superadmin",
                is_deleted=False
            ).exclude(id=target_user.id).count()

            if remaining == 0:
                return Response(
                    {"error": "You cannot deactivate the last superadmin."},
                    status=400,
                )

        target_user.is_active = False
        target_user.is_deleted = True
        target_user.save(update_fields=["is_active", "is_deleted"])

        return Response({"message": "User deactivated successfully."}, status=200)
