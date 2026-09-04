"""Read schemas for the coach-facing skater roster list and profile hub."""
from pydantic import BaseModel, ConfigDict


class SkaterSummaryOut(BaseModel):
    """Identity summary shared by the roster list and the profile header."""

    skater_id: int
    first_name: str
    last_name: str
    home_club: str | None = None
    competitive_level: str | None = None
    federation_name: str | None = None
    country_code: str | None = None
    has_active_restriction: bool


class SkaterProgramOut(BaseModel):
    """A saved program layout shown on the Programs tab."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    program_type: str
    title: str
    season: str | None = None


class SkaterRestrictionOut(BaseModel):
    """An active load restriction shown on the Health & Load tab."""

    id: str
    title: str
    restrictions: str | None = None
    status: str


class SkaterDetailOut(SkaterSummaryOut):
    """Full skater profile: summary + restrictions + programs."""

    restrictions: list[SkaterRestrictionOut]
    programs: list[SkaterProgramOut]
