from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q  # <--- Critical for Team Lookup

from api.models import (
    Skater,
    AthleteSeason,
    SessionLog,
    InjuryLog,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
)
from api.serializers import SessionLogSerializer, InjuryLogSerializer
from api.permissions import IsCoachUser

# --- SESSION LOGS ---


class SessionLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        return SessionLog.objects.filter(athlete_season__skater_id=skater_id).order_by(
            "-session_date"
        )

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        active_season = AthleteSeason.objects.filter(skater=skater).last()
        if not active_season:
            raise ValidationError("No active season found.")

        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)
        if not model_class:
            raise ValidationError(f"Invalid entity type: {entity_type}")

        content_type = ContentType.objects.get_for_model(model_class)
        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=content_type,
            object_id=entity_id,
        )


class SessionLogListCreateByTeamView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(Team)
        return SessionLog.objects.filter(content_type=ct, object_id=team_id).order_by(
            "-session_date"
        )

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)
        active_season = team.partner_a.athlete_seasons.last()  # Default anchor
        if not active_season:
            raise ValidationError("Partner A has no active season.")

        ct = ContentType.objects.get_for_model(Team)
        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=ct,
            object_id=team.id,
        )


class SessionLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer
    queryset = SessionLog.objects.all()


# --- INJURY LOGS ---


class InjuryLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        return InjuryLog.objects.filter(skater_id=skater_id).order_by(
            "return_to_sport_date", "-date_of_onset"
        )

    def perform_create(self, serializer):
        skater = Skater.objects.get(id=self.kwargs["skater_id"])
        status = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status)


class InjuryLogListCreateByTeamView(generics.ListCreateAPIView):
    """
    List injuries for BOTH partners in a team.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)
        # Return injuries for Partner A OR Partner B
        return InjuryLog.objects.filter(
            Q(skater=team.partner_a) | Q(skater=team.partner_b)
        ).order_by("recovery_status", "-date_of_onset")

    def perform_create(self, serializer):
        # Frontend must send 'skater_id' to identify WHICH partner is injured
        skater_id = self.request.data.get("skater_id")
        if not skater_id:
            raise ValidationError("You must specify which partner is injured.")

        skater = Skater.objects.get(id=skater_id)
        status = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status)


class InjuryLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer
    queryset = InjuryLog.objects.all()


class SynchroInjuryLogListCreateView(generics.ListCreateAPIView):
    """
    List injuries for ALL skaters in a Synchro Team Roster.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)
        # Return injuries for anyone in the roster
        return InjuryLog.objects.filter(skater__in=team.roster.all()).order_by(
            "recovery_status", "-date_of_onset"
        )

    def perform_create(self, serializer):
        skater_id = self.request.data.get("skater_id")
        if not skater_id:
            raise ValidationError("You must specify which skater is injured.")

        skater = Skater.objects.get(id=skater_id)
        status = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status)
