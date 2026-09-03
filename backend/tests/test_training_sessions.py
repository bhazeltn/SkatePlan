"""Training session CRUD + SafeSport authorization tests (Sprint 4)."""
from datetime import date

from app.models.enums import RoleInUnit, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _make_skater(make_user, db, email, dob=date(2000, 1, 1)):
    skater = make_user(email, role=SystemRole.athlete)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=dob))
    db.commit()
    return skater


def _assign_coach(make_user, db, coach_email, skater):
    coach = make_user(coach_email, password="Coach123!", role=SystemRole.coach)
    unit = TrainingUnit(unit_name="Unit A", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(CoachAssignment(coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
                           role_in_unit=RoleInUnit.primary))
    db.commit()
    return coach


def _session_payload(skater_id, **over):
    base = {"skater_id": skater_id, "session_date": "2026-01-15",
            "session_type": "on_ice", "duration_minutes": 60, "rpe": 7}
    base.update(over)
    return base


def test_assigned_coach_creates_session(client, make_user, db):
    skater = _make_skater(make_user, db, "s1@ex.com")
    _assign_coach(make_user, db, "c1@ex.com", skater)
    token = _login(client, "c1@ex.com", "Coach123!")
    resp = client.post("/api/sessions", headers=_hdr(token), json=_session_payload(skater.id))
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["skater_id"] == skater.id
    assert body["session_type"] == "on_ice"
    assert body["rpe"] == 7


def test_tier3_athlete_creates_own_session(client, make_user, db):
    skater = make_user("adultskater@ex.com", role=SystemRole.athlete)  # no profile => tier3
    token = _login(client, "adultskater@ex.com", "Secret123!")
    resp = client.post("/api/sessions", headers=_hdr(token),
                       json=_session_payload(skater.id, session_type="off_ice"))
    assert resp.status_code in (200, 201), resp.text
    assert resp.json()["session_type"] == "off_ice"


def test_invalid_rpe_returns_422(client, make_user, db):
    skater = make_user("rpeskater@ex.com", role=SystemRole.athlete)
    token = _login(client, "rpeskater@ex.com", "Secret123!")
    for bad in (0, 11):
        resp = client.post("/api/sessions", headers=_hdr(token),
                           json=_session_payload(skater.id, rpe=bad))
        assert resp.status_code == 422, resp.text


def test_list_sessions_with_filters(client, make_user, db):
    skater = make_user("filterskater@ex.com", role=SystemRole.athlete)
    make_user("admin1@ex.com", role=SystemRole.admin)
    token = _login(client, "admin1@ex.com", "Secret123!")
    client.post("/api/sessions", headers=_hdr(token),
                json=_session_payload(skater.id, session_type="on_ice", session_date="2026-01-10"))
    client.post("/api/sessions", headers=_hdr(token),
                json=_session_payload(skater.id, session_type="off_ice", session_date="2026-02-10"))
    client.post("/api/sessions", headers=_hdr(token),
                json=_session_payload(skater.id, session_type="on_ice", session_date="2026-03-10"))

    by_type = client.get(f"/api/skaters/{skater.id}/sessions?session_type=off_ice", headers=_hdr(token))
    assert by_type.status_code == 200, by_type.text
    assert {s["session_type"] for s in by_type.json()} == {"off_ice"}

    by_range = client.get(
        f"/api/skaters/{skater.id}/sessions?start_date=2026-01-01&end_date=2026-01-31",
        headers=_hdr(token))
    assert by_range.status_code == 200
    assert {s["session_date"] for s in by_range.json()} == {"2026-01-10"}


def test_unauthorized_skater_sessions_403(client, make_user, db):
    owner = make_user("owner@ex.com", role=SystemRole.athlete)
    make_user("intruder@ex.com", role=SystemRole.athlete)
    token = _login(client, "intruder@ex.com", "Secret123!")
    resp = client.get(f"/api/skaters/{owner.id}/sessions", headers=_hdr(token))
    assert resp.status_code == 403, resp.text
