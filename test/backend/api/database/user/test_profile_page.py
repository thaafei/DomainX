from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from ..models import CustomUser
from api.database.domain.models import Domain

class SpecificFeatureTests(APITestCase):

    def setUp(self):
        # Create test domains
        self.domain = Domain.objects.create(domain_name="Cyber Security")
        self.new_domain = Domain.objects.create(domain_name="Cloud Computing")
        
        # Superadmin
        self.superadmin = CustomUser.objects.create_superuser(
            username='boss', email='admin@test.com', password='Password123!', role='superadmin'
        )
        
        # Admin
        self.admin_user = CustomUser.objects.create_user(
            username='staff_admin', email='staff@test.com', password='Password123!', role='admin'
        )
        
        # Regular User
        self.user = CustomUser.objects.create_user(
            username='ghena', email='ghena@test.com', password='OldPassword123!', role='user'
        )

    # --- 1. UserUpdateView: Self-Editing Logic ---
    def test_regular_user_can_update_own_info(self):
        """Verify a user can change their own name but NOT their role."""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-update', kwargs={'user_id': self.user.id})
        data = {
            "first_name": "NewName",
            "role": "superadmin"
        }
        response = self.client.patch(url, data, format='json')
        
        self.user.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.first_name, "NewName")
        self.assertEqual(self.user.role, "user") # Role should remain 'user'

    # --- 2. UserUpdateView: Admin Domain Management ---
    def test_admin_can_manage_domains(self):
        """Verify an Admin can change domains but NOT roles."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-update', kwargs={'user_id': self.admin_user.id})
        data = {
            "domain_ids": [str(self.new_domain.domain_ID)],
            "role": "superadmin"
        }
        response = self.client.patch(url, data, format='json')
        
        self.admin_user.refresh_from_db()
        self.assertEqual(self.admin_user.created_domains.count(), 1)
        self.assertEqual(self.admin_user.role, "admin") # Role change ignored

    # --- 3. UserUpdateView: Superadmin Full Control ---
    def test_superadmin_can_change_anything(self):
        """Verify superadmin can change the role of another user."""
        self.client.force_authenticate(user=self.superadmin)
        url = reverse('user-update', kwargs={'user_id': self.user.id})
        data = {"role": "admin"}
        response = self.client.patch(url, data, format='json')
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "admin")

    # --- 4. Security: Cross-User Editing ---
    def test_user_cannot_update_others(self):
        """Verify a regular user cannot edit another user's profile."""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-update', kwargs={'user_id': self.admin_user.id})
        response = self.client.patch(url, {"first_name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- 5. UserDomainListView Tests ---
    def test_get_domains_as_admin_role(self):
        self.admin_user.created_domains.add(self.domain)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-domains', kwargs={'user_id': self.admin_user.id})
        response = self.client.get(url)
        self.assertEqual(len(response.data), 1)

    # --- 6. ChangePasswordView Tests ---
    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('change-password', kwargs={'user_id': self.user.id})
        data = {"old_password": "OldPassword123!", "new_password": "NewSecurePassword123!"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)