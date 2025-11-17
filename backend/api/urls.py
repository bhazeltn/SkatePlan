from django.urls import path
from . import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/profile/", views.UserProfileView.as_view(), name="profile"),
]
