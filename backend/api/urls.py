from django.urls import path
from . import views

urlpatterns = [
    # Auth URLs
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/profile/", views.UserProfileView.as_view(), name="profile"),
    # Skater URLs
    path("skaters/create/", views.CreateSkaterView.as_view(), name="skater-create"),
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
    path(
        "skaters/<int:skater_id>/results/",
        views.CompetitionResultListCreateView.as_view(),
    ),
    path("results/<int:pk>/", views.CompetitionResultDetailView.as_view()),
    path("skaters/<int:skater_id>/tests/", views.SkaterTestListCreateView.as_view()),
    path("tests/<int:pk>/", views.SkaterTestDetailView.as_view()),
]
