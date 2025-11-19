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
]
