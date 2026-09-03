"""Auth login tests (Sprint 0 + Sprint 1 claim assertions)."""
from app.core.security import decode_access_token
from app.models.enums import SystemRole


def test_login_success_returns_token(client, make_user):
    make_user("coach@example.com", password="Coach123!", role=SystemRole.coach)
    resp = client.post(
        "/api/auth/login",
        json={"email": "coach@example.com", "password": "Coach123!"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["role"] == "coach"


def test_login_token_claims_contain_user_id_and_system_role(client, make_user):
    user = make_user("coach9@example.com", password="Coach123!", role=SystemRole.coach)
    resp = client.post(
        "/api/auth/login",
        json={"email": "coach9@example.com", "password": "Coach123!"},
    )
    assert resp.status_code == 200, resp.text
    claims = decode_access_token(resp.json()["access_token"])
    assert claims["user_id"] == user.id
    assert claims["system_role"] == "coach"


def test_login_invalid_credentials_returns_401(client, make_user):
    make_user("coach2@example.com", password="Coach123!", role=SystemRole.coach)
    resp = client.post(
        "/api/auth/login",
        json={"email": "coach2@example.com", "password": "WRONG"},
    )
    assert resp.status_code == 401


def test_login_unknown_user_returns_401(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert resp.status_code == 401
