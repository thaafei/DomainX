from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import UserProfileSerializer, SignupSerializer, UserWithDomainsSerializer
from django.conf import settings
from rest_framework.permissions import AllowAny

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
        # Restrict access to superadmin only
        if request.user.role != 'superadmin':
            return Response(
                {"error": "You do not have permission to access this resource."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from ..models import CustomUser
        from api.database.domain.models import Domain
        
        try:
            user_to_update = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update basic fields
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        user_name = request.data.get('user_name')
        email = request.data.get('email')
        role = request.data.get('role')
        if first_name is not None:
            user_to_update.first_name = first_name
        if last_name is not None:
            user_to_update.last_name = last_name
        if user_name is not None:
            user_to_update.username = user_name
        if email is not None:
            if CustomUser.objects.filter(email=email).exclude(id=user_id).exists():
                return Response(
                    {"error": "This email is already in use by another account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user_to_update.email = email
        if role is not None and role in ['user', 'admin', 'superadmin']:
            user_to_update.role = role
        
        user_to_update.save()
        
        # Update domains if role is admin or superadmin
        if role in ['admin', 'superadmin']:
            domain_ids = request.data.get('domain_ids', [])
            if domain_ids is not None:
                # Clear existing domains and set new ones
                user_to_update.created_domains.clear()
                for domain_id in domain_ids:
                    try:
                        domain = Domain.objects.get(domain_ID=domain_id)
                        user_to_update.created_domains.add(domain)
                    except Domain.DoesNotExist:
                        pass
        else:
            # If role is 'user', clear all domains
            user_to_update.created_domains.clear()
        
        # Return updated user with domains
        user_to_update = CustomUser.objects.prefetch_related('created_domains').get(id=user_id)
        return Response(UserWithDomainsSerializer(user_to_update).data)
    
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
