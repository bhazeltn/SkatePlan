"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import enforce_safesport_access, get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # SafeSport gating: block direct login for under-13 (Tier 1) skaters.
    enforce_safesport_access(user, db)

    token = create_access_token(subject=user.id, role=user.system_role.value)
    return Token(access_token=token, user_id=user.id, role=user.system_role.value)


@router.get("/me", response_model=CurrentUser)
def me(current_user: User = Depends(get_current_user)) -> CurrentUser:
    return CurrentUser(
        user_id=current_user.id,
        role=current_user.system_role.value,
        email=current_user.email,
    )
