"""SafeSport tier gating tests."""
from datetime import date

from app.api.deps import SafeSportTier, classify_safesport_tier
from app.models.enums import SystemRole
from app.models.user import SkaterProfile


def _dob_for_age(age: int) -> date:
    today = date.today()
    return date(today.year - age, today.month, today.day)


def test_tier_classification():
    assert classify_safesport_tier(_dob_for_age(10)) == SafeSportTier.tier_1
    assert classify_safesport_tier(_dob_for_age(15)) == SafeSportTier.tier_2
    assert classify_safesport_tier(_dob_for_age(25)) == SafeSportTier.tier_3


def test_under_13_direct_login_rejected(client, make_user, db):
    user = make_user("kid@example.com", password="Kid123!", role=SystemRole.athlete)
    db.add(SkaterProfile(skater_id=user.id, date_of_birth=_dob_for_age(11), home_club="Ice Club"))
    db.commit()

    resp = client.post(
        "/api/auth/login",
        json={"email": "kid@example.com", "password": "Kid123!"},
    )
    assert resp.status_code == 403, resp.text
    assert "Tier 1" in resp.json()["detail"]


def test_teen_tier2_login_allowed(client, make_user, db):
    user = make_user("teen@example.com", password="Teen123!", role=SystemRole.athlete)
    db.add(SkaterProfile(skater_id=user.id, date_of_birth=_dob_for_age(15), home_club="Ice Club"))
    db.commit()

    resp = client.post(
        "/api/auth/login",
        json={"email": "teen@example.com", "password": "Teen123!"},
    )
    assert resp.status_code == 200, resp.text
