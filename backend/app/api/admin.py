"""Admin-only maintenance routes (Scale of Values upload)."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.models.enums import SystemRole
from app.models.user import User
from app.seeds.seed_sov import parse_singles_records, upsert_records

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role != SystemRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user


@router.post("/sov/upload")
async def upload_scale_of_values(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
) -> dict[str, int]:
    """Upsert Scale of Values rows from an uploaded CSV (admin only)."""
    raw = await file.read()
    records = parse_singles_records(raw.decode("utf-8"))
    upserted = upsert_records(records)
    return {"upserted": upserted}
