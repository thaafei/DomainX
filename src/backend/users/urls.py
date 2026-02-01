from django.urls import path
from .views.auth_views import LoginView, LogoutView, MeView, SignupView, UserListView, UserUpdateView
from .views.profile import ProfileView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/", UserListView.as_view(), name="users"),
    path("users/<int:user_id>/", UserUpdateView.as_view(), name="user-update"),
]
