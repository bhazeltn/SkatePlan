"""Skater onboarding orchestration (atomic multi-write)."""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.models.enums import DisciplineType, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User
from app.schemas.skater import OrchestrateSkaterRequest, OrchestrateSkaterResponse

router = APIRouter(prefix="/skaters", tags=["skaters"])


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _new_skater_user(payload: OrchestrateSkaterRequest) -> User:
    """Build a skater User. Password optional.

    With email+password an active login account is created; otherwise a
    login-less placeholder athlete (unactivated, no usable password).
    """
    active = bool(payload.email and payload.password)
    return User(
        email=payload.email if active else f"skater-{uuid4().hex}@placeholder.skateplan.local",
        password_hash=hash_password(payload.password) if active else "",
        system_role=SystemRole.athlete,
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_account_active=active,
    )


def _resolve_skater_user(payload: OrchestrateSkaterRequest, db: Session) -> User:
    """Return an existing skater user or create one (flushed)."""
    if payload.skater_user_id is not None:
        user = db.get(User, payload.skater_user_id)
        if user is None:
            raise _bad_request(f"skater_user_id {payload.skater_user_id} not found")
        return user
    user = _new_skater_user(payload)
    db.add(user)
    db.flush()
    return user


def _build_profile(payload: OrchestrateSkaterRequest, skater_id: int) -> SkaterProfile:
    return SkaterProfile(
        skater_id=skater_id,
        date_of_birth=payload.date_of_birth,
        home_club=payload.home_club,
        federation_registration_id=payload.federation_registration_id,
        federation_id=payload.federation_id,
        current_level_id=payload.current_level_id,
        competitive_level=payload.competitive_level,
        contact_email=payload.contact_email,
    )


def _unit_name_for(payload: OrchestrateSkaterRequest) -> str:
    """Derive a training-unit name when none is supplied by the client."""
    if payload.unit_name:
        return payload.unit_name
    if payload.home_club:
        return payload.home_club
    who = " ".join(filter(None, [payload.first_name, payload.last_name])).strip()
    return f"{who} unit" if who else "Training unit"


def _attach_unit(
    payload: OrchestrateSkaterRequest, profile: SkaterProfile, coach: User, db: Session
) -> tuple[TrainingUnit, TrainingUnitRoster, CoachAssignment]:
    """Create the training unit, roster entry and coach assignment."""
    unit = TrainingUnit(
        discipline_type=DisciplineType.singles,
        unit_name=_unit_name_for(payload),
        is_active=True,
    )
    db.add(unit)
    db.flush()
    roster = TrainingUnitRoster(
        training_unit_id=unit.training_unit_id, skater_id=profile.skater_id
    )
    assignment = CoachAssignment(
        coach_user_id=coach.id,
        training_unit_id=unit.training_unit_id,
        role_in_unit=payload.role_in_unit,
    )
    db.add_all([roster, assignment])
    db.flush()
    return unit, roster, assignment


def _persist_graph(
    payload: OrchestrateSkaterRequest, db: Session
) -> OrchestrateSkaterResponse:
    """Create profile, unit, roster and coach assignment in one transaction."""
    skater_user = _resolve_skater_user(payload, db)
    coach = db.get(User, payload.coach_user_id)
    if coach is None:
        raise _bad_request(f"coach_user_id {payload.coach_user_id} not found")
    profile = _build_profile(payload, skater_user.id)
    db.add(profile)
    db.flush()
    unit, roster, assignment = _attach_unit(payload, profile, coach, db)
    db.commit()
    return OrchestrateSkaterResponse(
        skater_id=profile.skater_id,
        training_unit_id=unit.training_unit_id,
        roster_entry_id=roster.roster_entry_id,
        assignment_id=assignment.assignment_id,
    )


@router.post(
    "/orchestrate",
    response_model=OrchestrateSkaterResponse,
    status_code=status.HTTP_201_CREATED,
)
def orchestrate_skater(
    payload: OrchestrateSkaterRequest, db: Session = Depends(get_db)
) -> OrchestrateSkaterResponse:
    """Atomically create a skater profile, training unit, roster entry and
    primary coach assignment. Any failure rolls back the whole transaction.
    """
    try:
        return _persist_graph(payload, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise _bad_request(f"Onboarding failed and was rolled back: {exc}")
