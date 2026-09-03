"""Training session, attempt-logging and analytics routes (Sprint 4).

SafeSport-gated: every endpoint authorizes the caller against the target
skater via ``authorize_skater_access``. Analytics are pure deterministic math.
"""
import uuid
from datetime import date
from typing import Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.models.training_log import JumpAttemptLog, TrainingSessionLog
from app.models.user import User
from app.schemas.training import (
    AttemptIn,
    AttemptOut,
    MetricsOut,
    SessionCreate,
    SessionOut,
)
from app.services.training_service import (
    aggregate_attempt_success_rates,
    calculate_workload_metrics,
)

session_router = APIRouter(prefix="/sessions", tags=["training"])
skater_router = APIRouter(prefix="/skaters", tags=["training"])


def _get_session(session_id: uuid.UUID, db: Session) -> TrainingSessionLog:
    session = db.get(TrainingSessionLog, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def _sessions_in_range(skater_id, start_date, end_date, db) -> list[TrainingSessionLog]:
    stmt = select(TrainingSessionLog).where(TrainingSessionLog.skater_id == skater_id)
    if start_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date <= end_date)
    return list(db.execute(stmt).scalars().all())


def _attempts_for_sessions(session_ids, db) -> list[JumpAttemptLog]:
    if not session_ids:
        return []
    stmt = select(JumpAttemptLog).where(JumpAttemptLog.session_id.in_(session_ids))
    return list(db.execute(stmt).scalars().all())


@session_router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    authorize_skater_access(current_user, payload.skater_id, db)
    session = TrainingSessionLog(**payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


@session_router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    return SessionOut.model_validate(session)


@session_router.post(
    "/{session_id}/attempts",
    response_model=list[AttemptOut],
    status_code=status.HTTP_201_CREATED,
)
def log_attempts(
    session_id: uuid.UUID,
    payload: Union[AttemptIn, list[AttemptIn]],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttemptOut]:
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    items = payload if isinstance(payload, list) else [payload]
    created = [JumpAttemptLog(session_id=session_id, **i.model_dump()) for i in items]
    db.add_all(created)
    db.commit()
    for row in created:
        db.refresh(row)
    return [AttemptOut.model_validate(r) for r in created]


@session_router.get("/{session_id}/attempts", response_model=list[AttemptOut])
def list_attempts(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttemptOut]:
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    stmt = (
        select(JumpAttemptLog)
        .where(JumpAttemptLog.session_id == session_id)
        .order_by(JumpAttemptLog.created_at)
    )
    return [AttemptOut.model_validate(r) for r in db.execute(stmt).scalars().all()]


@skater_router.get("/{skater_id}/sessions", response_model=list[SessionOut])
def list_skater_sessions(
    skater_id: int,
    session_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = select(TrainingSessionLog).where(TrainingSessionLog.skater_id == skater_id)
    if session_type is not None:
        stmt = stmt.where(TrainingSessionLog.session_type == session_type)
    if start_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date <= end_date)
    stmt = stmt.order_by(TrainingSessionLog.session_date)
    return [SessionOut.model_validate(r) for r in db.execute(stmt).scalars().all()]


@skater_router.get("/{skater_id}/training/metrics", response_model=MetricsOut)
def training_metrics(
    skater_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MetricsOut:
    authorize_skater_access(current_user, skater_id, db)
    sessions = _sessions_in_range(skater_id, start_date, end_date, db)
    attempts = _attempts_for_sessions([s.id for s in sessions], db)
    metrics = calculate_workload_metrics(sessions)
    stats = aggregate_attempt_success_rates(attempts)
    return MetricsOut(skater_id=skater_id, element_stats=stats, **metrics)
