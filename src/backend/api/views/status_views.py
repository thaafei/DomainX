from django.http import JsonResponse


def status_view(request):
    return JsonResponse({"message": "Django backend is successfully connected."})




