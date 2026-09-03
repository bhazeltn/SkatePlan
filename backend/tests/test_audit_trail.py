"""Audit ledger: critical text field changes are recorded."""
from sqlalchemy import select

from app.core.audit import audit_actor
from app.models.audit import SafeSportTextHistoryLedger
from app.models.enums import SystemRole
from app.models.user import SkaterProfile


def test_medical_notes_change_appends_ledger(make_user, db):
    skater = make_user("audit@ex.com", role=SystemRole.athlete)
    profile = SkaterProfile(skater_id=skater.id, medical_notes="original notes")
    db.add(profile)
    db.commit()

    actor = make_user("actor@ex.com", role=SystemRole.coach)
    with audit_actor(actor_id=actor.id, ip="203.0.113.7"):
        profile.medical_notes = "updated notes"
        db.commit()

    ledger = db.scalar(
        select(SafeSportTextHistoryLedger).where(
            SafeSportTextHistoryLedger.target_table_name == "skater_profiles",
            SafeSportTextHistoryLedger.target_record_id == str(skater.id),
            SafeSportTextHistoryLedger.target_column_name == "medical_notes",
        )
    )
    assert ledger is not None
    assert ledger.historical_text_value == "original notes"
    assert ledger.revised_by_actor_id == actor.id
    assert ledger.revision_timestamp is not None
