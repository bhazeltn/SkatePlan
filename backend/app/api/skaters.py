"""Skater onboarding orchestration (atomic multi-write)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.models.enums import DisciplineType, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User
from app.schemas.skater import OrchestrateSkaterRequest, OrchestrateSkaterResponse

router = APIRouter(prefix="/skaters", tags=["skaters"])


@router.post(
    "/orchestrate",
    response_model=OrchestrateSkaterResponse,
    status_code=status.HTTP_201_CREATED,
)
def orchestrate_skater(
    payload: OrchestrateSkaterRequest, db: Session = Depends(get_db)
) -> OrchestrateSkaterResponse:
    """Atomically create a skater profile, training unit, roster entry and
    primary coach assignment in a SINGLE transaction. Any failure rolls back
    the whole thing so nothing is persisted.
    """
    try:
        # 1. Resolve or create the skater user.
        if payload.skater_user_id is not None:
            skater_user = db.get(User, payload.skater_user_id)
            if skater_user is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"skater_user_id {payload.skater_user_id} not found",
                )
        else:
            if not (payload.email and payload.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="email and password required to create a new skater user",
                )
            skater_user = User(
                email=payload.email,
                password_hash=hash_password(payload.password),
                system_role=SystemRole.athlete,
                first_name=payload.first_name,
                last_name=payload.last_name,
            )
            db.add(skater_user)
            db.flush()  # obtain skater_user.id

        # 2. Validate the coach FK explicitly (so a bad coach rolls everything back).
        coach = db.get(User, payload.coach_user_id)
        if coach is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"coach_user_id {payload.coach_user_id} not found",
            )

        # 3. Skater profile
        profile = SkaterProfile(
            skater_id=skater_user.id,
            date_of_birth=payload.date_of_birth,
            home_club=payload.home_club,
            federation_id=payload.federation_id,
        )
        db.add(profile)
        db.flush()

        # 4. Training unit
        unit = TrainingUnit(
            discipline_type=DisciplineType.singles,
            unit_name=payload.unit_name,
            is_active=True,
        )
        db.add(unit)
        db.flush()

        # 5. Roster entry
        roster = TrainingUnitRoster(
            training_unit_id=unit.training_unit_id,
            skater_id=profile.skater_id,
        )
        db.add(roster)
        db.flush()

        # 6. Primary coach assignment
        assignment = CoachAssignment(
            coach_user_id=coach.id,
            training_unit_id=unit.training_unit_id,
            role_in_unit=payload.role_in_unit,
        )
        db.add(assignment)
        db.flush()

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Onboarding failed and was rolled back: {exc}",
        )

    return OrchestrateSkaterResponse(
        skater_id=profile.skater_id,
        training_unit_id=unit.training_unit_id,
        roster_entry_id=roster.roster_entry_id,
        assignment_id=assignment.assignment_id,
    )
