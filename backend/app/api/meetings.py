"""Coach-meeting routes (Sprint 5).

SafeSport gating: every skater-scoped route calls ``authorize_skater_access``.
Mutations require coach/admin privileges. ``coach_id`` is always derived from the
authenticated user, never trusted from the request body.
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.models.enums import SystemRole
from app.models.meeting import CoachMeeting
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingOut, MeetingUpdate

router = APIRouter(prefix="/meetings", tags=["meetings"])
skater_router = APIRouter(prefix="/skaters", tags=["meetings"])


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role not in (SystemRole.coach, SystemRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coach privileges required"
        )
    return current_user


def _get_meeting(meeting_id: uuid.UUID, db: Session) -> CoachMeeting:
    meeting = db.get(CoachMeeting, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> MeetingOut:
    authorize_skater_access(current_user, payload.skater_id, db)
    meeting = CoachMeeting(coach_id=current_user.id, **payload.model_dump())
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return MeetingOut.model_validate(meeting)


@router.put("/{meeting_id}", response_model=MeetingOut)
def update_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> MeetingOut:
    meeting = _get_meeting(meeting_id, db)
    authorize_skater_access(current_user, meeting.skater_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
    db.commit()
    db.refresh(meeting)
    return MeetingOut.model_validate(meeting)


@skater_router.get("/{skater_id}/meetings", response_model=list[MeetingOut])
def list_skater_meetings(
    skater_id: int,
    status: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MeetingOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = select(CoachMeeting).where(CoachMeeting.skater_id == skater_id)
    if status is not None:
        stmt = stmt.where(CoachMeeting.status == status)
    if start_date is not None:
        stmt = stmt.where(func.date(CoachMeeting.meeting_datetime) >= start_date)
    if end_date is not None:
        stmt = stmt.where(func.date(CoachMeeting.meeting_datetime) <= end_date)
    stmt = stmt.order_by(CoachMeeting.meeting_datetime)
    return [MeetingOut.model_validate(r) for r in db.execute(stmt).scalars().all()]
