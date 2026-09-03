"""External portfolio response schemas."""
from pydantic import BaseModel


class PortfolioSkaterOut(BaseModel):
    name: str
    injury_log: str
    session_durations: list[int]


class PortfolioOut(BaseModel):
    training_unit_id: int
    access_tier: str
    skater: PortfolioSkaterOut
