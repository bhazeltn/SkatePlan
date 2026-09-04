"""GET /api/sov/elements — Singles Scale of Values reference for the builder."""
from app.models.enums import SystemRole
from app.seeds.seed_sov import seed_scale_of_values


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def test_sov_elements_requires_auth(client):
    assert client.get("/api/sov/elements").status_code == 401


def test_sov_elements_returns_seeded_singles(client, make_user):
    seed_scale_of_values()
    make_user("sovc@ex.com", password="Coach123!", role=SystemRole.coach)
    token = _login(client, "sovc@ex.com", "Coach123!")
    resp = client.get("/api/sov/elements", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body) == 402
    codes = {row["element_code"] for row in body}
    assert "3Lz" in codes
    lutz = next(row for row in body if row["element_code"] == "3Lz")
    assert float(lutz["base_value"]) == 5.9
    assert lutz["element_name"]
