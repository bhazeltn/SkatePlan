import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user_factory(db):
    def create_user(**kwargs):
        email = kwargs.pop("email", "test@example.com")
        password = kwargs.pop("password", "password123")
        return User.objects.create_user(email=email, password=password, **kwargs)
    return create_user
