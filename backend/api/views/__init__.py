from .auth import RegisterView, LoginView, UserProfileView
from .core import (
    FederationList,
    SkatingElementList,
    RevokeAccessView,
    UnlinkAthleteView,
)
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
    GapAnalysisRetrieveUpdateView,
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
    SynchroProgramListCreateView,
    ProgramAssetCreateView,
    ProgramAssetDestroyView,
)
from .dashboard import (
    CoachDashboardStatsView,
    SkaterStatsView,
    TeamStatsView,
    SynchroStatsView,
)

from .logistics import (
    SynchroTripListCreateView,
    SkaterTripListView,
    TeamTripDetailView,
    ItineraryListCreateView,
    ItineraryDetailView,
    HousingListCreateView,
    HousingDetailView,
)

from .invitations import SendInviteView, AcceptInviteView
