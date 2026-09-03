"""Stateless scoring-sandbox route (Sprint 2).

Resolves element base values + GOE deterministically from the SOV table and
returns an itemized breakdown with the final TSS. No rule verification.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scoring import ScaleOfValues
from app.schemas.scoring import ScoringElementIn, ScoringRequest, ScoringResponse
from app.services.scoring import (
    calculate_trimmed_mean_goe,
    parse_combination_elements,
)

router = APIRouter(prefix="/scoring", tags=["scoring"])


def _first_token(element_code: str) -> str:
    for token in element_code.split("+"):
        tok = token.strip()
        if tok:
            return tok
    return element_code.strip()


def _resolve_goe(elem: ScoringElementIn, base_value: float, db: Session) -> float:
    """Panel GOE -> trimmed mean scaled by SOV steps; else the explicit goe."""
    if elem.panel_goe:
        row = db.get(ScaleOfValues, _first_token(elem.element_code))
        minus5 = float(row.goe_minus_5) if row else 0.0
        plus5 = float(row.goe_plus_5) if row else 0.0
        return calculate_trimmed_mean_goe(base_value, elem.panel_goe, minus5, plus5)
    return float(elem.goe or 0.0)


def _resolve_element(elem: ScoringElementIn, db: Session) -> dict:
    base = float(parse_combination_elements(elem.element_code, db))
    return {
        "element_code": elem.element_code,
        "base_value": base,
        "goe": _resolve_goe(elem, base, db),
        "is_second_half_bonus": elem.is_second_half_bonus,
        "element_bonus": elem.element_bonus,
    }


@router.post("/calculate", response_model=ScoringResponse)
def calculate(payload: ScoringRequest, db: Session = Depends(get_db)) -> ScoringResponse:
    from app.services.scoring import calculate_program_tss

    elements_data = [_resolve_element(e, db) for e in payload.elements]
    result = calculate_program_tss(
        elements_data=elements_data,
        pcs_data=payload.pcs_marks,
        deductions=payload.deductions,
        segment_bonus=payload.segment_bonus,
    )
    return ScoringResponse(**result)
