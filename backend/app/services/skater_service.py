"""Coach-facing skater roster + profile hub read service.

Pure aggregation over existing persisted data — no LLM, no randomness.
Reuses the dashboard service's roster membership query so the roster list and
the dashboard stay consistent.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.federation import Federation
from app.models.injury import InjuryRecord
from app.models.program import Program
from app.models.user import SkaterProfile, User
from app.schemas.skater_detail import (
    SkaterDetailOut,
    SkaterProgramOut,
    SkaterRestrictionOut,
    SkaterSummaryOut,
)
from app.services.dashboard_service import _rostered_skaters


def _fed_info(
    profile: SkaterProfile | None, db: Session
) -> tuple[str | None, str | None]:
    if profile is None or profile.federation_id is None:
        return None, None
    fed = db.get(Federation, profile.federation_id)
    return (fed.name, fed.iso_code) if fed else (None, None)


def _active_restrictions(skater_id: int, db: Session) -> list[InjuryRecord]:
    stmt = (
        select(InjuryRecord)
        .where(
            InjuryRecord.skater_id == skater_id,
            InjuryRecord.status == "active",
        )
        .order_by(InjuryRecord.onset_date.desc().nullslast())
    )
    return list(db.execute(stmt).scalars().all())


def _summary(user: User, profile: SkaterProfile | None, db: Session) -> dict:
    fed_name, country_code = _fed_info(profile, db)
    has_active = bool(_active_restrictions(user.id, db))
    return {
        "skater_id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "home_club": profile.home_club if profile else None,
        "competitive_level": profile.competitive_level if profile else None,
        "federation_name": fed_name,
        "country_code": country_code,
        "has_active_restriction": has_active,
    }


def list_coach_skaters(coach_id: int, db: Session) -> list[SkaterSummaryOut]:
    """Return summaries for every skater on the coach's training units."""
    skaters = sorted(
        _rostered_skaters(coach_id, db),
        key=lambda u: (u.last_name or "", u.first_name or ""),
    )
    out: list[SkaterSummaryOut] = []
    for user in skaters:
        profile = db.get(SkaterProfile, user.id)
        out.append(SkaterSummaryOut(**_summary(user, profile, db)))
    return out


def _programs(skater_id: int, db: Session) -> list[SkaterProgramOut]:
    rows = (
        db.execute(select(Program).where(Program.skater_id == skater_id))
        .scalars()
        .all()
    )
    return [
        SkaterProgramOut(
            id=str(p.id),
            program_type=p.program_type,
            title=p.title,
            season=p.season,
        )
        for p in rows
    ]


def get_skater_detail(skater_id: int, db: Session) -> SkaterDetailOut | None:
    """Return the full profile hub payload, or None if the skater is unknown."""
    user = db.get(User, skater_id)
    if user is None:
        return None
    profile = db.get(SkaterProfile, skater_id)
    restrictions = [
        SkaterRestrictionOut(
            title=inj.title, restrictions=inj.restrictions, status=inj.status
        )
        for inj in _active_restrictions(skater_id, db)
    ]
    return SkaterDetailOut(
        **_summary(user, profile, db),
        restrictions=restrictions,
        programs=_programs(skater_id, db),
    )
