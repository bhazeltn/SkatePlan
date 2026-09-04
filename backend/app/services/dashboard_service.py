"""Deterministic Action & Risk Hub aggregation service.

Pure Python — NO LLM, no randomness. Composes a coach's roster, attention
alerts (missing program layouts, at-risk development goals), active load
restrictions and upcoming competitions from existing persisted data.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.competition import Competition, CompetitionEntry
from app.models.federation import CompetitionLevel, Federation
from app.models.injury import InjuryRecord
from app.models.program import Program
from app.models.standard import (
    DevelopmentStandard,
    SkaterBenchmarkAssessment,
    StandardBenchmark,
)
from app.models.training import CoachAssignment, TrainingUnitRoster
from app.models.user import SkaterProfile, User
from app.schemas.dashboard import (
    DashboardAlert,
    DashboardCompetition,
    DashboardOut,
    DashboardRestriction,
    DashboardRosterSkater,
)

_MET = {"acquired", "mastered"}
_UPCOMING_ENTRY_STATUSES = {"confirmed", "prospective"}
_PROGRAM_LABELS = {"SP": "Short", "FS": "Free"}


def _rostered_skaters(coach_id: int, db: Session) -> list[User]:
    """Return the distinct skater users on this coach's training units."""
    stmt = (
        select(User)
        .join(TrainingUnitRoster, TrainingUnitRoster.skater_id == User.id)
        .join(
            CoachAssignment,
            CoachAssignment.training_unit_id == TrainingUnitRoster.training_unit_id,
        )
        .where(CoachAssignment.coach_user_id == coach_id)
        .distinct()
    )
    return list(db.execute(stmt).scalars().all())


def _full_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip()


def _active_injuries(skater_ids: list[int], db: Session) -> list[InjuryRecord]:
    if not skater_ids:
        return []
    stmt = (
        select(InjuryRecord)
        .where(
            InjuryRecord.skater_id.in_(skater_ids),
            InjuryRecord.status == "active",
        )
        .order_by(InjuryRecord.onset_date.desc().nullslast())
    )
    return list(db.execute(stmt).scalars().all())


def _missing_plan_alerts(skaters: list[User], db: Session) -> list[DashboardAlert]:
    """One alert per skater lacking a Short and/or Free program layout."""
    alerts: list[DashboardAlert] = []
    for skater in skaters:
        types = set(
            db.execute(
                select(Program.program_type).where(Program.skater_id == skater.id)
            ).scalars().all()
        )
        missing = [_PROGRAM_LABELS[t] for t in ("SP", "FS") if t not in types]
        if missing:
            alerts.append(
                DashboardAlert(
                    kind="missing_plan",
                    skater_id=skater.id,
                    skater_name=_full_name(skater),
                    message=f"Missing {'/'.join(missing)} layout",
                    severity="warning",
                )
            )
    return alerts


def _behind_count(skater_id: int, standard: DevelopmentStandard, db: Session) -> int:
    """Count benchmarks whose latest assessment is not met (or absent)."""
    bench_ids = [b.id for b in standard.benchmarks]
    if not bench_ids:
        return 0
    stmt = (
        select(SkaterBenchmarkAssessment)
        .where(
            SkaterBenchmarkAssessment.skater_id == skater_id,
            SkaterBenchmarkAssessment.benchmark_id.in_(bench_ids),
        )
        .order_by(SkaterBenchmarkAssessment.assessed_at.desc())
    )
    latest: dict = {}
    for row in db.execute(stmt).scalars().all():
        latest.setdefault(row.benchmark_id, row)
    met = sum(
        1 for bid in bench_ids
        if bid in latest and latest[bid].status in _MET
    )
    return len(bench_ids) - met


def _at_risk_alerts(skaters: list[User], db: Session) -> list[DashboardAlert]:
    """Alert skaters with a target standard and >=1 benchmark behind."""
    alerts: list[DashboardAlert] = []
    for skater in skaters:
        profile = db.get(SkaterProfile, skater.id)
        if profile is None or profile.target_standard_id is None:
            continue
        standard = db.get(DevelopmentStandard, profile.target_standard_id)
        if standard is None:
            continue
        behind = _behind_count(skater.id, standard, db)
        if behind > 0:
            alerts.append(
                DashboardAlert(
                    kind="at_risk_goal",
                    skater_id=skater.id,
                    skater_name=_full_name(skater),
                    message=f"{standard.name} benchmark behind schedule",
                    severity="warning",
                )
            )
    return alerts


def _restrictions(
    skaters: list[User], injuries: list[InjuryRecord]
) -> list[DashboardRestriction]:
    names = {s.id: _full_name(s) for s in skaters}
    return [
        DashboardRestriction(
            skater_id=inj.skater_id,
            skater_name=names.get(inj.skater_id, "Unknown skater"),
            title=inj.title,
            restrictions=inj.restrictions,
            status=inj.status,
        )
        for inj in injuries
    ]


def _upcoming_competitions(
    skaters: list[User], db: Session
) -> list[DashboardCompetition]:
    """Future competitions with confirmed/prospective rostered entries."""
    names = {s.id: _full_name(s) for s in skaters}
    if not names:
        return []
    stmt = (
        select(CompetitionEntry, Competition)
        .join(Competition, Competition.id == CompetitionEntry.competition_id)
        .where(
            CompetitionEntry.skater_id.in_(list(names)),
            CompetitionEntry.status.in_(_UPCOMING_ENTRY_STATUSES),
            Competition.start_date.is_not(None),
            Competition.start_date >= date.today(),
        )
    )
    grouped: dict = {}
    for entry, comp in db.execute(stmt).all():
        item = grouped.setdefault(
            comp.id,
            {"comp": comp, "status": entry.status, "skaters": []},
        )
        item["skaters"].append(names[entry.skater_id])
    rows = sorted(grouped.values(), key=lambda r: r["comp"].start_date)
    return [
        DashboardCompetition(
            competition_id=str(r["comp"].id),
            name=r["comp"].name,
            start_date=r["comp"].start_date,
            entry_status=r["status"],
            skater_names=sorted(r["skaters"]),
        )
        for r in rows
    ]


def _level_name(profile: SkaterProfile | None, db: Session) -> str | None:
    if profile is None or profile.current_level_id is None:
        return None
    level = db.get(CompetitionLevel, profile.current_level_id)
    return level.level_name if level else None


def _fed_info(
    profile: SkaterProfile | None, db: Session
) -> tuple[str | None, str | None]:
    """Return (federation_name, iso_country_code) for a skater profile."""
    if profile is None or profile.federation_id is None:
        return None, None
    fed = db.get(Federation, profile.federation_id)
    if fed is None:
        return None, None
    return fed.name, fed.iso_code


def _build_roster(
    skaters: list[User], injuries: list[InjuryRecord], db: Session
) -> list[DashboardRosterSkater]:
    restricted_ids = {inj.skater_id for inj in injuries}
    roster: list[DashboardRosterSkater] = []
    for skater in sorted(skaters, key=lambda u: (u.last_name, u.first_name)):
        profile = db.get(SkaterProfile, skater.id)
        fed_name, country_code = _fed_info(profile, db)
        roster.append(
            DashboardRosterSkater(
                skater_id=skater.id,
                first_name=skater.first_name,
                last_name=skater.last_name,
                home_club=profile.home_club if profile else None,
                level_name=_level_name(profile, db),
                competitive_level=profile.competitive_level if profile else None,
                federation_name=fed_name,
                country_code=country_code,
                has_active_restriction=skater.id in restricted_ids,
            )
        )
    return roster


def build_dashboard(coach_id: int, db: Session) -> DashboardOut:
    """Assemble the full Action & Risk Hub payload for a coach."""
    skaters = _rostered_skaters(coach_id, db)
    skater_ids = [s.id for s in skaters]
    injuries = _active_injuries(skater_ids, db)
    alerts = _missing_plan_alerts(skaters, db) + _at_risk_alerts(skaters, db)
    return DashboardOut(
        roster=_build_roster(skaters, injuries, db),
        alerts=alerts,
        restrictions=_restrictions(skaters, injuries),
        upcoming_competitions=_upcoming_competitions(skaters, db),
    )
