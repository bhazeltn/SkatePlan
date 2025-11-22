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
    CreateTeamView,
    TeamListView,
    CreateSynchroTeamView,
    SynchroTeamListView,
    SynchroTeamDetailView,
)
from .planning import (
    AthleteSeasonList,
    AthleteSeasonDetailView,
    YearlyPlanListCreateView,
    YearlyPlanDetailView,
    TeamYearlyPlanListCreateView,
    SynchroYearlyPlanListCreateView,
    MacrocycleListCreateView,
    MacrocycleDetailView,
    WeeklyPlanListView,
    WeeklyPlanDetailView,
    MasterWeeklyPlanView,
    TeamMasterWeeklyPlanView,
    GoalListCreateByPlanView,
    GoalListBySkaterView,
    GoalListByTeamView,
    SynchroGoalListCreateView,
    GoalDetailView,
)
from .logs import (
    SessionLogListCreateView,
    SessionLogDetailView,
    SessionLogListCreateByTeamView,
    SynchroSessionLogListCreateView,
    InjuryLogListCreateView,
    InjuryLogDetailView,
    InjuryLogListCreateByTeamView,
    SynchroInjuryLogListCreateView,
)
from .competitions import (
    CompetitionListCreateView,
    CompetitionResultListCreateView,
    CompetitionResultDetailView,
    CompetitionResultListByTeamView,
    SynchroCompetitionResultListCreateView,
    SkaterTestListCreateView,
    SkaterTestDetailView,
    ProgramListCreateView,
    ProgramDetailView,
    ProgramListCreateByTeamView,
    SynchroProgramListCreateView,  # <--- ADD THIS
)
from .dashboard import (
    CoachDashboardStatsView,
    SkaterStatsView,
    TeamStatsView,
    SynchroStatsView,
)
