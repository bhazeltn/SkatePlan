"""Attempt/jump logging tests — single and batch (Sprint 4)."""
from app.models.enums import SystemRole


def _login(client, email, password="Secret123!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _make_session(client, token, skater_id):
    resp = client.post("/api/sessions", headers=_hdr(token),
                       json={"skater_id": skater_id, "session_date": "2026-01-15",
                             "session_type": "on_ice", "duration_minutes": 60, "rpe": 6})
    return resp.json()["id"]


def test_log_single_and_batch_attempts(client, make_user, db):
    skater = make_user("attskater@ex.com", role=SystemRole.athlete)
    make_user("attadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "attadmin@ex.com")
    session_id = _make_session(client, token, skater.id)

    single = client.post(f"/api/sessions/{session_id}/attempts", headers=_hdr(token),
                         json={"element_code": "3Lz", "outcome": "clean", "attempts_count": 1})
    assert single.status_code in (200, 201), single.text
    assert len(single.json()) == 1
    assert single.json()[0]["element_code"] == "3Lz"

    batch = client.post(f"/api/sessions/{session_id}/attempts", headers=_hdr(token),
                        json=[{"element_code": "2A", "outcome": "fall", "attempts_count": 2},
                              {"element_code": "3F", "outcome": "step_out", "attempts_count": 1}])
    assert batch.status_code in (200, 201), batch.text
    assert len(batch.json()) == 2

    listed = client.get(f"/api/sessions/{session_id}/attempts", headers=_hdr(token))
    assert listed.status_code == 200, listed.text
    assert {a["element_code"] for a in listed.json()} == {"3Lz", "2A", "3F"}
