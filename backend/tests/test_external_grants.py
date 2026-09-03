"""External portfolio dual-track redaction tests."""
import uuid

from app.models.enums import AccessTier, SystemRole
from app.models.grant import ExternalAccessGrant
from app.models.session import TrainingSession
from app.models.training import TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile

RAW_INJURY = "Grade 2 ankle sprain, limit jumps for 3 weeks"


def _setup_skater_unit(make_user, db):
    skater = make_user("mia@ex.com", role=SystemRole.athlete, first="Mia", last="Anderson")
    db.add(
        SkaterProfile(
            skater_id=skater.id,
            date_of_birth=None,
            medical_notes=RAW_INJURY,
        )
    )
    unit = TrainingUnit(unit_name="Portfolio Unit", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(
        TrainingSession(
            training_unit_id=unit.training_unit_id,
            skater_id=skater.id,
            duration_minutes=90,
        )
    )
    db.commit()
    return skater, unit


def _grant(db, unit, tier, granted_by):
    token = uuid.uuid4().hex
    g = ExternalAccessGrant(
        training_unit_id=unit.training_unit_id,
        grantee_email="ext@ex.com",
        access_tier=tier,
        token=token,
        is_active=True,
        granted_by_user_id=granted_by.id,
    )
    db.add(g)
    db.commit()
    return token


def test_assessor_masked_redacts_name_and_medical(client, make_user, db):
    skater, unit = _setup_skater_unit(make_user, db)
    admin = make_user("granter@ex.com", role=SystemRole.admin)
    token = _grant(db, unit, AccessTier.assessor_masked, admin)

    resp = client.get(f"/api/external/portfolio/{token}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["skater"]["name"] == "Mia, A."
    assert body["skater"]["injury_log"] == "Active Load Restriction"


def test_hpd_full_shows_complete_data(client, make_user, db):
    skater, unit = _setup_skater_unit(make_user, db)
    admin = make_user("granter2@ex.com", role=SystemRole.admin)
    token = _grant(db, unit, AccessTier.hpd_full, admin)

    resp = client.get(f"/api/external/portfolio/{token}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["skater"]["name"] == "Mia Anderson"
    assert body["skater"]["injury_log"] == RAW_INJURY
    assert body["skater"]["session_durations"] == [90]
