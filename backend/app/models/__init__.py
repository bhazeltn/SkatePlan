"""Model registry — import all models so Alembic autogenerate sees them."""
from app.core.database import Base
from app.models.audit import SafeSportTextHistoryLedger
from app.models.federation import CompetitionLevel, Federation, FederationStream
from app.models.grant import ExternalAccessGrant
from app.models.scoring import ScaleOfValues
from app.models.session import TrainingSession
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
    "Federation",
    "FederationStream",
    "CompetitionLevel",
    "ExternalAccessGrant",
    "TrainingSession",
]
