"""External dual-track portfolio sharing routes (deterministic redaction)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redaction import full_name, mask_medical, redact_name
from app.models.enums import AccessTier
from app.models.grant import ExternalAccessGrant
from app.models.session import TrainingSession
from app.models.training import TrainingUnitRoster
from app.models.user import SkaterProfile, User
from app.schemas.portfolio import PortfolioOut, PortfolioSkaterOut

router = APIRouter(prefix="/external", tags=["external"])


def _resolve_grant(token: str, db: Session) -> ExternalAccessGrant:
    grant = db.execute(
        select(ExternalAccessGrant).where(ExternalAccessGrant.token == token)
    ).scalar_one_or_none()
    if grant is None or not grant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid grant")
    if grant.expires_at is not None and grant.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Grant expired")
    return grant


def _first_skater(unit_id: int, db: Session) -> tuple[User, SkaterProfile]:
    roster = db.execute(
        select(TrainingUnitRoster)
        .where(TrainingUnitRoster.training_unit_id == unit_id)
        .order_by(TrainingUnitRoster.roster_entry_id)
    ).scalars().first()
    if roster is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empty unit")
    profile = db.get(SkaterProfile, roster.skater_id)
    user = db.get(User, roster.skater_id)
    return user, profile


def _durations(unit_id: int, skater_id: int, db: Session) -> list[int]:
    rows = db.execute(
        select(TrainingSession.duration_minutes)
        .where(
            TrainingSession.training_unit_id == unit_id,
            TrainingSession.skater_id == skater_id,
        )
        .order_by(TrainingSession.session_id)
    ).scalars().all()
    return list(rows)


@router.get("/portfolio/{token}", response_model=PortfolioOut)
def get_external_portfolio(token: str, db: Session = Depends(get_db)) -> PortfolioOut:
    grant = _resolve_grant(token, db)
    user, profile = _first_skater(grant.training_unit_id, db)
    durations = _durations(grant.training_unit_id, profile.skater_id, db)

    if grant.access_tier == AccessTier.hpd_full:
        skater = PortfolioSkaterOut(
            name=full_name(user.first_name, user.last_name),
            injury_log=profile.medical_notes or "",
            session_durations=durations,
        )
    else:
        skater = PortfolioSkaterOut(
            name=redact_name(user.first_name, user.last_name),
            injury_log=mask_medical(profile.medical_notes),
            session_durations=durations,
        )
    return PortfolioOut(
        training_unit_id=grant.training_unit_id,
        access_tier=grant.access_tier.value,
        skater=skater,
    )
