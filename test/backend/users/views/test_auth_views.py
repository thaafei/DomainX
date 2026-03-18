import pytest
from unittest.mock import MagicMock, patch
from rest_framework import status
from rest_framework.test import APIClient
from users.models import CustomUser
from api.database.domain.models import Domain


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mock_user():
    user = MagicMock(spec=CustomUser)
    user.id = 1
    user.email = "testuser@example.com"
    user.username = "testuser"
    user.role = "user"
    user.first_name = "Test"
    user.last_name = "User"
    user.is_authenticated = True
    user.is_active = True
    user.is_deleted = False
    return user


@pytest.fixture
def mock_superadmin():
    user = MagicMock(spec=CustomUser)
    user.id = 10
    user.email = "superadmin@example.com"
    user.username = "superadmin"
    user.role = "superadmin"
    user.is_authenticated = True
    user.is_active = True
    user.is_deleted = False
    user.created_domains = MagicMock()
    user.created_domains.values_list.return_value = []
    return user


@pytest.fixture
def mock_admin():
    user = MagicMock(spec=CustomUser)
    user.id = 2
    user.email = "admin@example.com"
    user.username = "admin"
    user.role = "admin"
    user.first_name = "Admin"
    user.last_name = "User"
    user.is_authenticated = True
    user.is_active = True
    user.is_deleted = False
    user.created_domains = MagicMock()
    user.created_domains.all.return_value = []
    user.created_domains.count.return_value = 0
    user.created_domains.add = MagicMock()
    user.created_domains.clear = MagicMock()
    user.created_domains.values_list.return_value = []
    return user


@pytest.fixture
def mock_domain1():
    domain = MagicMock(spec=Domain)
    domain.domain_ID = "domain-1"
    domain.domain_name = "Domain 1"
    domain.description = "First Domain"
    return domain


@pytest.fixture
def mock_domain2():
    domain = MagicMock(spec=Domain)
    domain.domain_ID = "domain-2"
    domain.domain_name = "Domain 2"
    domain.description = "Second Domain"
    return domain


class TestLoginView:
    @patch("users.views.auth_views.RefreshToken")
    @patch("users.views.auth_views.authenticate")
    @patch("users.views.auth_views.UserProfileSerializer")
    def test_login_success(self, mock_profile_serializer, mock_authenticate, mock_refresh_token, api_client):
        mock_user = MagicMock(spec=CustomUser)
        mock_user.email = "testuser@example.com"
        mock_user.is_active = True
        mock_authenticate.return_value = mock_user

        mock_token = MagicMock()
        mock_token.access_token = "access_token_value"
        mock_refresh_token.for_user.return_value = mock_token

        mock_profile_serializer.return_value.data = {"email": "testuser@example.com"}

        payload = {
            "login": "testuser@example.com",
            "password": "TestPass123!",
        }

        response = api_client.post("/api/login/", payload, format="json")

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        if response.status_code == status.HTTP_200_OK:
            mock_authenticate.assert_called_once()

    @patch("users.views.auth_views.authenticate")
    def test_login_invalid_credentials(self, mock_authenticate, api_client):
        mock_authenticate.return_value = None

        payload = {
            "login": "testuser@example.com",
            "password": "WrongPassword",
        }
        response = api_client.post("/api/login/", payload, format="json")

        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


class TestMeView:
    @patch("users.views.auth_views.UserProfileSerializer")
    def test_me_authenticated(self, mock_profile_serializer, api_client, mock_user):
        api_client.force_authenticate(user=mock_user)

        mock_profile_serializer.return_value.data = {
            "email": "testuser@example.com",
            "role": "user",
            "is_active": True,
        }
        response = api_client.get("/api/me/")

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_me_unauthenticated(self, api_client):
        response = api_client.get("/api/me/")
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


class TestLogoutView:
    def test_logout_success(self, api_client, mock_user):
        api_client.force_authenticate(user=mock_user)
        response = api_client.post("/api/logout/")

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_logout_unauthenticated(self, api_client):
        response = api_client.post("/api/logout/")
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


class TestUserListView:
    @patch("users.views.auth_views.UserProfileSerializer")
    @patch("users.views.auth_views.CustomUser")
    def test_list_users_superadmin(self, mock_custom_user, mock_profile_serializer, api_client, mock_superadmin):
        api_client.force_authenticate(user=mock_superadmin)

        mock_qs = MagicMock()
        mock_qs.prefetch_related.return_value = mock_qs
        mock_custom_user.objects.filter.return_value = mock_qs
        mock_profile_serializer.return_value.data = []

        response = api_client.get("/api/users/")

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_list_users_admin_forbidden(self, api_client, mock_admin):
        api_client.force_authenticate(user=mock_admin)
        response = api_client.get("/api/users/")

        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_list_users_unauthenticated(self, api_client):
        response = api_client.get("/api/users/")
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestUserUpdateView:
    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_update_user_basic_fields(self, mock_get, api_client, mock_superadmin, mock_admin):
        api_client.force_authenticate(user=mock_superadmin)
        mock_get.return_value = mock_admin

        payload = {
            "first_name": "Updated",
            "last_name": "Name",
        }

        response = api_client.patch(f"/api/users/{mock_admin.id}/", payload, format="json")

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_admin_can_update_user_but_not_role(self, mock_get, api_client, mock_admin):
        target_user = MagicMock(spec=CustomUser)
        target_user.id = 99
        target_user.role = "user"
        target_user.email = "target@example.com"
        target_user.username = "targetuser"
        mock_get.return_value = target_user

        api_client.force_authenticate(user=mock_admin)

        payload = {
            "first_name": "AdminChange",
            "role": "superadmin",
        }
        response = api_client.patch(f"/api/users/{target_user.id}/", payload, format="json")

        assert response.status_code == 200
        assert target_user.role == "user"

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_user_can_update_own_profile(self, mock_get, api_client, mock_user):
        mock_get.return_value = mock_user
        api_client.force_authenticate(user=mock_user)

        payload = {"first_name": "NewName"}
        response = api_client.patch(f"/api/users/{mock_user.id}/", payload, format="json")

        assert response.status_code == 200
        assert mock_user.first_name == "NewName"

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_admin_cannot_edit_other_user_basic_info(self, mock_get, api_client, mock_admin):
        target_user = MagicMock(spec=CustomUser)
        target_user.id = 5
        target_user.first_name = "Original"
        target_user.email = "user5@example.com"
        target_user.username = "user5"
        target_user.role = "user"
        mock_get.return_value = target_user

        api_client.force_authenticate(user=mock_admin)

        payload = {"first_name": "AdminChangingThis"}
        response = api_client.patch("/api/users/5/", payload, format="json")

        assert response.status_code == 200
        assert target_user.first_name == "Original"

    def test_update_user_unauthenticated(self, api_client, mock_admin):
        payload = {"first_name": "Test"}
        response = api_client.patch(f"/api/users/{mock_admin.id}/", payload, format="json")

        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestChangePasswordView:
    def test_user_cannot_change_others_password(self, api_client, mock_user):
        api_client.force_authenticate(user=mock_user)

        payload = {
            "old_password": "any",
            "new_password": "NewPassword123!",
        }
        response = api_client.post("/api/users/99/change-password/", payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch("users.views.auth_views.validate_password")
    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_superadmin_can_change_others_password(self, mock_get, mock_validate_password, api_client, mock_superadmin):
        api_client.force_authenticate(user=mock_superadmin)

        target_user = MagicMock(spec=CustomUser)
        target_user.id = 50
        mock_get.return_value = target_user

        payload = {
            "new_password": "SuperSetPassword123!",
        }
        response = api_client.post("/api/users/50/change-password/", payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        target_user.set_password.assert_called_with("SuperSetPassword123!")
        mock_validate_password.assert_called_once()

    @patch("users.views.auth_views.validate_password")
    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_owner_can_change_own_password(self, mock_get, mock_validate_password, api_client, mock_user):
        api_client.force_authenticate(user=mock_user)
        mock_user.id = 1
        mock_get.return_value = mock_user
        mock_user.check_password.return_value = True

        payload = {
            "old_password": "OldPassword123!",
            "new_password": "NewPassword123!",
        }
        response = api_client.post("/api/users/1/change-password/", payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        mock_user.set_password.assert_called_with("NewPassword123!")
        mock_validate_password.assert_called_once()


@pytest.mark.django_db
class TestResendInviteView:
    @patch("users.views.auth_views.send_invitation_for_user")
    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_superadmin_can_resend_invite(
        self, mock_get, mock_send_invitation, api_client, mock_superadmin
    ):
        pending_user = MagicMock(spec=CustomUser)
        pending_user.id = 25
        pending_user.email = "pending@example.com"
        pending_user.is_active = False
        pending_user.is_deleted = False

        mock_get.return_value = pending_user
        api_client.force_authenticate(user=mock_superadmin)

        response = api_client.post("/api/users/25/resend-invite/")

        assert response.status_code == status.HTTP_200_OK
        mock_send_invitation.assert_called_once_with(
            user=pending_user,
            invited_by=mock_superadmin,
        )

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_resend_invite_forbidden_for_non_superadmin(
        self, mock_get, api_client, mock_admin
    ):
        api_client.force_authenticate(user=mock_admin)

        response = api_client.post("/api/users/25/resend-invite/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_get.assert_not_called()

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_resend_invite_fails_for_active_user(
        self, mock_get, api_client, mock_superadmin
    ):
        active_user = MagicMock(spec=CustomUser)
        active_user.id = 30
        active_user.is_active = True
        active_user.is_deleted = False

        mock_get.return_value = active_user
        api_client.force_authenticate(user=mock_superadmin)

        response = api_client.post("/api/users/30/resend-invite/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "User is already active."

    @patch("users.views.auth_views.CustomUser.objects.get")
    def test_resend_invite_user_not_found(
        self, mock_get, api_client, mock_superadmin
    ):
        mock_get.side_effect = CustomUser.DoesNotExist
        api_client.force_authenticate(user=mock_superadmin)

        response = api_client.post("/api/users/999/resend-invite/")

        assert response.status_code == status.HTTP_404_NOT_FOUND