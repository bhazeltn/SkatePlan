"""Program + program-element pydantic schemas (Sprint 2)."""
import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProgramElementIn(BaseModel):
    segment_order: int
    element_code: str
    is_second_half_bonus: bool = False
    element_bonus: Decimal = Decimal("0")
    transition_notes: Optional[str] = None


class ProgramElementOut(ProgramElementIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class ProgramCreate(BaseModel):
    skater_id: int
    program_type: str
    title: str
    season: Optional[str] = None
    music_duration_seconds: Optional[int] = None
    segment_bonus: Decimal = Decimal("0")
    program_elements: list[ProgramElementIn] = []


class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    program_type: str
    title: str
    season: Optional[str] = None
    music_duration_seconds: Optional[int] = None
    segment_bonus: Decimal
    program_elements: list[ProgramElementOut] = []


class ProgramElementsUpdate(BaseModel):
    program_elements: list[ProgramElementIn]
