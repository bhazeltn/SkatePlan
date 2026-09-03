"""Shared API dependencies: auth + SafeSport tier gating."""
from datetime import date
from enum import Enum

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import SkaterProfile, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class SafeSportTier(str, Enum):
    """SafeSport supervision tiers derived from a skater's age."""
    tier_1 = "tier_1_parent_proxy"      # age < 13
    tier_2 = "tier_2_rule_of_two"       # age 13-18
    tier_3 = "tier_3_autonomous"        # age 18+


def compute_age(dob: date, on_date: date | None = None) -> int:
    ref = on_date or date.today()
    return ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))


def classify_safesport_tier(dob: date, on_date: date | None = None) -> SafeSportTier:
    age = compute_age(dob, on_date)
    if age < 13:
        return SafeSportTier.tier_1
    if age < 18:
        return SafeSportTier.tier_2
    return SafeSportTier.tier_3


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if sub is None:
            raise cred_exc
        user_id = int(sub)
    except (JWTError, ValueError):
        raise cred_exc

    user = db.get(User, user_id)
    if user is None:
        raise cred_exc
    return user


def enforce_safesport_access(user: User, db: Session) -> SafeSportTier:
    """Gate access based on the user's SafeSport tier.

    Tier 1 (under-13 skater) direct access is REJECTED — such skaters require
    parent-proxy access. Non-skater users (coach/parent/admin) are unaffected.
    Returns the tier for skater users that are allowed through.
    """
    profile = db.get(SkaterProfile, user.id)
    if profile is None or profile.date_of_birth is None:
        # Not a skater profile (or no DOB) -> no tier gating applies here.
        return SafeSportTier.tier_3

    tier = classify_safesport_tier(profile.date_of_birth)
    if tier == SafeSportTier.tier_1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "SafeSport Tier 1: skaters under 13 cannot access the system "
                "directly. Parent-proxy access is required."
            ),
        )
    return tier


def get_current_skater_gated(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Dependency variant that applies SafeSport gating to the current user."""
    enforce_safesport_access(current_user, db)
    return current_user
