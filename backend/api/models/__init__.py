# Import everything to expose it at api.models
from .users import User, UserManager
from .core import Federation, SkatingElement

# ADDED AthleteProfile below
from .skaters import (
    Skater,
    AthleteProfile,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    PlanningEntityAccess,
)
from .planning import (
    AthleteSeason,
    YearlyPlan,
    Macrocycle,
    WeeklyPlan,
    Goal,
    GapAnalysis,
)
from .logs import SessionLog, InjuryLog, MeetingLog
from .competitions import (
    Competition,
    CompetitionResult,
    SkaterTest,
    Program,
    ProgramAsset,
)

from .logistics import TeamTrip, ItineraryItem, HousingAssignment
