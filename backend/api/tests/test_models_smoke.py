import pytest
from api.models import Federation, Organization

@pytest.mark.django_db
def test_create_federation():
    """Test creating a Federation and checking its string representation."""
    fed = Federation.objects.create(name="Test Federation", code="TF")
    assert str(fed) == "Test Federation"
    assert fed.support_tier == "BASIC"  # Check default

@pytest.mark.django_db
def test_create_organization():
    """Test creating an Organization and checking its defaults."""
    org = Organization.objects.create(
        name="Test Club",
        organization_type="CLUB",
        billing_email="billing@testclub.com"
    )
    assert str(org) == "Test Club"
    assert org.subscription_tier == "FREE"  # Check default
    assert org.is_active is True
