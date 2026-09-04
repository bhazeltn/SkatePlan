"""Injury-record routes (Sprint 5).

SafeSport gating: every skater-scoped route calls ``authorize_skater_access``.
Mutations require coach/admin privileges. Changes to the ``restrictions`` free
text are audited via the SafeSport ledger (see app.core.audit).
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.audit import audit_actor
from app.core.database import get_db
from app.models.enums import SystemRole
from app.models.injury import InjuryRecord
from app.models.user import User
from app.schemas.injury import (
    InjuryCreate,
    InjuryOut,
    InjuryUpdate,
    RestrictionCreate,
)

router = APIRouter(prefix="/injuries", tags=["injuries"])
skater_router = APIRouter(prefix="/skaters", tags=["injuries"])


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role not in (SystemRole.coach, SystemRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coach privileges required"
        )
    return current_user


def _get_injury(injury_id: uuid.UUID, db: Session) -> InjuryRecord:
    injury = db.get(InjuryRecord, injury_id)
    if injury is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Injury not found")
    return injury


@router.post("", response_model=InjuryOut, status_code=status.HTTP_201_CREATED)
def create_injury(
    payload: InjuryCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> InjuryOut:
    authorize_skater_access(current_user, payload.skater_id, db)
    injury = InjuryRecord(**payload.model_dump())
    with audit_actor(current_user.id):
        db.add(injury)
        db.commit()
    db.refresh(injury)
    return InjuryOut.model_validate(injury)


@router.put("/{injury_id}", response_model=InjuryOut)
def update_injury(
    injury_id: uuid.UUID,
    payload: InjuryUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> InjuryOut:
    injury = _get_injury(injury_id, db)
    authorize_skater_access(current_user, injury.skater_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(injury, field, value)
    with audit_actor(current_user.id):
        db.commit()
    db.refresh(injury)
    return InjuryOut.model_validate(injury)


@skater_router.get("/{skater_id}/injuries", response_model=list[InjuryOut])
def list_skater_injuries(
    skater_id: int,
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InjuryOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = select(InjuryRecord).where(InjuryRecord.skater_id == skater_id)
    if status is not None:
        stmt = stmt.where(InjuryRecord.status == status)
    stmt = stmt.order_by(InjuryRecord.created_at)
    return [InjuryOut.model_validate(r) for r in db.execute(stmt).scalars().all()]


def _restriction_text(payload: RestrictionCreate) -> str | None:
    """Combine excluded elements and coach notes into the audited free text."""
    parts: list[str] = []
    if payload.excluded_elements:
        parts.append(f"Excluded: {payload.excluded_elements.strip()}")
    if payload.notes:
        parts.append(payload.notes.strip())
    return " — ".join(parts) if parts else None


@skater_router.post(
    "/{skater_id}/restrictions",
    response_model=InjuryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_restriction(
    skater_id: int,
    payload: RestrictionCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> InjuryOut:
    """Log an active load restriction; flips the skater to Restricted Load."""
    authorize_skater_access(current_user, skater_id, db)
    injury = InjuryRecord(
        skater_id=skater_id,
        title=payload.restriction_type,
        onset_date=date.today(),
        status="active",
        restrictions=_restriction_text(payload),
        clearance_date=payload.review_date,
    )
    with audit_actor(current_user.id):
        db.add(injury)
        db.commit()
    db.refresh(injury)
    return InjuryOut.model_validate(injury)


@skater_router.delete(
    "/{skater_id}/restrictions/{restriction_id}", response_model=InjuryOut
)
def resolve_restriction(
    skater_id: int,
    restriction_id: uuid.UUID,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> InjuryOut:
    """Resolve an active restriction; returns the skater to Standard Load."""
    authorize_skater_access(current_user, skater_id, db)
    injury = _get_injury(restriction_id, db)
    injury.status = "resolved"
    injury.clearance_date = injury.clearance_date or date.today()
    with audit_actor(current_user.id):
        db.commit()
    db.refresh(injury)
    return InjuryOut.model_validate(injury)
