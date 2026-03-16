from django.urls import path
from .views.profile import ProfileView
from .views.auth_views import (
    LoginView,
    LogoutView,
    MeView,
    InviteUserView,
    AcceptInviteView,
    UserListView,
    UserUpdateView,
    ChangePasswordView,
    UserDomainListView,
    ValidateInviteView,
    DeactivateUserView,
    ForgotPasswordView,
    ResetPasswordView,
    ValidateResetPasswordView,
    ResendInviteView

)
urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("users/invite/", InviteUserView.as_view(), name="invite-user"),
    path("users/<int:user_id>/resend-invite/", ResendInviteView.as_view(), name="resend-invite"),
    path("validate-invite/", ValidateInviteView.as_view()),
    path("auth/accept-invite/", AcceptInviteView.as_view(), name="accept-invite"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/", UserListView.as_view(), name="users"),
    path("users/<int:user_id>/", UserUpdateView.as_view(), name="user-update"),
    path("users/<int:user_id>/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/<int:user_id>/domains/", UserDomainListView.as_view(), name="user-domains"),
    path("users/<int:user_id>/deactivate/", DeactivateUserView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("validate-reset-password/", ValidateResetPasswordView.as_view(), name="validate-reset-password"),


]
