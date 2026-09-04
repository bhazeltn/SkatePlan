"""Development-standard, assessment & gap-analysis routes (Sprint 5).

SafeSport gating: every skater-scoped route calls ``authorize_skater_access``.
The gap analysis is fully deterministic (see app.services.gap_service).
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.models.enums import SystemRole
from app.models.standard import (
    DevelopmentStandard,
    GapAssessment,
    SkaterBenchmarkAssessment,
    StandardBenchmark,
)
from app.models.user import SkaterProfile, User
from app.schemas.standard import (
    AssessmentIn,
    AssessmentOut,
    BenchmarkTemplateOut,
    GapAnalysisOut,
    GapAssessmentIn,
    StandardCreate,
    StandardOut,
    TargetStandardIn,
)
from app.services.benchmark_templates import list_templates, serialize_assessment
from app.services.gap_service import build_gap_report, measured_metrics

router = APIRouter(prefix="/standards", tags=["standards"])
skater_router = APIRouter(prefix="/skaters", tags=["standards"])


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role not in (SystemRole.coach, SystemRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coach privileges required"
        )
    return current_user


def _get_or_create_profile(skater_id: int, db: Session) -> SkaterProfile:
    profile = db.get(SkaterProfile, skater_id)
    if profile is None:
        profile = SkaterProfile(skater_id=skater_id)
        db.add(profile)
    return profile


@router.post("", response_model=StandardOut, status_code=status.HTTP_201_CREATED)
def create_standard(
    payload: StandardCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> StandardOut:
    standard = DevelopmentStandard(
        name=payload.name,
        framework_type=payload.framework_type,
        description=payload.description,
        coach_id=current_user.id,
    )
    for bench in payload.benchmarks:
        standard.benchmarks.append(StandardBenchmark(**bench.model_dump()))
    db.add(standard)
    db.commit()
    db.refresh(standard)
    return StandardOut.model_validate(standard)


@router.get("/templates", response_model=list[BenchmarkTemplateOut])
def benchmark_templates(
    current_user: User = Depends(get_current_user),
) -> list[BenchmarkTemplateOut]:
    """Federation-neutral competitive exit-standard templates."""
    return [BenchmarkTemplateOut.model_validate(t) for t in list_templates()]


@skater_router.put("/{skater_id}/target-standard", response_model=dict)
def set_target_standard(
    skater_id: int,
    payload: TargetStandardIn,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> dict:
    authorize_skater_access(current_user, skater_id, db)
    if db.get(DevelopmentStandard, payload.target_standard_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
    profile = _get_or_create_profile(skater_id, db)
    profile.target_standard_id = payload.target_standard_id
    db.commit()
    return {"skater_id": skater_id, "target_standard_id": str(payload.target_standard_id)}


@skater_router.post(
    "/{skater_id}/assessments",
    response_model=AssessmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment(
    skater_id: int,
    payload: AssessmentIn,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> AssessmentOut:
    authorize_skater_access(current_user, skater_id, db)
    if db.get(StandardBenchmark, payload.benchmark_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found")
    assessment = SkaterBenchmarkAssessment(
        skater_id=skater_id,
        benchmark_id=payload.benchmark_id,
        status=payload.status,
        score=payload.score,
        assessment_notes=payload.notes,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return AssessmentOut.model_validate(assessment)


def _latest_assessments(skater_id: int, benchmark_ids, db: Session) -> dict:
    """Return {benchmark_id: latest assessment} for a skater (newest wins)."""
    if not benchmark_ids:
        return {}
    stmt = (
        select(SkaterBenchmarkAssessment)
        .where(
            SkaterBenchmarkAssessment.skater_id == skater_id,
            SkaterBenchmarkAssessment.benchmark_id.in_(benchmark_ids),
        )
        .order_by(SkaterBenchmarkAssessment.assessed_at.desc())
    )
    latest: dict = {}
    for row in db.execute(stmt).scalars().all():
        latest.setdefault(row.benchmark_id, row)
    return latest


def _latest_gap_assessment(skater_id: int, db: Session) -> GapAssessment | None:
    """Return the newest saved interactive assessment for a skater, if any."""
    stmt = (
        select(GapAssessment)
        .where(GapAssessment.skater_id == skater_id)
        .order_by(GapAssessment.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def _pillar_report(skater_id: int, db: Session) -> dict:
    """Build the target-standard pillar report (empty when no target set)."""
    profile = db.get(SkaterProfile, skater_id)
    if profile is None or profile.target_standard_id is None:
        return {}
    standard = db.get(DevelopmentStandard, profile.target_standard_id)
    if standard is None:
        return {}
    benchmark_ids = [b.id for b in standard.benchmarks]
    assessments = _latest_assessments(skater_id, benchmark_ids, db)
    metrics = measured_metrics(skater_id, db)
    return build_gap_report(skater_id, standard, assessments, metrics)


@skater_router.post(
    "/{skater_id}/gap-analysis",
    response_model=GapAnalysisOut,
    status_code=status.HTTP_201_CREATED,
)
def create_gap_analysis(
    skater_id: int,
    payload: GapAssessmentIn,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> GapAnalysisOut:
    authorize_skater_access(current_user, skater_id, db)
    row = GapAssessment(
        skater_id=skater_id,
        benchmark_framework=payload.benchmark_framework,
        pillar_scores=payload.pillar_scores,
        coach_notes=payload.coach_notes,
        evaluation_date=date.fromisoformat(payload.evaluation_date)
        if payload.evaluation_date
        else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return GapAnalysisOut(
        skater_id=skater_id, latest_assessment=serialize_assessment(row)
    )


@skater_router.get("/{skater_id}/gap-analysis", response_model=GapAnalysisOut)
def gap_analysis(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GapAnalysisOut:
    authorize_skater_access(current_user, skater_id, db)
    report = _pillar_report(skater_id, db)
    latest = _latest_gap_assessment(skater_id, db)
    if not report and latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No target standard set"
        )
    return GapAnalysisOut(
        skater_id=skater_id,
        target_standard_id=report.get("target_standard_id"),
        pillars=report.get("pillars", {}),
        latest_assessment=serialize_assessment(latest) if latest else None,
    )

