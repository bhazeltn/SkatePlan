"""Coach meeting / touchpoint tracking tests (Sprint 5)."""
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


def _meeting_payload(skater_id, **over):
    base = {"skater_id": skater_id, "meeting_datetime": "2026-01-15T14:00:00",
            "category": "season_planning", "content_overview": "Plan the season"}
    base.update(over)
    return base


def test_coach_creates_meeting(client, make_user, db):
    skater, coach = _skater_with_coach(client, make_user, db, "ms@ex.com", "mc@ex.com")
    token = _login(client, "mc@ex.com", "Coach123!")
    resp = client.post("/api/meetings", headers=_hdr(token), json=_meeting_payload(skater.id))
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["skater_id"] == skater.id
    assert body["coach_id"] == coach.id
    assert body["category"] == "season_planning"


def test_update_meeting_notes_and_actions(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "ms2@ex.com", "mc2@ex.com")
    token = _login(client, "mc2@ex.com", "Coach123!")
    created = client.post("/api/meetings", headers=_hdr(token),
                          json=_meeting_payload(skater.id)).json()
    resp = client.put(f"/api/meetings/{created['id']}", headers=_hdr(token),
                      json={"meeting_notes": "Discussed axel timing",
                            "action_items": "Daily off-ice jumps", "status": "completed"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["meeting_notes"] == "Discussed axel timing"
    assert body["action_items"] == "Daily off-ice jumps"
    assert body["status"] == "completed"


def test_list_meetings_with_filters(client, make_user, db):
    skater, _ = _skater_with_coach(client, make_user, db, "ms3@ex.com", "mc3@ex.com")
    token = _login(client, "mc3@ex.com", "Coach123!")
    client.post("/api/meetings", headers=_hdr(token),
                json=_meeting_payload(skater.id, status="scheduled",
                                      meeting_datetime="2026-01-15T10:00:00"))
    client.post("/api/meetings", headers=_hdr(token),
                json=_meeting_payload(skater.id, category="progress_check", status="completed",
                                      meeting_datetime="2026-02-15T10:00:00"))

    by_status = client.get(f"/api/skaters/{skater.id}/meetings?status=completed", headers=_hdr(token))
    assert by_status.status_code == 200, by_status.text
    assert {m["category"] for m in by_status.json()} == {"progress_check"}

    by_range = client.get(
        f"/api/skaters/{skater.id}/meetings?start_date=2026-01-01&end_date=2026-01-31",
        headers=_hdr(token))
    assert by_range.status_code == 200, by_range.text
    assert len(by_range.json()) == 1
    assert by_range.json()[0]["category"] == "season_planning"
