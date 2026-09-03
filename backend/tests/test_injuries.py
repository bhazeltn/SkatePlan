"""Injury tracking tests (Sprint 5) — SafeSport-gated medical data."""
from datetime import date

from app.models.enums import RoleInUnit, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _skater_with_coach(client, make_user, db, s_email, c_email):
    skater = make_user(s_email, role=SystemRole.athlete)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=date(2000, 1, 1)))
    coach = make_user(c_email, password="Coach123!", role=SystemRole.coach)
    unit = TrainingUnit(unit_name="Unit", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(CoachAssignment(coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
                           role_in_unit=RoleInUnit.primary))
    db.commit()
    return skater, coach


def _injury_payload(skater_id, **over):
    base = {"skater_id": skater_id, "title": "Ankle sprain", "body_part": "ankle",
            "onset_date": "2026-01-10", "status": "active",
            "restrictions": "No jumps for 3 weeks"}
    base.update(over)
    return base


def test_coach_creates_injury(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "injs@ex.com", "injc@ex.com")
    token = _login(client, "injc@ex.com", "Coach123!")
    resp = client.post("/api/injuries", headers=_hdr(token), json=_injury_payload(skater.id))
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["skater_id"] == skater.id
    assert body["status"] == "active"
    assert body["body_part"] == "ankle"


def test_update_injury_status_and_clearance(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "injs2@ex.com", "injc2@ex.com")
    token = _login(client, "injc2@ex.com", "Coach123!")
    created = client.post("/api/injuries", headers=_hdr(token),
                          json=_injury_payload(skater.id)).json()
    resp = client.put(f"/api/injuries/{created['id']}", headers=_hdr(token),
                      json={"status": "cleared", "clearance_date": "2026-02-01"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "cleared"
    assert body["clearance_date"] == "2026-02-01"


def test_list_active_injuries(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "injs3@ex.com", "injc3@ex.com")
    token = _login(client, "injc3@ex.com", "Coach123!")
    client.post("/api/injuries", headers=_hdr(token),
                json=_injury_payload(skater.id, title="A", status="active"))
    client.post("/api/injuries", headers=_hdr(token),
                json=_injury_payload(skater.id, title="B", status="cleared"))
    resp = client.get(f"/api/skaters/{skater.id}/injuries?status=active", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    assert {i["title"] for i in resp.json()} == {"A"}


def test_unauthorized_injury_access_403(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "injs4@ex.com", "injc4@ex.com")
    make_user("intruder5@ex.com", role=SystemRole.athlete)
    token = _login(client, "intruder5@ex.com", "Secret123!")
    resp = client.get(f"/api/skaters/{skater.id}/injuries", headers=_hdr(token))
    assert resp.status_code == 403, resp.text
