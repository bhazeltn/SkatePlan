"""Model registry — import all models so Alembic autogenerate sees them."""
from app.core.database import Base
from app.models.audit import SafeSportTextHistoryLedger
from app.models.competition import (
    Competition,
    CompetitionEntry,
    CompetitionExecutedElement,
    CompetitionSegmentResult,
)
from app.models.federation import CompetitionLevel, Federation, FederationStream
from app.models.grant import ExternalAccessGrant
from app.models.injury import InjuryRecord
from app.models.meeting import CoachMeeting
from app.models.program import Program, ProgramElement
from app.models.standard import (
    DevelopmentStandard,
    GapAssessment,
    SkaterBenchmark,
    SkaterBenchmarkAssessment,
    StandardBenchmark,
)
from app.models.scoring import ScaleOfValues
from app.models.session import TrainingSession
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.training_log import JumpAttemptLog, TrainingSessionLog
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
    "TrainingSessionLog",
    "JumpAttemptLog",
    "Program",
    "ProgramElement",
    "Competition",
    "CompetitionEntry",
    "CompetitionSegmentResult",
    "CompetitionExecutedElement",
    "InjuryRecord",
    "CoachMeeting",
    "DevelopmentStandard",
    "StandardBenchmark",
    "SkaterBenchmarkAssessment",
    "SkaterBenchmark",
    "GapAssessment",
]
