from django.urls import include, path

urlpatterns = [
    path("", include("api.database.urls")),
]
