"""Deterministic benchmark templates + gap delta-flag computation (Sprint 4).

Pure Python — NO LLM, no randomness. Federation-NEUTRAL competitive templates
for the three competitive singles levels. Coaches score four pillars against an
ordinal scale; a pillar below the competitive exit target counts as a gap.
"""
from app.models.standard import GapAssessment

# Ordinal scoring scale shared by the UI and the delta computation.
SCORE_RANK: dict[str, int] = {
    "Not Introduced": 0,
    "Acquiring": 1,
    "Meeting Standard": 2,
    "Exceeding": 3,
}

# Competitive exit target: a pillar must reach "Meeting Standard" to be met.
EXIT_TARGET = "Meeting Standard"
PILLARS = ("technical", "skating_skills", "physical", "performance")

_LEVELS = [
    ("novice", "Novice", "Novice Level Benchmark Standard - Development Track"),
    ("junior", "Junior", "Junior Level Benchmark Standard - International Track"),
    ("senior", "Senior", "Senior Level Benchmark Standard - Elite Track"),
]


def list_templates() -> list[dict]:
    """Return federation-neutral exit-standard templates (deterministic order)."""
    return [
        {
            "key": key,
            "level": level,
            "label": label,
            "pillar_targets": {p: EXIT_TARGET for p in PILLARS},
        }
        for key, level, label in _LEVELS
    ]


def _flag(pillar: str, score: str) -> dict:
    """Build a single pillar delta flag against the competitive exit target."""
    rank = SCORE_RANK.get(score, 0)
    return {
        "pillar": pillar,
        "score": score,
        "target": EXIT_TARGET,
        "met": rank >= SCORE_RANK[EXIT_TARGET],
    }


def serialize_assessment(row: "GapAssessment") -> dict:
    """Serialize a saved assessment with deterministic delta flags + counts."""
    scores = row.pillar_scores or {}
    flags = [_flag(pillar, scores[pillar]) for pillar in scores]
    met = sum(1 for f in flags if f["met"])
    return {
        "id": str(row.id),
        "skater_id": row.skater_id,
        "benchmark_framework": row.benchmark_framework,
        "evaluation_date": row.evaluation_date.isoformat()
        if row.evaluation_date
        else None,
        "pillar_scores": scores,
        "coach_notes": row.coach_notes,
        "delta_flags": flags,
        "gaps_identified": len(flags) - met,
        "benchmarks_met": met,
    }
