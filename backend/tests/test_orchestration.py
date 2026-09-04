"""Atomic skater onboarding (orchestrate) tests."""
from sqlalchemy import func, select

from app.models.enums import SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User


def _counts(db):
    return {
        "users": db.scalar(select(func.count()).select_from(User)),
        "profiles": db.scalar(select(func.count()).select_from(SkaterProfile)),
        "units": db.scalar(select(func.count()).select_from(TrainingUnit)),
        "roster": db.scalar(select(func.count()).select_from(TrainingUnitRoster)),
        "assignments": db.scalar(select(func.count()).select_from(CoachAssignment)),
    }


def test_orchestrate_success_persists_all(client, make_user, db):
    coach = make_user("coach@ex.com", role=SystemRole.coach)
    resp = client.post(
        "/api/skaters/orchestrate",
        json={
            "email": "newskater@ex.com",
            "password": "Skater123!",
            "first_name": "New",
            "last_name": "Skater",
            "date_of_birth": "2005-05-01",
            "home_club": "Central Ice",
            "unit_name": "Elite Singles A",
            "coach_user_id": coach.id,
            "role_in_unit": "primary",
        },
    )
    assert resp.status_code == 201, resp.text
    c = _counts(db)
    assert c["profiles"] == 1 and c["units"] == 1
    assert c["roster"] == 1 and c["assignments"] == 1

    assignment = db.scalar(select(CoachAssignment))
    assert assignment.role_in_unit.value == "primary"


def test_orchestrate_persists_competitive_level_without_unit_name(client, make_user, db):
    """unit_name is optional; competitive_level and home_club must persist."""
    coach = make_user("coach2@ex.com", role=SystemRole.coach)
    resp = client.post(
        "/api/skaters/orchestrate",
        json={
            "email": "levelskater@ex.com",
            "password": "Skater123!",
            "first_name": "Level",
            "last_name": "Skater",
            "date_of_birth": "2000-01-01",
            "home_club": "Ice Palace",
            "competitive_level": "Senior",
            "coach_user_id": coach.id,
        },
    )
    assert resp.status_code == 201, resp.text
    profile = db.scalar(select(SkaterProfile))
    assert profile.competitive_level == "Senior"
    assert profile.home_club == "Ice Palace"
    unit = db.scalar(select(TrainingUnit))
    assert unit.unit_name == "Ice Palace"  # derived from home_club


def test_orchestrate_rollback_on_bad_coach(client, db):
    """Invalid coach FK must roll back everything — zero orphaned rows."""
    resp = client.post(
        "/api/skaters/orchestrate",
        json={
            "email": "skater2@ex.com",
            "password": "Skater123!",
            "date_of_birth": "2005-05-01",
            "home_club": "Central Ice",
            "unit_name": "Ghost Unit",
            "coach_user_id": 999999,  # does not exist
            "role_in_unit": "primary",
        },
    )
    assert resp.status_code == 400, resp.text
    c = _counts(db)
    assert c == {"users": 0, "profiles": 0, "units": 0, "roster": 0, "assignments": 0}
