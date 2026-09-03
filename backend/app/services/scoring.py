"""Deterministic ISU-style scoring engine (Sprint 2).

Pure Python arithmetic only — NO LLM, no randomness, no rule verification.
This module parses element codes, looks up base values from the Scale of Values
table, applies the given GOE / second-half / bonus inputs and computes segment
totals. It does NOT validate element legality (no Zayak / repetition / jump-count
checks) — it scores exactly whatever input it is handed.
"""
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.scoring import ScaleOfValues

# Tokens that are sequence/combination markers, not scorable elements.
_SEQUENCE_MARKERS = {"SEQ", "COMBO", "COMB", "+SEQ", "SEQUENCE"}


def _round2(value) -> float:
    """Round to exactly 2 decimals using half-up (deterministic)."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def base_value_for(abbreviation: str, db: Session) -> Decimal:
    """Look up a single element's base value; 0 if not found (no error)."""
    row = db.get(ScaleOfValues, abbreviation.strip())
    return Decimal("0") if row is None else Decimal(row.base_value)


def parse_combination_elements(code_str: str, db: Session) -> Decimal:
    """Sum base values of a compound code split on '+'.

    Sequence markers (SEQ/COMBO/...) contribute nothing and never raise.
    Unknown tokens simply contribute 0 (deterministic, tolerant parsing).
    """
    total = Decimal("0")
    for token in code_str.split("+"):
        tok = token.strip()
        if not tok or tok.upper() in _SEQUENCE_MARKERS:
            continue
        total += base_value_for(tok, db)
    return total


def trimmed_mean(judges_goe_list: list[float]) -> float:
    """ISU trimmed mean: drop exactly one min and one max, average the rest."""
    values = sorted(judges_goe_list)
    trimmed = values[1:-1] if len(values) > 2 else values
    return sum(trimmed) / len(trimmed)


def calculate_trimmed_mean_goe(
    base_value: float,
    judges_goe_list: list[float],
    goe_minus_5: float,
    goe_plus_5: float,
) -> float:
    """Scale the trimmed-mean panel grade by the SOV per-step size.

    Positive mean -> step = goe_plus_5 / 5 ; negative mean -> |goe_minus_5| / 5.
    Returns the scaled GOE rounded to 2 decimals.
    """
    mean = trimmed_mean(judges_goe_list)
    if mean >= 0:
        step = float(goe_plus_5) / 5
    else:
        step = abs(float(goe_minus_5)) / 5
    return _round2(mean * step)


def apply_second_half(base_value, is_second_half_bonus: bool) -> float:
    """Apply the 1.10 second-half multiplier when flagged; round to 2 dp."""
    base = Decimal(str(base_value))
    if is_second_half_bonus:
        base = base * Decimal("1.10")
    return _round2(base)


def _score_element(item: dict) -> dict:
    """Build a per-element itemized breakdown row."""
    scored_base = apply_second_half(item["base_value"], item.get("is_second_half_bonus", False))
    goe = _round2(item.get("goe", 0.0))
    bonus = _round2(item.get("element_bonus", 0.0))
    return {
        "element_code": item.get("element_code"),
        "scored_base": scored_base,
        "goe": goe,
        "element_bonus": bonus,
        "element_total": _round2(scored_base + goe),
    }


def calculate_program_tss(
    elements_data: list[dict],
    pcs_data: list[float],
    deductions: float,
    segment_bonus: float,
) -> dict:
    """Compute itemized TES/PCS/bonuses and the final TSS identity.

    TSS = TES + PCS - Deductions + Total_Bonus (deterministic, 2-dp rounded).
    """
    items = [_score_element(e) for e in elements_data]
    tes = _round2(sum(i["element_total"] for i in items))
    total_bonus = _round2(sum(i["element_bonus"] for i in items) + (segment_bonus or 0.0))
    pcs = _round2(sum(pcs_data or []))
    deduct = _round2(deductions or 0.0)
    tss = _round2(tes + pcs - deduct + total_bonus)
    return {
        "elements": items,
        "tes": tes,
        "pcs": pcs,
        "deductions": deduct,
        "total_bonus": total_bonus,
        "tss": tss,
    }
