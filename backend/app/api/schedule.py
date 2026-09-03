"""Schedule mutation routes (SafeSport tier gated)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_schedule_mutation_access
from app.core.database import get_db
from app.models.training import TrainingUnit
from app.models.user import User
from app.schemas.schedule import ScheduleMutationRequest, ScheduleMutationResponse

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/mutations", response_model=ScheduleMutationResponse)
def mutate_schedule(
    payload: ScheduleMutationRequest,
    current_user: User = Depends(require_schedule_mutation_access),
    db: Session = Depends(get_db),
) -> ScheduleMutationResponse:
    """Rename a training unit. Gated by SafeSport tier via the dependency."""
    unit = db.get(TrainingUnit, payload.training_unit_id)
    if unit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"training_unit_id {payload.training_unit_id} not found",
        )
    unit.unit_name = payload.new_unit_name
    db.commit()
    db.refresh(unit)
    return ScheduleMutationResponse(
        training_unit_id=unit.training_unit_id, unit_name=unit.unit_name
    )
