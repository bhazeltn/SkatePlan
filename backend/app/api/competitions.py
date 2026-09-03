"""Competition CRUD, entries, results and protocol routes (Sprint 3).

Deterministic arithmetic only — no ISU rule verification, no LLM, no exports.
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.competition import (
    Competition,
    CompetitionEntry,
    CompetitionExecutedElement,
    CompetitionSegmentResult,
)
from app.models.enums import SystemRole
from app.models.program import Program
from app.models.user import User
from app.schemas.competition import (
    CompetitionCreate,
    CompetitionOut,
    EntryCreate,
    EntryOut,
    ProtocolOut,
    ResultCreate,
    SegmentResultOut,
)
from app.services.competition_service import (
    build_segment_comparison,
    compute_segment_tss,
)

router = APIRouter(prefix="/competitions", tags=["competitions"])
skater_router = APIRouter(prefix="/skaters", tags=["competitions"])


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role not in (SystemRole.coach, SystemRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coach privileges required"
        )
    return current_user


def _get_competition(competition_id: uuid.UUID, db: Session) -> Competition:
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")
    return comp


def _get_entry(entry_id: uuid.UUID, db: Session) -> CompetitionEntry:
    entry = db.get(CompetitionEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


def _validate_program_owner(program_id, skater_id: int, db: Session) -> None:
    if program_id is None:
        return
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Program not found")
    if program.skater_id != skater_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Program does not belong to this skater",
        )


@router.post("", response_model=CompetitionOut, status_code=status.HTTP_201_CREATED)
def create_competition(
    payload: CompetitionCreate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> CompetitionOut:
    comp = Competition(**payload.model_dump())
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return CompetitionOut.model_validate(comp)


@router.get("", response_model=list[CompetitionOut])
def list_competitions(
    season: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CompetitionOut]:
    stmt = select(Competition)
    if season is not None:
        stmt = stmt.where(Competition.season == season)
    if date_from is not None:
        stmt = stmt.where(Competition.start_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Competition.end_date <= date_to)
    comps = db.execute(stmt).scalars().all()
    return [CompetitionOut.model_validate(c) for c in comps]


@router.get("/{competition_id}", response_model=CompetitionOut)
def get_competition(
    competition_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetitionOut:
    return CompetitionOut.model_validate(_get_competition(competition_id, db))


@router.post(
    "/{competition_id}/entries",
    response_model=EntryOut,
    status_code=status.HTTP_201_CREATED,
)
def register_entry(
    competition_id: uuid.UUID,
    payload: EntryCreate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> EntryOut:
    _get_competition(competition_id, db)
    _validate_program_owner(payload.sp_program_id, payload.skater_id, db)
    _validate_program_owner(payload.fs_program_id, payload.skater_id, db)
    entry = CompetitionEntry(competition_id=competition_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return EntryOut.model_validate(entry)


def _build_result(entry_id: uuid.UUID, payload: ResultCreate) -> CompetitionSegmentResult:
    result = CompetitionSegmentResult(
        entry_id=entry_id,
        segment=payload.segment,
        tes=payload.tes,
        pcs=payload.pcs,
        deductions=payload.deductions,
        segment_bonus=payload.segment_bonus,
        tss=compute_segment_tss(
            payload.tes, payload.pcs, payload.deductions, payload.segment_bonus
        ),
        segment_rank=payload.segment_rank,
        overall_rank=payload.overall_rank,
        protocol_notes=payload.protocol_notes,
    )
    for ex in payload.executed_elements:
        result.executed_elements.append(
            CompetitionExecutedElement(
                segment_order=ex.segment_order,
                called_code=ex.called_code,
                base_value=ex.base_value,
                earned_goe=ex.goe,
                info_flags=ex.info_flags,
            )
        )
    return result


@router.post(
    "/entries/{entry_id}/results",
    response_model=SegmentResultOut,
    status_code=status.HTTP_201_CREATED,
)
def record_result(
    entry_id: uuid.UUID,
    payload: ResultCreate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> SegmentResultOut:
    _get_entry(entry_id, db)
    result = _build_result(entry_id, payload)
    db.add(result)
    db.commit()
    db.refresh(result)
    return SegmentResultOut.model_validate(result)


@router.get("/entries/{entry_id}/protocol", response_model=ProtocolOut)
def get_protocol(
    entry_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProtocolOut:
    entry = _get_entry(entry_id, db)
    segments = [SegmentResultOut.model_validate(r) for r in entry.results]
    return ProtocolOut(entry_id=entry.id, segments=segments)


@router.get("/entries/{entry_id}/comparison")
def get_comparison(
    entry_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    entry = _get_entry(entry_id, db)
    comparisons = [build_segment_comparison(entry, r, db) for r in entry.results]
    total = round(sum(c["total_base_differential"] for c in comparisons), 2)
    return {
        "entry_id": str(entry.id),
        "comparisons": comparisons,
        "total_base_differential": total,
    }


@skater_router.get("/{skater_id}/competitions", response_model=list[EntryOut])
def get_skater_competitions(
    skater_id: int,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EntryOut]:
    stmt = select(CompetitionEntry).where(CompetitionEntry.skater_id == skater_id)
    entries = db.execute(stmt).scalars().all()
    return [EntryOut.model_validate(e) for e in entries]
