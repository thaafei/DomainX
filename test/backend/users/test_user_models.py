import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError


@pytest.mark.django_db
def test_str_returns_email():
    User = get_user_model()
    user = User.objects.create_user(
        username="alice",
        email="alice@example.com",
        password="pass1234",
        role="admin",
    )
    assert str(user) == "alice@example.com"


@pytest.mark.django_db
def test_get_full_name_returns_none_if_missing_parts():
    User = get_user_model()
    user = User.objects.create_user(
        username="bob",
        email="bob@example.com",
        password="pass1234",
    )
    assert user.get_full_name() is None


@pytest.mark.django_db
def test_get_full_name_concatenates_first_and_last():
    User = get_user_model()
    user = User.objects.create_user(
        username="carol",
        email="carol@example.com",
        password="pass1234",
        first_name="Carol",
        last_name="Danvers",
    )
    assert user.get_full_name() == "Carol Danvers"


@pytest.mark.django_db
def test_role_default_is_user():
    User = get_user_model()
    user = User.objects.create_user(
        username="dave",
        email="dave@example.com",
        password="pass1234",
    )
    assert user.role == "user"


@pytest.mark.django_db
def test_email_unique_constraint():
    User = get_user_model()
    User.objects.create_user(
        username="eve",
        email="eve@example.com",
        password="pass1234",
    )
    with pytest.raises(IntegrityError):
        User.objects.create_user(
          username="eve2",
          email="eve@example.com",
          password="pass1234",
        )
