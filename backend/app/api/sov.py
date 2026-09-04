"""Read-only Scale of Values (SOV) elements endpoint for the program builder."""
import re

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.scoring import ScaleOfValues
from app.models.user import User
from app.schemas.sov import SovElementOut

router = APIRouter(prefix="/sov", tags=["sov"])

# Execution-flag characters that mark a scored variant rather than a planned
# element: under-rotation ("<"/"<<"), downgrade (">"), quarter ("q"), unclear
# edge ("e"), attention ("!") and invalid ("*"). Step/choreo sequences legitimately
# contain "q" (StSq/ChSq), so their token is stripped before the check.
_FLAG_CHARS = re.compile(r"[<>qe!*]")


def _is_flagged_code(code: str) -> bool:
    """True when a code is an execution-flag variant, not a planned element."""
    stripped = code.replace("StSq", "").replace("ChSq", "")
    return bool(_FLAG_CHARS.search(stripped))


@router.get("/elements", response_model=list[SovElementOut])
def list_sov_elements(
    planned_only: bool = False,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SovElementOut]:
    """Return Singles SOV elements ordered by abbreviation.

    The ``abbreviation`` PK is exposed to clients as ``element_code``. When
    ``planned_only`` is true, execution-flag scored variants are excluded so the
    program builder only offers clean, plannable elements.
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
        if not (planned_only and _is_flagged_code(row.abbreviation))
    ]
