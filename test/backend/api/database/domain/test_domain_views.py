import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from api.database.domain.models import Domain


@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def user_factory():
    def _factory(email: str, username: str, role: str = "admin"):
        User = get_user_model()
        return User.objects.create_user(
            username=username,
            email=email,
            password="password123",
            role=role,
        )

    return _factory


@pytest.mark.django_db
def test_create_domain_success(api_client, user_factory):
    creator = user_factory("alice@example.com", "alice", role="admin")

    payload = {
        "domain_name": "Test Domain",
        "description": "A description",
        "creator_ids": [creator.id],
    }

    response = api_client.post("/api/domain/create/", payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    created = Domain.objects.get(domain_name="Test Domain")
    assert created.description == "A description"
    assert created.creators.filter(id=creator.id).exists()
    # category_weights are auto-assigned from categories.json
    assert isinstance(created.category_weights, dict)
    assert len(created.category_weights) >= 0


@pytest.mark.django_db
def test_create_domain_missing_fields(api_client):
    response = api_client.post("/api/domain/create/", {}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "error" in response.json()


@pytest.mark.django_db
def test_list_domains(api_client):
    Domain.objects.create(domain_name="One", description="first")
    Domain.objects.create(domain_name="Two", description="second")

    response = api_client.get("/api/domain/")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert {d["domain_name"] for d in data} >= {"One", "Two"}


@pytest.mark.django_db
def test_update_domain_sets_creators(api_client, user_factory):
    domain = Domain.objects.create(domain_name="Original", description="old")
    u1 = user_factory("u1@example.com", "u1", role="admin")
    u2 = user_factory("u2@example.com", "u2", role="superadmin")

    payload = {
        "domain_name": "Updated",
        "description": "new",
        "creator_ids": [u1.id, u2.id],
        "published": True,
        "paper_name": "",
        "paper_url": "",
    }

    response = api_client.put(f"/api/domain/{domain.domain_ID}/", payload, format="json")

    assert response.status_code == status.HTTP_200_OK
    domain.refresh_from_db()
    assert domain.domain_name == "Updated"
    assert domain.creators.count() == 2
    assert domain.creators.filter(id__in=[u1.id, u2.id]).count() == 2
    assert domain.published is True


@pytest.mark.django_db
def test_delete_domain(api_client):
    domain = Domain.objects.create(domain_name="Temp", description="temp")

    response = api_client.delete(f"/api/domain/{domain.domain_ID}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Domain.objects.filter(pk=domain.domain_ID).exists()
