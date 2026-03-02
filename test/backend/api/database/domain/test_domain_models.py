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
    creator1 = User.objects.create_user(
        username="creator1",
        email="creator1@example.com",
        password="pass1234",
        role="admin",
    )
    creator2 = User.objects.create_user(
        username="creator2",
        email="creator2@example.com",
        password="pass5678",
        role="admin",
    )

    domain1 = Domain.objects.create(domain_name="Epsilon", description="desc")
    domain2 = Domain.objects.create(domain_name="Lambda", description="desc")

    domain1.creators.add(creator1)
    domain1.creators.add(creator2)
    domain1.save()

    domain2.creators.add(creator1)
    domain2.creators.add(creator2)
    domain2.save()

    assert domain1.creators.filter(id=creator1.id).exists()
    assert domain1.creators.filter(id=creator2.id).exists()
    assert domain2.creators.filter(id=creator1.id).exists()
    assert domain2.creators.filter(id=creator2.id).exists()

