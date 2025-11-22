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
    CreateSynchroTeamView,
    SynchroTeamListView,
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
    GoalListByTeamView,
    TeamMasterWeeklyPlanView,
    SynchroYearlyPlanListCreateView,
    SynchroGoalListCreateView,
)
from .logs import (
    SessionLogListCreateView,
    SessionLogDetailView,
    InjuryLogListCreateView,
    InjuryLogDetailView,
    SessionLogListCreateByTeamView,
    InjuryLogListCreateByTeamView,
    SynchroInjuryLogListCreateView,
)
from .competitions import (
    CompetitionListCreateView,
    CompetitionResultListCreateView,
    CompetitionResultDetailView,
    SkaterTestListCreateView,
    SkaterTestDetailView,
    ProgramListCreateView,
    ProgramDetailView,
    CompetitionResultListByTeamView,
    ProgramListCreateByTeamView,
)
from .dashboard import CoachDashboardStatsView, SkaterStatsView, TeamStatsView
