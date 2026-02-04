from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import UserProfileSerializer, SignupSerializer, UserWithDomainsSerializer
from django.conf import settings
from rest_framework.permissions import AllowAny
from ..models import CustomUser
from api.database.domain.models import Domain
from ..serializers import (
    UserProfileSerializer, 
    SignupSerializer, 
    UserWithDomainsSerializer
)

class SignupView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = SignupSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.save()

        return Response(
            {
                "message": "Account created successfully.",
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED
        )

class LoginView(APIView):
    def post(self, request):
        login_value = request.data.get("login")
        password = request.data.get("password")

        user = authenticate(request, username=login_value, password=password)
        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)

        response = Response({"user": UserProfileSerializer(user).data}, status=status.HTTP_200_OK)

        response.set_cookie("access_token", str(refresh.access_token),
                            httponly=True, secure=not settings.DEBUG, samesite="Lax")
        response.set_cookie("refresh_token", str(refresh),
                            httponly=True, secure=not settings.DEBUG, samesite="Lax")
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"user": UserProfileSerializer(request.user).data})


class LogoutView(APIView):
    def post(self, request):
        response = Response({"message": "Logged out"}, status=200)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Restrict access to superadmin only
        if request.user.role != 'superadmin':
            return Response(
                {"error": "You do not have permission to access this resource."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from ..models import CustomUser
        role = request.query_params.get('role', None)
        include_domains = request.query_params.get('include_domains', 'false').lower() == 'true'
        
        users = CustomUser.objects.all()
        
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
        from ..models import CustomUser
        
        # 1. Permission Logic: Only the user themselves OR a superadmin
        if str(request.user.id) != str(user_id) and request.user.role != 'superadmin':
            return Response(
                {"error": "You do not have permission to update this profile."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user_to_update = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found."}, status=404)
        
        # 2. Basic Info (Everyone can update their own)
        fields = ['first_name', 'last_name', 'username', 'email']
        for field in fields:
            val = request.data.get(field if field != 'username' else 'user_name')
            if val is not None:
                # Email uniqueness check
                if field == 'email' and CustomUser.objects.filter(email=val).exclude(id=user_id).exists():
                    return Response({"error": "Email already in use."}, status=400)
                setattr(user_to_update, field, val)
        
        # 3. Restricted Info (ONLY Superadmin can change Role or Domains)
        if request.user.role == 'superadmin':
            role = request.data.get('role')
            if role in ['user', 'admin', 'superadmin']:
                user_to_update.role = role
            
        # Domain logic (only for admins/superadmins)
        if user_to_update.role in ['admin', 'superadmin']:
            domain_ids = request.data.get('domain_ids')
            if domain_ids is not None:
                user_to_update.created_domains.clear()
                for d_id in domain_ids:
                    try:
                        domain = Domain.objects.get(domain_ID=d_id)
                        user_to_update.created_domains.add(domain)
                    except Domain.DoesNotExist: pass
        else:
            user_to_update.created_domains.clear()

        user_to_update.save()
        return Response({"message": "Profile updated successfully"}, status=200)
    
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        # Security: Ensure users can only change their OWN password
        # (Unless they are a superadmin, depending on your policy)
        if request.user.id != user_id and request.user.role != 'superadmin':
            return Response(
                {"error": "You do not have permission to change this password."},
                status=status.HTTP_403_FORBIDDEN
            )

        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"error": "Both current and new passwords are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        # If a superadmin is changing someone else's password, we skip the old password check
        if user.id == user_id:
            if not user.check_password(old_password):
                return Response(
                    {"error": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Basic length validation
        if len(new_password) < 8:
            return Response(
                {"error": "New password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)

class UserDomainListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id)
            # Fetching domains based on your Serializer logic
            if user.role in ['admin', 'superadmin']:
                domains = user.created_domains.all()
                data = [{'domain_ID': str(d.domain_ID), 'domain_name': d.domain_name} for d in domains]
                return Response(data, status=200)
            return Response([], status=200)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
