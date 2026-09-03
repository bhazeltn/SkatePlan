"""Deterministic training analytics (Sprint 4).

Pure Python arithmetic — NO LLM, no randomness. Two aggregations:

* ``calculate_workload_metrics`` — total ice time, session count, average RPE
  and the training workload index = sum(duration_minutes * rpe).
* ``aggregate_attempt_success_rates`` — per element_code totals and clean %.

Interpretation (documented so tests + impl agree): an attempt row may represent
a BATCH via ``attempts_count``. "total attempts" therefore sums ``attempts_count``
across rows for an element; "clean count" sums ``attempts_count`` for rows whose
outcome is exactly ``'clean'``. Clean percentage is rounded to 1 decimal place.
"""


def calculate_workload_metrics(sessions) -> dict:
    """Deterministic workload aggregation over a list of session rows."""
    count = len(sessions)
    total_minutes = sum(s.duration_minutes for s in sessions)
    workload = sum(s.duration_minutes * s.rpe for s in sessions)
    average_rpe = round(sum(s.rpe for s in sessions) / count, 2) if count else 0.0
    return {
        "total_ice_minutes": total_minutes,
        "session_count": count,
        "workload_index": workload,
        "average_rpe": average_rpe,
    }


def aggregate_attempt_success_rates(attempts) -> list[dict]:
    """Group attempts by element_code; compute totals and clean percentage."""
    groups: dict[str, list[int]] = {}
    for a in attempts:
        totals = groups.setdefault(a.element_code, [0, 0])
        totals[0] += a.attempts_count
        if a.outcome == "clean":
            totals[1] += a.attempts_count
    stats = []
    for code in sorted(groups):
        total, clean = groups[code]
        pct = round(clean / total * 100, 1) if total else 0.0
        stats.append({
            "element_code": code,
            "total_attempts": total,
            "clean_count": clean,
            "clean_percentage": pct,
        })
    return stats
