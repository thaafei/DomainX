from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import UserProfileSerializer,SignupSerializer
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
