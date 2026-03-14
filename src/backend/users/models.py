from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
import secrets
import hashlib
from datetime import timedelta
from django.conf import settings
from django.utils import timezone

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('admin', 'Admin'),
        ('superadmin', 'Superadmin'),
    )

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    is_deleted = models.BooleanField(default=False)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        if self.username:
            self.username = self.username.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    def get_full_name(self) -> str | None:
        if self.first_name and self.last_name:
            return str(self.first_name + " " + self.last_name)
        return None


class UserInvite(models.Model):
    invite_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="invites"
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invites"
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_used(self):
        return self.used_at is not None

    @classmethod
    def create_for_user(cls, user, invited_by=None, hours_valid=24):
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        invite = cls.objects.create(
            user=user,
            invited_by=invited_by,
            token_hash=token_hash,
            expires_at=timezone.now() + timedelta(hours=hours_valid),
        )
        return invite, raw_token