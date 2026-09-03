"""Federation competition-level lookup routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.federation import CompetitionLevel, Federation, FederationStream
from app.schemas.federation import FederationLevelsOut, LevelOut, StreamOut

router = APIRouter(prefix="/federations", tags=["federations"])


def _levels_for(stream_id: int, db: Session) -> list[LevelOut]:
    rows = db.execute(
        select(CompetitionLevel)
        .where(CompetitionLevel.stream_id == stream_id)
        .order_by(CompetitionLevel.sort_order)
    ).scalars().all()
    return [
        LevelOut(
            level_name=r.level_name,
            sort_order=r.sort_order,
            is_adult=r.is_adult,
            isu_anchor=r.isu_anchor,
        )
        for r in rows
    ]


@router.get("/{code}/levels", response_model=FederationLevelsOut)
def get_federation_levels(code: str, db: Session = Depends(get_db)) -> FederationLevelsOut:
    federation = db.execute(
        select(Federation).where(Federation.code == code)
    ).scalar_one_or_none()
    if federation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Federation {code} not found"
        )
    streams = db.execute(
        select(FederationStream).where(FederationStream.federation_code == code)
    ).scalars().all()
    return FederationLevelsOut(
        federation_code=federation.code,
        federation_name=federation.name,
        streams=[
            StreamOut(
                stream_name=s.stream_name,
                stream_display=s.stream_display,
                discipline=s.discipline,
                levels=_levels_for(s.stream_id, db),
            )
            for s in streams
        ],
    )
