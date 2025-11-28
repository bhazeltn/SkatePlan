from django.urls import path
from . import views

urlpatterns = [
    # Auth URLs
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/profile/", views.UserProfileView.as_view(), name="profile"),
    # Skater URLs
    path("skaters/", views.CreateSkaterView.as_view(), name="skater-create"),
    path("skaters/<int:pk>/", views.SkaterDetailView.as_view(), name="skater-detail"),
    path("roster/", views.RosterView.as_view(), name="roster-list"),
    path("federations/", views.FederationList.as_view(), name="federation-list"),
    # Entity Management URLs
    path("entities/singles/<int:pk>/", views.SinglesEntityDetailView.as_view()),
    path("entities/solodance/<int:pk>/", views.SoloDanceEntityDetailView.as_view()),
    path("entities/teams/<int:pk>/", views.TeamDetailView.as_view()),
    path("entities/synchro/<int:pk>/", views.SynchroTeamDetailView.as_view()),
    # Planning URLs
    path("skaters/<int:skater_id>/ytps/", views.YearlyPlanListCreateView.as_view()),
    path("ytps/<int:pk>/", views.YearlyPlanDetailView.as_view()),
    path("ytps/<int:plan_id>/macrocycles/", views.MacrocycleListCreateView.as_view()),
    path("macrocycles/<int:pk>/", views.MacrocycleDetailView.as_view()),
    path("seasons/<int:pk>/", views.AthleteSeasonDetailView.as_view()),
    path("skaters/<int:skater_id>/seasons/", views.AthleteSeasonList.as_view()),
    path("ytps/<int:plan_id>/goals/", views.GoalListCreateByPlanView.as_view()),
    path("goals/<int:pk>/", views.GoalDetailView.as_view()),
    path("skaters/<int:skater_id>/goals/", views.GoalListBySkaterView.as_view()),
    path("seasons/<int:season_id>/weeks/", views.WeeklyPlanListView.as_view()),
    path("weeks/<int:pk>/", views.WeeklyPlanDetailView.as_view()),
    path("skaters/<int:skater_id>/logs/", views.SessionLogListCreateView.as_view()),
    path("logs/<int:pk>/", views.SessionLogDetailView.as_view()),
    path("skaters/<int:skater_id>/injuries/", views.InjuryLogListCreateView.as_view()),
    path("injuries/<int:pk>/", views.InjuryLogDetailView.as_view()),
    path("competitions/", views.CompetitionListCreateView.as_view()),
    # Results & Tests
    path(
        "skaters/<int:skater_id>/results/",
        views.CompetitionResultListCreateView.as_view(),
    ),
    path("results/<int:pk>/", views.CompetitionResultDetailView.as_view()),
    path("skaters/<int:skater_id>/tests/", views.SkaterTestListCreateView.as_view()),
    path("tests/<int:pk>/", views.SkaterTestDetailView.as_view()),
    path("skaters/<int:skater_id>/programs/", views.ProgramListCreateView.as_view()),
    path("programs/<int:pk>/", views.ProgramDetailView.as_view()),
    path("skaters/<int:skater_id>/stats/", views.SkaterStatsView.as_view()),
    path("dashboard/stats/", views.CoachDashboardStatsView.as_view()),
    path("elements/", views.SkatingElementList.as_view()),
    # Team URLs
    path("teams/", views.TeamListView.as_view()),
    path("teams/create/", views.CreateTeamView.as_view()),
    path("teams/<int:pk>/", views.TeamDetailView.as_view()),
    path("teams/<int:team_id>/ytps/", views.TeamYearlyPlanListCreateView.as_view()),
    path("skaters/<int:skater_id>/week-view/", views.MasterWeeklyPlanView.as_view()),
    path("teams/<int:team_id>/goals/", views.GoalListByTeamView.as_view()),
    path(
        "teams/<int:team_id>/results/", views.CompetitionResultListByTeamView.as_view()
    ),
    path("teams/<int:team_id>/stats/", views.TeamStatsView.as_view()),
    path("teams/<int:team_id>/programs/", views.ProgramListCreateByTeamView.as_view()),
    path("teams/<int:team_id>/logs/", views.SessionLogListCreateByTeamView.as_view()),
    path(
        "teams/<int:team_id>/injuries/", views.InjuryLogListCreateByTeamView.as_view()
    ),
    path("teams/<int:team_id>/week-view/", views.TeamMasterWeeklyPlanView.as_view()),
    # Synchro URLs
    path("synchro/create/", views.CreateSynchroTeamView.as_view()),
    path("synchro/<int:pk>/", views.SynchroTeamDetailView.as_view()),
    path("synchro/", views.SynchroTeamListView.as_view()),
    path(
        "synchro/<int:team_id>/ytps/", views.SynchroYearlyPlanListCreateView.as_view()
    ),
    path(
        "synchro/<int:team_id>/injuries/",
        views.SynchroInjuryLogListCreateView.as_view(),
    ),
    path("synchro/<int:team_id>/goals/", views.SynchroGoalListCreateView.as_view()),
    path(
        "synchro/<int:team_id>/programs/", views.SynchroProgramListCreateView.as_view()
    ),
    path(
        "synchro/<int:team_id>/logs/", views.SynchroSessionLogListCreateView.as_view()
    ),
    path(
        "synchro/<int:team_id>/results/",
        views.SynchroCompetitionResultListCreateView.as_view(),
    ),
    path("synchro/<int:team_id>/stats/", views.SynchroStatsView.as_view()),
    # Assets
    path("programs/<int:program_id>/assets/", views.ProgramAssetCreateView.as_view()),
    path("assets/<int:pk>/", views.ProgramAssetDestroyView.as_view()),
    # Logistics
    path(
        "synchro/<int:team_id>/trips/", views.SynchroTripListCreateView.as_view()
    ),  # <--- Fixed Line
    path("skaters/<int:skater_id>/trips/", views.SkaterTripListView.as_view()),
    path("trips/<int:pk>/", views.TeamTripDetailView.as_view()),
    path("trips/<int:trip_id>/itinerary/", views.ItineraryListCreateView.as_view()),
    path("itinerary/<int:pk>/", views.ItineraryDetailView.as_view()),
    path("trips/<int:trip_id>/housing/", views.HousingListCreateView.as_view()),
    path("housing/<int:pk>/", views.HousingDetailView.as_view()),
    # Gap Analysis
    path(
        "ytps/<int:plan_id>/gap-analysis/",
        views.GapAnalysisRetrieveUpdateView.as_view(),
    ),
    path(
        "skaters/<int:skater_id>/gap-analysis/",
        views.GapAnalysisRetrieveUpdateView.as_view(),
    ),
    path(
        "teams/<int:team_id>/gap-analysis/",
        views.GapAnalysisRetrieveUpdateView.as_view(),
    ),
    path(
        "synchro/<int:team_id>/gap-analysis/",
        views.GapAnalysisRetrieveUpdateView.as_view(),
    ),
    path("synchro/<int:team_id>/week-view/", views.TeamMasterWeeklyPlanView.as_view()),
    # Invites
    path("invitations/send/", views.SendInviteView.as_view()),
    path("invitations/accept/<str:token>/", views.AcceptInviteView.as_view()),
]
