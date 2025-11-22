from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from datetime import date

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

        # Auto-find or create active season
        active_season = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).last()
        if not active_season:
            # Auto-create fallback season
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            season_name = f"{start_year}-{start_year + 1}"
            active_season = AthleteSeason.objects.create(
                skater=skater, season=season_name, primary_coach=self.request.user
            )

        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)

        # Fallback if entity not provided
        if not model_class:
            model_class = SinglesEntity
            # Try to find a default entity
            entity = skater.singles_entities.first()
            if entity:
                entity_id = entity.id

        if not model_class or not entity_id:
            raise ValidationError(f"Invalid or missing planning entity.")

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
        ct = ContentType.objects.get_for_model(Team)

        # Find or Create Team Season
        active_season = AthleteSeason.objects.filter(
            content_type=ct, object_id=team.id, is_active=True
        ).last()
        if not active_season:
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            active_season = AthleteSeason.objects.create(
                content_type=ct,
                object_id=team.id,
                season=f"{start_year}-{start_year + 1} Pairs",
                primary_coach=self.request.user,
            )

        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=ct,
            object_id=team.id,
        )


class SynchroSessionLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        return SessionLog.objects.filter(content_type=ct, object_id=team_id).order_by(
            "-session_date"
        )

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)
        ct = ContentType.objects.get_for_model(SynchroTeam)

        # Find or Create Synchro Season
        active_season = AthleteSeason.objects.filter(
            content_type=ct, object_id=team.id, is_active=True
        ).last()
        if not active_season:
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            active_season = AthleteSeason.objects.create(
                content_type=ct,
                object_id=team.id,
                season=f"{start_year}-{start_year + 1} Synchro",
                primary_coach=self.request.user,
            )

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


# ... (Injury Logs remain the same) ...
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
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)
        return InjuryLog.objects.filter(
            Q(skater=team.partner_a) | Q(skater=team.partner_b)
        ).order_by("recovery_status", "-date_of_onset")

    def perform_create(self, serializer):
        skater_id = self.request.data.get("skater_id")
        if not skater_id:
            raise ValidationError("You must specify which partner is injured.")
        skater = Skater.objects.get(id=skater_id)
        status = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status)


class SynchroInjuryLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)
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


class InjuryLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer
    queryset = InjuryLog.objects.all()
