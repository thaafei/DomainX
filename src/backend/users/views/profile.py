from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..serializers import UserProfileSerializer
from ..models import CustomUser
from ..serializers import UserWithDomainsSerializer

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    

class UserDomainsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            # We fetch the specific user
            user_obj = CustomUser.objects.get(id=user_id)
            
            # Pass it through your existing serializer
            serializer = UserWithDomainsSerializer(user_obj)
            
            # We only return the 'domains' part of the serialized data
            return Response(serializer.data.get('domains', []), status=200)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)