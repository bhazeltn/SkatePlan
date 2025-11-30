from .users import UserSerializer, RegisterSerializer, LoginSerializer
from .core import FederationSerializer, SkatingElementSerializer
from .skaters import (
    SkaterSerializer,
    SkaterUpdateSerializer,
    RosterSkaterSerializer,
    TeamSerializer,
    SynchroTeamSerializer,
    SimpleSkaterSerializer,
    SimpleSynchroTeamSerializer,
    SinglesEntitySerializer,
    SoloDanceEntitySerializer,
    GenericPlanningEntitySerializer,
    AthleteProfileSerializer,
)
from .planning import (
    AthleteSeasonSerializer,
    MacrocycleSerializer,
    YearlyPlanSerializer,
    WeeklyPlanSerializer,
    GoalSerializer,
    GapAnalysisSerializer,
)
from .logs import SessionLogSerializer, InjuryLogSerializer
from .competitions import (
    CompetitionSerializer,
    CompetitionResultSerializer,
    SkaterTestSerializer,
    ProgramSerializer,
    ProgramAssetSerializer,
)

from .logistics import (
    TeamTripSerializer,
    ItineraryItemSerializer,
    HousingAssignmentSerializer,
)
