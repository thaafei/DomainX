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
        role = request.data.get('role')
        
        if first_name is not None:
            user_to_update.first_name = first_name
        if last_name is not None:
            user_to_update.last_name = last_name
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
