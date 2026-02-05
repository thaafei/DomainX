import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from api.database.domain.models import Domain


@pytest.mark.django_db
def test_domain_str_returns_name():
    domain = Domain.objects.create(domain_name="Alpha", description="desc")
    assert str(domain) == "Alpha"


@pytest.mark.django_db
def test_get_domain_ID_returns_string_uuid():
    domain = Domain.objects.create(domain_name="Beta", description="desc")
    domain_id_str = domain.get_domain_ID()
    assert isinstance(domain_id_str, str)
    assert uuid.UUID(domain_id_str) == domain.domain_ID


@pytest.mark.django_db
def test_defaults_and_blank_fields():
    domain = Domain.objects.create(domain_name="Gamma", description="")
    assert domain.published is False
    assert domain.paper_name is None
    assert domain.paper_url == ""
    assert domain.category_weights == {}
    assert isinstance(domain.category_weights, dict)


@pytest.mark.django_db
def test_unique_domain_name_constraint():
    Domain.objects.create(domain_name="Delta", description="one")
    with pytest.raises(IntegrityError):
        Domain.objects.create(domain_name="Delta", description="two")


@pytest.mark.django_db
def test_creators_many_to_many_assignment():
    User = get_user_model()
    creator = User.objects.create_user(
        username="creator1",
        email="creator1@example.com",
        password="pass1234",
        role="admin",
    )
    domain = Domain.objects.create(domain_name="Epsilon", description="desc")

    domain.creators.add(creator)
    domain.save()

    assert domain.creators.filter(id=creator.id).exists()
