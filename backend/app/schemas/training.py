"""Training-session, attempt and analytics pydantic schemas (Sprint 4)."""
import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SessionCreate(BaseModel):
    skater_id: int
    session_date: Optional[date] = None
    session_type: str
    duration_minutes: int = Field(ge=0)
    rpe: int = Field(ge=1, le=10)  # invalid rpe -> 422
    location: Optional[str] = None
    notes: Optional[str] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    session_date: Optional[date] = None
    session_type: str
    duration_minutes: int
    rpe: int
    location: Optional[str] = None
    notes: Optional[str] = None


class AttemptIn(BaseModel):
    element_code: str
    outcome: str
    attempts_count: int = Field(default=1, ge=1)
    notes: Optional[str] = None


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    element_code: str
    outcome: str
    attempts_count: int
    notes: Optional[str] = None


class ElementStatOut(BaseModel):
    element_code: str
    total_attempts: int
    clean_count: int
    clean_percentage: float


class MetricsOut(BaseModel):
    skater_id: int
    total_ice_minutes: int
    session_count: int
    workload_index: int
    average_rpe: float
    element_stats: list[ElementStatOut] = []
