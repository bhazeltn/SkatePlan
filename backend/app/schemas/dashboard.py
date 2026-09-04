"""Read-only Action & Risk Hub dashboard aggregation schemas."""
from datetime import date

from pydantic import BaseModel


class DashboardAlert(BaseModel):
    """A single attention item (missing plan or at-risk goal)."""

    kind: str  # 'missing_plan' | 'at_risk_goal'
    skater_id: int
    skater_name: str
    message: str
    severity: str  # 'warning' | 'danger'


class DashboardRestriction(BaseModel):
    """An active load restriction from an open injury record."""

    skater_id: int
    skater_name: str
    title: str
    restrictions: str | None = None
    status: str


class DashboardCompetition(BaseModel):
    """An upcoming competition with confirmed/prospective rostered entries."""

    competition_id: str
    name: str
    start_date: date | None = None
    entry_status: str
    skater_names: list[str]


class DashboardRosterSkater(BaseModel):
    """A rostered skater card summary."""

    skater_id: int
    first_name: str
    last_name: str
    home_club: str | None = None
    level_name: str | None = None
    has_active_restriction: bool


class DashboardOut(BaseModel):
    """Aggregated coach dashboard payload."""

    roster: list[DashboardRosterSkater]
    alerts: list[DashboardAlert]
    restrictions: list[DashboardRestriction]
    upcoming_competitions: list[DashboardCompetition]
