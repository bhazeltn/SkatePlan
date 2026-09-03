"""Deterministic competition arithmetic (Sprint 3).

Pure arithmetic only — NO LLM, no randomness, no ISU rule verification. This
module validates the segment TSS identity and computes the planned-vs-executed
base-value differential. Planned base values are looked up from the Scale of
Values reference table (reusing scoring.py's combination parser).
"""
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.program import Program
from app.services.scoring import parse_combination_elements


def _round2(value) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def compute_segment_tss(tes, pcs, deductions, segment_bonus) -> float:
    """TSS = TES + PCS - Deductions + segment_bonus (2-dp, deterministic)."""
    return _round2(
        float(tes or 0) + float(pcs or 0) - float(deductions or 0) + float(segment_bonus or 0)
    )


def _planned_rows(program: Program | None, db: Session) -> list[dict]:
    if program is None:
        return []
    elements = sorted(program.elements, key=lambda e: e.segment_order)
    rows = []
    for elem in elements:
        base = _round2(parse_combination_elements(elem.element_code, db))
        rows.append({
            "segment_order": elem.segment_order,
            "planned_code": elem.element_code,
            "planned_base": base,
        })
    return rows


def _executed_rows(executed) -> list[dict]:
    rows = []
    for ex in sorted(executed, key=lambda e: e.segment_order):
        rows.append({
            "segment_order": ex.segment_order,
            "executed_code": ex.called_code,
            "executed_base": _round2(ex.base_value or 0),
        })
    return rows


def _merge_rows(planned: list[dict], executed: list[dict]) -> list[dict]:
    """Zip planned and executed rows by segment_order into side-by-side rows."""
    orders = sorted({r["segment_order"] for r in planned + executed})
    p_by = {r["segment_order"]: r for r in planned}
    e_by = {r["segment_order"]: r for r in executed}
    merged = []
    for order in orders:
        p = p_by.get(order, {})
        e = e_by.get(order, {})
        planned_base = p.get("planned_base")
        executed_base = e.get("executed_base")
        delta = _round2((executed_base or 0) - (planned_base or 0))
        merged.append({
            "segment_order": order,
            "planned_code": p.get("planned_code"),
            "planned_base": planned_base,
            "executed_code": e.get("executed_code"),
            "executed_base": executed_base,
            "base_delta": delta,
        })
    return merged


def _program_for_segment(entry, segment: str) -> "uuid.UUID | None":  # noqa: F821
    return entry.sp_program_id if segment == "SP" else entry.fs_program_id


def build_segment_comparison(entry, result, db: Session) -> dict:
    """Compare an assigned program's planned bases to executed bases."""
    program = db.get(Program, _program_for_segment(entry, result.segment))
    planned = _planned_rows(program, db)
    executed = _executed_rows(result.executed_elements)
    rows = _merge_rows(planned, executed)
    total_planned = _round2(sum(r["planned_base"] or 0 for r in rows))
    total_executed = _round2(sum(r["executed_base"] or 0 for r in rows))
    return {
        "segment": result.segment,
        "rows": rows,
        "total_planned_base": total_planned,
        "total_executed_base": total_executed,
        "total_base_differential": _round2(total_executed - total_planned),
    }
