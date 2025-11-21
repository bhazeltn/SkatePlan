from .auth import RegisterView, LoginView, UserProfileView
from .core import FederationList, SkatingElementList
from .skaters import (
    CreateSkaterView,
    SkaterDetailView,
    RosterView,
    SinglesEntityDetailView,
    SoloDanceEntityDetailView,
    TeamDetailView,
    SynchroTeamDetailView,
    TeamListView,
    CreateTeamView,
)
from .planning import (
    AthleteSeasonList,
    AthleteSeasonDetailView,
    YearlyPlanListCreateView,
    YearlyPlanDetailView,
    MacrocycleListCreateView,
    MacrocycleDetailView,
    WeeklyPlanListView,
    WeeklyPlanDetailView,
    GoalListCreateByPlanView,
    GoalListBySkaterView,
    GoalDetailView,
    TeamYearlyPlanListCreateView,
    MasterWeeklyPlanView,
)
from .logs import (
    SessionLogListCreateView,
    SessionLogDetailView,
    InjuryLogListCreateView,
    InjuryLogDetailView,
)
from .competitions import (
    CompetitionListCreateView,
    CompetitionResultListCreateView,
    CompetitionResultDetailView,
    SkaterTestListCreateView,
    SkaterTestDetailView,
    ProgramListCreateView,
    ProgramDetailView,
)
from .dashboard import CoachDashboardStatsView, SkaterStatsView
