"""Program + ordered program-element CRUD routes (Sprint 2)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import SystemRole
from app.models.program import Program, ProgramElement
from app.models.user import User
from app.schemas.program import (
    ProgramCreate,
    ProgramElementOut,
    ProgramElementsUpdate,
    ProgramOut,
)

router = APIRouter(prefix="/programs", tags=["programs"])


def require_coach(current_user: User = Depends(get_current_user)) -> User:
    if current_user.system_role not in (SystemRole.coach, SystemRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coach privileges required"
        )
    return current_user


def _to_out(program: Program) -> ProgramOut:
    elements = [ProgramElementOut.model_validate(e) for e in program.elements]
    return ProgramOut(
        id=program.id,
        skater_id=program.skater_id,
        program_type=program.program_type,
        title=program.title,
        season=program.season,
        music_duration_seconds=program.music_duration_seconds,
        segment_bonus=program.segment_bonus,
        program_elements=elements,
    )


def _get_or_404(program_id: uuid.UUID, db: Session) -> Program:
    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )
    return program


@router.post("", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
def create_program(
    payload: ProgramCreate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> ProgramOut:
    program = Program(
        skater_id=payload.skater_id,
        program_type=payload.program_type,
        title=payload.title,
        season=payload.season,
        music_duration_seconds=payload.music_duration_seconds,
        segment_bonus=payload.segment_bonus,
    )
    for elem in payload.program_elements:
        program.elements.append(ProgramElement(**elem.model_dump()))
    db.add(program)
    db.commit()
    db.refresh(program)
    return _to_out(program)


@router.get("", response_model=list[ProgramOut])
def list_programs(
    _user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ProgramOut]:
    programs = db.execute(select(Program)).scalars().all()
    return [_to_out(p) for p in programs]


@router.get("/{program_id}", response_model=ProgramOut)
def get_program(
    program_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgramOut:
    return _to_out(_get_or_404(program_id, db))


@router.put("/{program_id}/elements", response_model=ProgramOut)
def update_program_elements(
    program_id: uuid.UUID,
    payload: ProgramElementsUpdate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> ProgramOut:
    program = _get_or_404(program_id, db)
    program.elements.clear()
    db.flush()
    for elem in payload.program_elements:
        program.elements.append(ProgramElement(**elem.model_dump()))
    db.commit()
    db.refresh(program)
    return _to_out(program)


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: uuid.UUID,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    db.delete(_get_or_404(program_id, db))
    db.commit()
