"""Training analytics: deterministic workload + attempt success stats (Sprint 4)."""
from app.models.enums import SystemRole


def _login(client, email, password="Secret123!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _mk_session(client, token, skater_id, duration, rpe, day):
    resp = client.post("/api/sessions", headers=_hdr(token),
                       json={"skater_id": skater_id, "session_date": day,
                             "session_type": "on_ice", "duration_minutes": duration, "rpe": rpe})
    return resp.json()["id"]


def test_workload_and_success_metrics(client, make_user, db):
    skater = make_user("metricskater@ex.com", role=SystemRole.athlete)
    make_user("metricadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "metricadmin@ex.com")

    s1 = _mk_session(client, token, skater.id, 60, 7, "2026-01-05")  # load 420
    s2 = _mk_session(client, token, skater.id, 90, 8, "2026-01-20")  # load 720
    _mk_session(client, token, skater.id, 120, 9, "2026-03-01")  # out of range -> excluded

    client.post(f"/api/sessions/{s1}/attempts", headers=_hdr(token),
                json=[{"element_code": "3Lz", "outcome": "clean", "attempts_count": 3},
                      {"element_code": "3Lz", "outcome": "fall", "attempts_count": 1}])
    client.post(f"/api/sessions/{s2}/attempts", headers=_hdr(token),
                json=[{"element_code": "3Lz", "outcome": "step_out", "attempts_count": 1},
                      {"element_code": "2A", "outcome": "clean", "attempts_count": 2}])

    resp = client.get(
        f"/api/skaters/{skater.id}/training/metrics?start_date=2026-01-01&end_date=2026-01-31",
        headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_ice_minutes"] == 150
    assert body["session_count"] == 2
    assert body["workload_index"] == 1140  # 420 + 720
    assert body["average_rpe"] == 7.5

    stats = {e["element_code"]: e for e in body["element_stats"]}
    lz = stats["3Lz"]
    assert lz["total_attempts"] == 5   # 3 + 1 + 1
    assert lz["clean_count"] == 3
    assert lz["clean_percentage"] == 60.0
    twoa = stats["2A"]
    assert twoa["total_attempts"] == 2
    assert twoa["clean_count"] == 2
    assert twoa["clean_percentage"] == 100.0
