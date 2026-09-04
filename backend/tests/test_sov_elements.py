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


def test_get_sov_elements_planned_only_filters_calls(client, make_user):
    seed_scale_of_values()
    make_user("sovp@ex.com", password="Coach123!", role=SystemRole.coach)
    token = _login(client, "sovp@ex.com", "Coach123!")
    resp = client.get("/api/sov/elements?planned_only=true", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    codes = {row["element_code"] for row in resp.json()}
    # Unambiguous execution-flag characters must never appear in the catalog.
    for code in codes:
        for flag in ("<", ">", "!", "*"):
            assert flag not in code, f"flagged variant leaked into planned catalog: {code}"
    # Specific quarter/edge jump variants must be excluded.
    for variant in ("2Aq", "3Lzq", "3Fe", "3Lz<", "3Lz<<", "3F!", "3Feq", "3Aqb"):
        assert variant not in codes, f"flagged variant leaked into planned catalog: {variant}"
    # Clean base elements — including step/choreo sequences — must remain.
    for base in ("2A", "3Lz", "CCoSp4", "StSq3", "ChSq1"):
        assert base in codes, f"clean base element missing from planned catalog: {base}"
