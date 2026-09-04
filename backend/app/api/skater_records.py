"""Coach-facing skater roster list + profile hub read endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.skater_detail import SkaterDetailOut, SkaterSummaryOut
from app.services.skater_service import get_skater_detail, list_coach_skaters

router = APIRouter(prefix="/skaters", tags=["skaters"])


@router.get("", response_model=list[SkaterSummaryOut])
def list_skaters(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[SkaterSummaryOut]:
    """Roster summaries for the authenticated coach."""
    return list_coach_skaters(current_user.id, db)


@router.get("/{skater_id}", response_model=SkaterDetailOut)
def get_skater(
    skater_id: int,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SkaterDetailOut:
    """Full profile hub payload for one skater."""
    detail = get_skater_detail(skater_id, db)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Skater not found"
        )
    return detail
