"""Read-only Scale of Values (SOV) elements endpoint for the program builder."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.scoring import ScaleOfValues
from app.models.user import User
from app.schemas.sov import SovElementOut

router = APIRouter(prefix="/sov", tags=["sov"])


@router.get("/elements", response_model=list[SovElementOut])
def list_sov_elements(
    _user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[SovElementOut]:
    """Return all Singles SOV elements ordered by abbreviation.

    The ``abbreviation`` PK is exposed to clients as ``element_code``.
    """
    rows = (
        db.execute(select(ScaleOfValues).order_by(ScaleOfValues.abbreviation))
        .scalars()
        .all()
    )
    return [
        SovElementOut(
            element_code=row.abbreviation,
            element_name=row.element_name,
            base_value=row.base_value,
        )
        for row in rows
    ]
