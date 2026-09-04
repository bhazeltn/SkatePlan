"""Fully coach-driven custom benchmark routes (Sprint 6).

Coaches define discrete benchmark targets across flexible categories, toggle
their status and delete them. Every route is SafeSport-gated via
``authorize_skater_access``; ``skater_id`` FKs ``users.id`` (mirrors
``GapAssessment``) so the route accepts the athlete's user id.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.api.standards import require_coach
from app.core.database import get_db
from app.models.standard import SkaterBenchmark
from app.models.user import User
from app.schemas.standard import (
    SkaterBenchmarkIn,
    SkaterBenchmarkOut,
    SkaterBenchmarkUpdate,
)

router = APIRouter(prefix="/skaters", tags=["benchmarks"])


def _get_benchmark(bid: uuid.UUID, skater_id: int, db: Session) -> SkaterBenchmark:
    row = db.get(SkaterBenchmark, bid)
    if row is None or row.skater_id != skater_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found"
        )
    return row


@router.post(
    "/{skater_id}/benchmarks",
    response_model=SkaterBenchmarkOut,
    status_code=status.HTTP_201_CREATED,
)
def create_benchmark(
    skater_id: int,
    payload: SkaterBenchmarkIn,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> SkaterBenchmarkOut:
    authorize_skater_access(current_user, skater_id, db)
    row = SkaterBenchmark(skater_id=skater_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return SkaterBenchmarkOut.model_validate(row)


@router.get("/{skater_id}/benchmarks", response_model=list[SkaterBenchmarkOut])
def list_benchmarks(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SkaterBenchmarkOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = (
        select(SkaterBenchmark)
        .where(SkaterBenchmark.skater_id == skater_id)
        .order_by(SkaterBenchmark.category, SkaterBenchmark.created_at)
    )
    rows = db.execute(stmt).scalars().all()
    return [SkaterBenchmarkOut.model_validate(r) for r in rows]


@router.patch("/{skater_id}/benchmarks/{bid}", response_model=SkaterBenchmarkOut)
def update_benchmark(
    skater_id: int,
    bid: uuid.UUID,
    payload: SkaterBenchmarkUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> SkaterBenchmarkOut:
    authorize_skater_access(current_user, skater_id, db)
    row = _get_benchmark(bid, skater_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return SkaterBenchmarkOut.model_validate(row)


@router.delete(
    "/{skater_id}/benchmarks/{bid}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_benchmark(
    skater_id: int,
    bid: uuid.UUID,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    authorize_skater_access(current_user, skater_id, db)
    row = _get_benchmark(bid, skater_id, db)
    db.delete(row)
    db.commit()
