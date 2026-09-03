"""Model registry — import all models so Alembic autogenerate sees them."""
from app.core.database import Base
from app.models.audit import SafeSportTextHistoryLedger
from app.models.scoring import ScaleOfValues
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import AccountProxyLink, SkaterProfile, User

__all__ = [
    "Base",
    "User",
    "SkaterProfile",
    "AccountProxyLink",
    "TrainingUnit",
    "TrainingUnitRoster",
    "CoachAssignment",
    "ScaleOfValues",
    "SafeSportTextHistoryLedger",
]
