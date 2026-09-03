"""Competition, entry, result and comparison pydantic schemas (Sprint 3)."""
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CompetitionCreate(BaseModel):
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    city: Optional[str] = None
    country: Optional[str] = None
    federation_id: Optional[int] = None
    season: Optional[str] = None


class CompetitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    city: Optional[str] = None
    country: Optional[str] = None
    federation_id: Optional[int] = None
    season: Optional[str] = None


class EntryCreate(BaseModel):
    skater_id: int
    level_id: Optional[int] = None
    sp_program_id: Optional[uuid.UUID] = None
    fs_program_id: Optional[uuid.UUID] = None


class EntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    competition_id: uuid.UUID
    skater_id: int
    level_id: Optional[int] = None
    sp_program_id: Optional[uuid.UUID] = None
    fs_program_id: Optional[uuid.UUID] = None
    status: str


class ExecutedElementIn(BaseModel):
    segment_order: int
    called_code: str
    base_value: Decimal = Decimal("0")
    goe: Decimal = Decimal("0")
    info_flags: Optional[str] = None


class ResultCreate(BaseModel):
    segment: str
    tes: Decimal = Decimal("0")
    pcs: Decimal = Decimal("0")
    deductions: Decimal = Decimal("0")
    segment_bonus: Decimal = Decimal("0")
    segment_rank: Optional[int] = None
    overall_rank: Optional[int] = None
    protocol_notes: Optional[str] = None
    executed_elements: list[ExecutedElementIn] = []


class ExecutedElementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    segment_order: int
    called_code: str
    base_value: Optional[float] = None
    earned_goe: Optional[float] = None
    info_flags: Optional[str] = None


class SegmentResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    segment: str
    tes: Optional[float] = None
    pcs: Optional[float] = None
    deductions: Optional[float] = None
    segment_bonus: float
    tss: Optional[float] = None
    segment_rank: Optional[int] = None
    overall_rank: Optional[int] = None
    executed_elements: list[ExecutedElementOut] = []


class ProtocolOut(BaseModel):
    entry_id: uuid.UUID
    segments: list[SegmentResultOut]
