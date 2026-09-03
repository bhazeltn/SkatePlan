"""Coach-meeting pydantic schemas (Sprint 5)."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MeetingCreate(BaseModel):
    skater_id: int
    meeting_datetime: Optional[datetime] = None
    category: str
    status: str = "scheduled"
    content_overview: Optional[str] = None


class MeetingUpdate(BaseModel):
    meeting_datetime: Optional[datetime] = None
    category: Optional[str] = None
    status: Optional[str] = None
    content_overview: Optional[str] = None
    meeting_notes: Optional[str] = None
    action_items: Optional[str] = None


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    coach_id: int
    meeting_datetime: Optional[datetime] = None
    category: str
    status: str
    content_overview: Optional[str] = None
    meeting_notes: Optional[str] = None
    action_items: Optional[str] = None
