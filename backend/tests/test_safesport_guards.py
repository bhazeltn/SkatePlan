"""SafeSport tier gating: login + guarded schedule mutation."""
from datetime import date

from app.api.deps import SafeSportTier, classify_safesport_tier
from app.models.enums import AccessState, SystemRole
from app.models.training import TrainingUnit
from app.models.user import AccountProxyLink, SkaterProfile

MINOR_MSG = "Minor account access must route through verified parent proxy"


def _dob_for_age(age: int) -> date:
    today = date.today()
    return date(today.year - age, today.month, today.day)


def _make_skater(make_user, db, email, age, pwd="Skate123!"):
    user = make_user(email, password=pwd, role=SystemRole.athlete)
    db.add(SkaterProfile(skater_id=user.id, date_of_birth=_dob_for_age(age)))
    db.commit()
    return user


def _make_unit(db, name="Unit A"):
    unit = TrainingUnit(unit_name=name, is_active=True)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


def _login(client, email, pwd="Skate123!"):
    return client.post("/api/auth/login", json={"email": email, "password": pwd})


def _mutate(client, token, unit_id):
    return client.post(
        "/api/schedule/mutations",
        headers={"Authorization": f"Bearer {token}"},
        json={"training_unit_id": unit_id, "new_unit_name": "Renamed"},
    )


def test_tier_classification():
    assert classify_safesport_tier(_dob_for_age(10)) == SafeSportTier.tier_1
    assert classify_safesport_tier(_dob_for_age(15)) == SafeSportTier.tier_2
    assert classify_safesport_tier(_dob_for_age(25)) == SafeSportTier.tier_3


def test_tier1_direct_login_rejected(client, make_user, db):
    _make_skater(make_user, db, "kid@ex.com", 11)
    resp = _login(client, "kid@ex.com")
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"] == MINOR_MSG


def test_tier2_login_ok_but_mutation_without_proxy_forbidden(client, make_user, db):
    _make_skater(make_user, db, "teen@ex.com", 15)
    unit = _make_unit(db)
    login = _login(client, "teen@ex.com")
    assert login.status_code == 200, login.text
    resp = _mutate(client, login.json()["access_token"], unit.training_unit_id)
    assert resp.status_code == 403, resp.text


def test_tier2_mutation_with_active_proxy_allowed(client, make_user, db):
    skater = _make_skater(make_user, db, "teen2@ex.com", 15)
    parent = make_user("parent@ex.com", role=SystemRole.parent)
    db.add(
        AccountProxyLink(
            skater_id=skater.id,
            parent_user_id=parent.id,
            is_active_observer=True,
            access_state=AccessState.active,
        )
    )
    db.commit()
    unit = _make_unit(db)
    login = _login(client, "teen2@ex.com")
    resp = _mutate(client, login.json()["access_token"], unit.training_unit_id)
    assert resp.status_code == 200, resp.text


def test_tier3_autonomous_login_and_mutation_allowed(client, make_user, db):
    _make_skater(make_user, db, "adult@ex.com", 25)
    unit = _make_unit(db)
    login = _login(client, "adult@ex.com")
    assert login.status_code == 200, login.text
    resp = _mutate(client, login.json()["access_token"], unit.training_unit_id)
    assert resp.status_code == 200, resp.text
