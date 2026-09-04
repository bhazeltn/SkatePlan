"""Injury-record pydantic schemas (Sprint 5)."""
import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InjuryCreate(BaseModel):
    skater_id: int
    title: str
    body_part: Optional[str] = None
    onset_date: Optional[date] = None
    status: str = "active"
    restrictions: Optional[str] = None


class InjuryUpdate(BaseModel):
    status: Optional[str] = None
    body_part: Optional[str] = None
    onset_date: Optional[date] = None
    restrictions: Optional[str] = None
    clearance_date: Optional[date] = None


class RestrictionCreate(BaseModel):
    """Coach-logged load restriction from the Health & Load tab."""

    restriction_type: str
    excluded_elements: Optional[str] = None
    review_date: Optional[date] = None
    notes: Optional[str] = None


class InjuryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    title: str
    body_part: Optional[str] = None
    onset_date: Optional[date] = None
    status: str
    restrictions: Optional[str] = None
    clearance_date: Optional[date] = None
