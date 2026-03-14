import os
import django
import pytest

@pytest.fixture(scope="session", autouse=True)
def django_test_setup():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "DomainX.settings")
    os.environ.setdefault("SECRET_KEY", "test-secret-key")
    os.environ.setdefault("DEBUG", "True")
    os.environ.setdefault("DB_NAME", "test_db")
    os.environ.setdefault("DB_USER", "test_user")
    os.environ.setdefault("DB_PASSWORD", "test_password")

    django.setup()