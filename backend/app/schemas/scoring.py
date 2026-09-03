"""Stateless scoring-sandbox pydantic schemas (Sprint 2)."""
from typing import Optional

from pydantic import BaseModel


class ScoringElementIn(BaseModel):
    element_code: str
    # Either provide a raw panel of judge GOEs OR a pre-computed goe value.
    panel_goe: Optional[list[float]] = None
    goe: Optional[float] = None
    is_second_half_bonus: bool = False
    element_bonus: float = 0.0


class ScoringRequest(BaseModel):
    elements: list[ScoringElementIn]
    pcs_marks: list[float] = []
    segment_bonus: float = 0.0
    deductions: float = 0.0


class ScoringElementOut(BaseModel):
    element_code: Optional[str] = None
    scored_base: float
    goe: float
    element_bonus: float
    element_total: float


class ScoringResponse(BaseModel):
    elements: list[ScoringElementOut]
    tes: float
    pcs: float
    deductions: float
    total_bonus: float
    tss: float
