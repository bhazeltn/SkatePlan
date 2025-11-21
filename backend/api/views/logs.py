from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType

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


class SessionLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer
    queryset = SessionLog.objects.all()


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


class InjuryLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer
    queryset = InjuryLog.objects.all()
