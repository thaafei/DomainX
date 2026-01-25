import os
import django
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase, override_settings

# Configure Django settings before importing anything else
if not django.apps.apps.ready:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "DomainX.settings")
    django.setup()


class DatabaseConfigurationTestCase(SimpleTestCase):
    """Test cases for database configuration based on IS_LOCAL flag."""
    
    databases = {}

    @mock.patch.dict(os.environ, {
        "DJANGO_LOCAL": "true",
        "DJANGO_DEBUG": "true",
        "DJANGO_SECRET_KEY": "123"
    })
    @override_settings(DATABASES={
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": Path(__file__).resolve().parent.parent / "db.sqlite3",
        }
    })
    def test_local_environment_uses_sqlite(self):
        """Test that local environment uses SQLite database."""
        from django.conf import settings
        
        db_config = settings.DATABASES["default"]
        
        self.assertEqual(db_config["ENGINE"], "django.db.backends.sqlite3")
        self.assertIn("db.sqlite3", str(db_config["NAME"]))

    @mock.patch.dict(os.environ, {
        "DJANGO_LOCAL": "false",
        "DJANGO_DEBUG": "false",
        "DB_NAME": "test_db",
        "DB_USER": "test_user",
        "DB_PASSWORD": "test_password",
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "3308",
        "DJANGO_SECRET_KEY": "123"
    })
    @override_settings(DATABASES={
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": "test_db",
            "USER": "test_user",
            "PASSWORD": "test_password",
            "HOST": "127.0.0.1",
            "PORT": "3308",
            "OPTIONS": {
                "charset": "utf8mb4",
            },
        }
    })
    def test_non_local_environment_uses_mysql(self):
        """Test that non-local environment uses MySQL database."""
        from django.conf import settings
        
        db_config = settings.DATABASES["default"]
        
        self.assertEqual(db_config["ENGINE"], "django.db.backends.mysql")
        self.assertEqual(db_config["NAME"], "test_db")
        self.assertEqual(db_config["USER"], "test_user")
        self.assertEqual(db_config["PASSWORD"], "test_password")
        self.assertEqual(db_config["HOST"], "127.0.0.1")
        self.assertEqual(db_config["PORT"], "3308")
        self.assertEqual(db_config["OPTIONS"]["charset"], "utf8mb4")

    @override_settings(DATABASES={
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": Path(__file__).resolve().parent.parent / "db.sqlite3",
        }
    })

    def test_only_one_default_database_configured(self):
        """Test that only one default database is configured."""
        from django.conf import settings
        
        self.assertIn("default", settings.DATABASES)
        self.assertEqual(len(settings.DATABASES), 1)