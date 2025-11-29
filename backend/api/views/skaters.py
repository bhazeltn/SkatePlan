from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from datetime import date

from api.models import (
    Skater,
    AthleteSeason,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    PlanningEntityAccess,
    Federation,
    YearlyPlan,
    User,
)
from api.serializers import (
    SkaterSerializer,
    SkaterUpdateSerializer,
    RosterSkaterSerializer,
    TeamSerializer,
    SynchroTeamSerializer,
    SinglesEntitySerializer,
    SoloDanceEntitySerializer,
)
from api.permissions import IsCoachUser, IsCoachOrOwner


# ... (CreateSkaterView and SkaterDetailView remain the same) ...
class CreateSkaterView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterSerializer

    # ... (keep implementation)
    def create(self, request, *args, **kwargs):
        # 1. Validate Inputs
        full_name = request.data.get("full_name")
        dob_str = request.data.get("date_of_birth")
        discipline = request.data.get("discipline", "SINGLES")
        level = request.data.get("level", "Beginner")
        federation_id = request.data.get("federation_id")

        if not full_name or not dob_str:
            return Response(
                {"error": "Full name and date of birth are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dob = date.fromisoformat(dob_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check Duplicates
        potential_matches = Skater.objects.filter(date_of_birth=dob)
        for skater in potential_matches:
            if skater.full_name.lower() == full_name.lower():
                return Response(
                    {
                        "error": "A skater with this name and birthday already exists.",
                        "skater_id": skater.id,
                        "action": "request_access",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # 3. Create Skater
        federation_obj = None
        if federation_id:
            try:
                federation_obj = Federation.objects.get(id=federation_id)
            except Federation.DoesNotExist:
                pass

        skater = Skater.objects.create(
            full_name=full_name,
            date_of_birth=dob,
            gender=request.data.get("gender"),
            home_club=request.data.get("home_club"),
            federation=federation_obj,
        )

        # 4. Create Entity
        entity = None
        if discipline == "SINGLES":
            entity = SinglesEntity.objects.create(
                skater=skater, current_level=level, federation=federation_obj
            )
        elif discipline == "SOLO_DANCE":
            entity = SoloDanceEntity.objects.create(
                skater=skater,
                name="Solo Dance",
                current_level=level,
                federation=federation_obj,
            )
        else:
            entity = SinglesEntity.objects.create(
                skater=skater, current_level=level, federation=federation_obj
            )

        # 5. Grant Permissions (Coach Access)
        PlanningEntityAccess.objects.create(
            user=request.user,
            access_level=PlanningEntityAccess.AccessLevel.COACH,
            planning_entity=entity,
        )

        # 6. Auto-Create Season
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_name = f"{start_year}-{start_year + 1}"

        season = AthleteSeason.objects.create(
            skater=skater,
            season=season_name,
            start_date=date(start_year, 7, 1),
            end_date=date(start_year + 1, 6, 30),
            primary_coach=request.user,
        )

        # 7. Auto-Create Yearly Plan
        ct = ContentType.objects.get_for_model(entity)
        ytp = YearlyPlan.objects.create(
            coach_owner=request.user,
            content_type=ct,
            object_id=entity.id,
            peak_type="Single Peak",
            primary_season_goal="Develop basic skills",
        )
        ytp.athlete_seasons.add(season)

        return Response(SkaterSerializer(skater).data, status=status.HTTP_201_CREATED)


class SkaterDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = SkaterSerializer
    queryset = Skater.objects.all()


class RosterView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RosterSkaterSerializer

    def get_queryset(self):
        user = self.request.user

        # 1. Coaches & Collaborators
        if user.role in [User.Role.COACH, "COLLABORATOR"] or user.is_superuser:
            access_records = PlanningEntityAccess.objects.filter(user=user)
            skater_ids = set()

            for record in access_records:
                entity = record.planning_entity
                if not entity:
                    continue

                # --- FIX: Check for Direct Skater Access ---
                if isinstance(entity, Skater):
                    skater_ids.add(entity.id)
                # -------------------------------------------
                elif hasattr(entity, "skater"):
                    skater_ids.add(entity.skater.id)
                elif hasattr(entity, "partner_a"):  # Team
                    skater_ids.add(entity.partner_a.id)
                    skater_ids.add(entity.partner_b.id)
                elif hasattr(entity, "roster"):  # Synchro
                    skater_ids.update(entity.roster.values_list("id", flat=True))

            return Skater.objects.filter(id__in=skater_ids, is_active=True).distinct()

        # 2. Guardians
        elif user.role == User.Role.GUARDIAN:
            ct_skater = ContentType.objects.get_for_model(Skater)
            access_records = PlanningEntityAccess.objects.filter(
                user=user, content_type=ct_skater, access_level="GUARDIAN"
            )
            skater_ids = access_records.values_list("object_id", flat=True)
            return Skater.objects.filter(id__in=skater_ids).distinct()

        # 3. Skaters
        elif user.role == User.Role.SKATER:
            return Skater.objects.filter(user_account=user, is_active=True)

        return Skater.objects.none()


# ... (Rest of the file remains the same: Entity Views, Team Views, etc.) ...
class SinglesEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SinglesEntitySerializer
    queryset = SinglesEntity.objects.all()


class SoloDanceEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SoloDanceEntitySerializer
    queryset = SoloDanceEntity.objects.all()


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamSerializer
    queryset = Team.objects.all()


class SynchroTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SynchroTeamSerializer
    queryset = SynchroTeam.objects.all()


class CreateTeamView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamSerializer

    def perform_create(self, serializer):
        team = serializer.save()
        PlanningEntityAccess.objects.create(
            user=self.request.user, access_level="COACH", planning_entity=team
        )
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_name = f"{start_year}-{start_year + 1} Team"
        ct = ContentType.objects.get_for_model(Team)
        team_season = AthleteSeason.objects.create(
            content_type=ct,
            object_id=team.id,
            season=season_name,
            start_date=date(start_year, 7, 1),
            end_date=date(start_year + 1, 6, 30),
            primary_coach=self.request.user,
        )
        ytp = YearlyPlan.objects.create(
            coach_owner=self.request.user,
            content_type=ct,
            object_id=team.id,
            peak_type="Single Peak",
            primary_season_goal="Team Development",
        )
        ytp.athlete_seasons.add(team_season)


class TeamListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamSerializer

    def get_queryset(self):
        ct = ContentType.objects.get_for_model(Team)
        ids = PlanningEntityAccess.objects.filter(
            user=self.request.user, content_type=ct
        ).values_list("object_id", flat=True)
        return Team.objects.filter(id__in=ids)


class CreateSynchroTeamView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SynchroTeamSerializer

    def perform_create(self, serializer):
        team = serializer.save()
        PlanningEntityAccess.objects.create(
            user=self.request.user, access_level="COACH", planning_entity=team
        )
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_name = f"{start_year}-{start_year + 1} Synchro"
        ct = ContentType.objects.get_for_model(SynchroTeam)
        team_season = AthleteSeason.objects.create(
            content_type=ct,
            object_id=team.id,
            season=season_name,
            start_date=date(start_year, 7, 1),
            end_date=date(start_year + 1, 6, 30),
            primary_coach=self.request.user,
        )
        ytp = YearlyPlan.objects.create(
            coach_owner=self.request.user,
            content_type=ct,
            object_id=team.id,
            peak_type="Single Peak",
            primary_season_goal="Team Sync & Uniformity",
        )
        ytp.athlete_seasons.add(team_season)


class SynchroTeamListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SynchroTeamSerializer

    def get_queryset(self):
        ct = ContentType.objects.get_for_model(SynchroTeam)
        ids = PlanningEntityAccess.objects.filter(
            user=self.request.user, content_type=ct
        ).values_list("object_id", flat=True)
        return SynchroTeam.objects.filter(id__in=ids).order_by("team_name")
