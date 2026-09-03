"""Deterministic holistic gap-analysis service (Sprint 5).

Pure Python — NO LLM, no randomness. Compares a skater's measured performance
and rubric assessments against a target development standard's benchmarks.

Canonical pillars: 'technical','skating_skills','physical','mental'.

Status mapping (documented so tests + impl agree):
* ``auto_data`` benchmark — measured >= target => 'met'; measured < target
  (data exists) => 'developing'; no measured data => 'not_started'.
* ``rubric`` benchmark — latest assessment 'acquired'/'mastered' => 'met';
  'developing' => 'developing'; none / 'not_started' => 'not_started'.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.training_log import JumpAttemptLog, TrainingSessionLog
from app.services.training_service import aggregate_attempt_success_rates

_MET = {"acquired", "mastered"}


def measured_metrics(skater_id: int, db: Session) -> dict[str, float]:
    """Return {element_code: clean_percentage} for a skater's logged attempts."""
    session_ids = list(
        db.execute(
            select(TrainingSessionLog.id).where(TrainingSessionLog.skater_id == skater_id)
        ).scalars().all()
    )
    if not session_ids:
        return {}
    attempts = list(
        db.execute(
            select(JumpAttemptLog).where(JumpAttemptLog.session_id.in_(session_ids))
        ).scalars().all()
    )
    return {row["element_code"]: row["clean_percentage"]
            for row in aggregate_attempt_success_rates(attempts)}


def _resolve_metric(target_metric_code: str | None, metrics: dict[str, float]):
    """Parse 'clean_rate:3Lz' and look up the element's measured clean %."""
    if not target_metric_code or ":" not in target_metric_code:
        return None
    _, element = target_metric_code.split(":", 1)
    return metrics.get(element)


def _auto_status(measured, target):
    """(status, delta) for an auto_data benchmark."""
    if measured is None:
        return "not_started", None
    delta = round(measured - target, 1)
    return ("met" if measured >= target else "developing"), delta


def _rubric_status(assessment) -> str:
    """Map the latest rubric assessment status to a report status."""
    if assessment is None:
        return "not_started"
    if assessment.status in _MET:
        return "met"
    if assessment.status == "developing":
        return "developing"
    return "not_started"


def _benchmark_entry(bench, assessments_by_benchmark, metrics) -> dict:
    """Build one report row for a single benchmark."""
    target = float(bench.target_value) if bench.target_value is not None else None
    entry = {"benchmark_id": str(bench.id), "title": bench.title,
             "evaluation_mode": bench.evaluation_mode,
             "measured": None, "target": target, "delta": None}
    if bench.evaluation_mode == "auto_data":
        measured = _resolve_metric(bench.target_metric_code, metrics)
        entry["measured"] = measured
        entry["status"], entry["delta"] = _auto_status(measured, target)
    else:
        entry["status"] = _rubric_status(assessments_by_benchmark.get(bench.id))
    return entry


def build_gap_report(skater_id, standard, assessments_by_benchmark, metrics) -> dict:
    """Assemble the full gap report grouped by pillar (deterministic ordering)."""
    pillars: dict[str, list] = {}
    for bench in standard.benchmarks:
        pillars.setdefault(bench.pillar, []).append(
            _benchmark_entry(bench, assessments_by_benchmark, metrics)
        )
    return {
        "skater_id": skater_id,
        "target_standard_id": str(standard.id),
        "pillars": pillars,
    }
