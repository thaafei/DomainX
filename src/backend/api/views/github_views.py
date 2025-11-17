from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..services.github_service import fetch_and_process_stars
@api_view(['POST'])
def get_repo_stars(request):

    repo_list = request.data.get('repos', [])

    if not repo_list:
        return Response({"error": "No repositories provided."}, status=400)

    results = fetch_and_process_stars(repo_list)

    return Response(results)