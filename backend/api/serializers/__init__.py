from .users import UserSerializer, RegisterSerializer, LoginSerializer
from .core import FederationSerializer, SkatingElementSerializer
from .skaters import (
    SimpleSkaterSerializer,
    SinglesEntitySerializer,
    SoloDanceEntitySerializer,
    TeamSerializer,
    SynchroTeamSerializer,
    GenericPlanningEntitySerializer,
    SkaterUpdateSerializer,
    SkaterSerializer,
    RosterSkaterSerializer,
    AthleteProfileSerializer,
)
from .planning import (
    AthleteSeasonSerializer,
    MacrocycleSerializer,
    YearlyPlanSerializer,
    WeeklyPlanSerializer,
    GoalSerializer,
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
