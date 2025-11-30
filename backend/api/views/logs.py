from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError, PermissionDenied
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
from api.permissions import IsCoachUser, IsCoachOrOwner
from api.services import get_access_role

# --- SESSION LOGS ---


class SessionLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # --- SECURITY: Check Access to Skater ---
        role = get_access_role(self.request.user, skater)
        if not role:
            return SessionLog.objects.none()
        # ----------------------------------------

        # 1. Individual Seasons
        season_query = Q(skater=skater)

        # 2. Team Seasons (Pairs/Dance)
        teams = Team.objects.filter(Q(partner_a=skater) | Q(partner_b=skater))
        if teams.exists():
            ct_team = ContentType.objects.get_for_model(Team)
            season_query |= Q(
                content_type=ct_team, object_id__in=teams.values_list("id", flat=True)
            )

        # 3. Synchro Seasons
        synchro = skater.synchro_teams.all()
        if synchro.exists():
            ct_synchro = ContentType.objects.get_for_model(SynchroTeam)
            season_query |= Q(
                content_type=ct_synchro,
                object_id__in=synchro.values_list("id", flat=True),
            )

        # Fetch logs for ANY of these seasons
        return SessionLog.objects.filter(
            athlete_season__in=AthleteSeason.objects.filter(season_query)
        ).order_by("-session_date")

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # --- SECURITY: Block Observers ---
        role = get_access_role(self.request.user, skater)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot create logs.")
        # ---------------------------------

        # Auto-find or create active season
        active_season = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).last()
        if not active_season:
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            season_name = f"{start_year}-{start_year + 1}"
            active_season = AthleteSeason.objects.create(
                skater=skater, season=season_name, primary_coach=None
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

        if not model_class:
            # Fallback to first available singles entity
            model_class = SinglesEntity
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
        team = Team.objects.get(id=team_id)

        # Security Check
        if not get_access_role(self.request.user, team):
            return SessionLog.objects.none()

        ct = ContentType.objects.get_for_model(Team)
        return SessionLog.objects.filter(
            athlete_season__content_type=ct, athlete_season__object_id=team_id
        ).order_by("-session_date")

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)

        role = get_access_role(self.request.user, team)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot create logs.")

        ct = ContentType.objects.get_for_model(Team)

        active_season = AthleteSeason.objects.filter(
            content_type=ct, object_id=team_id, is_active=True
        ).last()

        if not active_season:
            raise ValidationError("No active season found for this team.")

        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=ct,
            object_id=team_id,
        )


class SynchroSessionLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)

        if not get_access_role(self.request.user, team):
            return SessionLog.objects.none()

        ct = ContentType.objects.get_for_model(SynchroTeam)
        return SessionLog.objects.filter(
            athlete_season__content_type=ct, athlete_season__object_id=team_id
        ).order_by("-session_date")

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)

        role = get_access_role(self.request.user, team)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot create logs.")

        ct = ContentType.objects.get_for_model(SynchroTeam)

        active_season = AthleteSeason.objects.filter(
            content_type=ct, object_id=team_id, is_active=True
        ).last()

        if not active_season:
            raise ValidationError("No active season found for this team.")

        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=ct,
            object_id=team_id,
        )


class SessionLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = SessionLogSerializer
    queryset = SessionLog.objects.all()


class InjuryLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        if not get_access_role(self.request.user, skater):
            return InjuryLog.objects.none()

        return InjuryLog.objects.filter(skater_id=skater_id).order_by(
            "return_to_sport_date", "-date_of_onset"
        )

    def perform_create(self, serializer):
        skater = Skater.objects.get(id=self.kwargs["skater_id"])

        role = get_access_role(self.request.user, skater)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot report injuries.")

        status_val = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status_val)


class InjuryLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = InjuryLogSerializer
    queryset = InjuryLog.objects.all()


class InjuryLogListCreateByTeamView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        try:
            team = Team.objects.get(id=team_id)
            if not get_access_role(self.request.user, team):
                return InjuryLog.objects.none()

            skaters = [team.partner_a, team.partner_b]
            return InjuryLog.objects.filter(skater__in=skaters).order_by(
                "-date_of_onset"
            )
        except Team.DoesNotExist:
            return InjuryLog.objects.none()

    def perform_create(self, serializer):
        skater_id = self.request.data.get("skater_id")
        if not skater_id:
            raise ValidationError(
                "skater_id is required to log an injury from team view."
            )

        skater = Skater.objects.get(id=skater_id)

        # Check access on the TEAM or SKATER
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)

        role = get_access_role(self.request.user, team)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot report injuries.")

        status_val = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status_val)


class SynchroInjuryLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        try:
            team = SynchroTeam.objects.get(id=team_id)
            if not get_access_role(self.request.user, team):
                return InjuryLog.objects.none()

            skaters = team.roster.all()
            return InjuryLog.objects.filter(skater__in=skaters).order_by(
                "-date_of_onset"
            )
        except SynchroTeam.DoesNotExist:
            return InjuryLog.objects.none()

    def perform_create(self, serializer):
        skater_id = self.request.data.get("skater_id")
        if not skater_id:
            raise ValidationError(
                "skater_id is required to log an injury from team view."
            )

        skater = Skater.objects.get(id=skater_id)

        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)

        role = get_access_role(self.request.user, team)
        if role in ["VIEWER", "OBSERVER"]:
            raise PermissionDenied("Observers cannot report injuries.")

        status_val = self.request.data.get("recovery_status", "Active")
        serializer.save(skater=skater, recovery_status=status_val)
