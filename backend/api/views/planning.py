from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from datetime import date, timedelta

from api.models import (
    Skater,
    AthleteSeason,
    YearlyPlan,
    Macrocycle,
    WeeklyPlan,
    Goal,
    GapAnalysis,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
)
from api.serializers import (
    AthleteSeasonSerializer,
    YearlyPlanSerializer,
    MacrocycleSerializer,
    WeeklyPlanSerializer,
    GoalSerializer,
    GapAnalysisSerializer,
)
from api.permissions import IsCoachUser, IsCoachOrOwner
from api.services import get_access_role  # <--- Use Service

# ... (AthleteSeason Views remain same) ...


class AthleteSeasonList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = AthleteSeasonSerializer

    def get_queryset(self):
        return AthleteSeason.objects.filter(skater_id=self.kwargs["skater_id"])


class AthleteSeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = AthleteSeasonSerializer
    queryset = AthleteSeason.objects.all()


# --- YEARLY PLANS ---


class YearlyPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        if "team_id" in self.kwargs:
            team_id = self.kwargs["team_id"]
            ct = ContentType.objects.get_for_model(Team)
            return YearlyPlan.objects.filter(content_type=ct, object_id=team_id)
        else:
            skater_id = self.kwargs["skater_id"]
            return YearlyPlan.objects.filter(athlete_seasons__skater_id=skater_id)

    def perform_create(self, serializer):
        # --- REFACTORED PERMISSION CHECK ---
        target_id = self.kwargs.get("skater_id") or self.kwargs.get("team_id")
        target_model = Team if "team_id" in self.kwargs else Skater

        # Resolve entity
        entity = target_model.objects.get(id=target_id)

        # Check Role via Service
        role = get_access_role(self.request.user, entity)

        # Only Owners/Managers can create Plans (Collaborators can only Edit)
        if role not in ["OWNER", "COACH", "MANAGER", "SKATER_OWNER"]:
            if role == "COLLABORATOR":
                raise PermissionDenied("Collaborators cannot create Yearly Plans.")
            # If no role (or Observer), IsCoachOrOwner usually blocks GET, but let's be safe
            raise PermissionDenied("You do not have permission to create a plan.")
        # -----------------------------------

        if "skater_id" in self.kwargs:
            skater = entity  # It's a skater
            season_id = self.request.data.get("season_id")
            new_season_data = self.request.data.get("new_season_data")
            target_season = None

            if season_id:
                try:
                    target_season = AthleteSeason.objects.get(
                        id=season_id, skater=skater
                    )
                except:
                    raise ValidationError("Selected season does not exist.")
            elif new_season_data:
                season_name = new_season_data.get("season")
                if not season_name:
                    raise ValidationError("New season must have a name.")
                target_season, _ = AthleteSeason.objects.get_or_create(
                    skater=skater,
                    season=season_name,
                    defaults={
                        "start_date": new_season_data.get("start_date") or None,
                        "end_date": new_season_data.get("end_date") or None,
                        "primary_coach": self.request.user,
                    },
                )
            else:
                target_season = AthleteSeason.objects.filter(
                    skater=skater, is_active=True
                ).last()
                if not target_season:
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
                raise ValidationError("Invalid entity type")
            content_type = ContentType.objects.get_for_model(model_class)

            plan = serializer.save(
                coach_owner=self.request.user,
                content_type=content_type,
                object_id=entity_id,
            )
            plan.athlete_seasons.add(target_season)


class TeamYearlyPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(Team)
        return YearlyPlan.objects.filter(content_type=ct, object_id=team_id)

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)
        ct = ContentType.objects.get_for_model(Team)
        season_data = self.request.data.get("new_season_data")
        season_name = (
            season_data.get("season") if season_data else f"{date.today().year} Team"
        )
        team_season, _ = AthleteSeason.objects.get_or_create(
            content_type=ct,
            object_id=team.id,
            season=season_name,
            defaults={
                "start_date": season_data.get("start_date"),
                "end_date": season_data.get("end_date"),
                "primary_coach": self.request.user,
            },
        )
        plan = serializer.save(
            coach_owner=self.request.user, content_type=ct, object_id=team.id
        )
        plan.athlete_seasons.add(team_season)


class SynchroYearlyPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        return YearlyPlan.objects.filter(content_type=ct, object_id=team_id)

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = SynchroTeam.objects.get(id=team_id)
        ct = ContentType.objects.get_for_model(SynchroTeam)
        season_data = self.request.data.get("new_season_data")
        season_name = (
            season_data.get("season") if season_data else f"{date.today().year} Synchro"
        )
        team_season, _ = AthleteSeason.objects.get_or_create(
            content_type=ct,
            object_id=team.id,
            season=season_name,
            defaults={
                "start_date": season_data.get("start_date"),
                "end_date": season_data.get("end_date"),
                "primary_coach": self.request.user,
            },
        )
        plan = serializer.save(
            coach_owner=self.request.user, content_type=ct, object_id=team.id
        )
        plan.athlete_seasons.add(team_season)


class YearlyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = YearlyPlanSerializer
    queryset = YearlyPlan.objects.all()


# ... (Macrocycle and Weekly Views remain same) ...
class MacrocycleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = MacrocycleSerializer

    def get_queryset(self):
        return Macrocycle.objects.filter(yearly_plan_id=self.kwargs["plan_id"])

    def perform_create(self, serializer):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        serializer.save(yearly_plan=plan)


class MacrocycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = MacrocycleSerializer
    queryset = Macrocycle.objects.all()


class WeeklyPlanListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = WeeklyPlanSerializer

    def get_queryset(self):
        return WeeklyPlan.objects.filter(
            athlete_season_id=self.kwargs["season_id"]
        ).order_by("week_start")


class WeeklyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = WeeklyPlanSerializer
    queryset = WeeklyPlan.objects.all()


# ... (Master Weekly Plans remain same) ...
class MasterWeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)
        self.check_object_permissions(request, skater)
        date_str = request.query_params.get("date")
        if not date_str:
            today = date.today()
            target_date = today - timedelta(days=today.weekday())
        else:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date"}, status=status.HTTP_400_BAD_REQUEST
                )

        season_query = Q(skater=skater, is_active=True)
        teams = Team.objects.filter(Q(partner_a=skater) | Q(partner_b=skater))
        if teams.exists():
            ct_team = ContentType.objects.get_for_model(Team)
            season_query |= Q(
                content_type=ct_team,
                object_id__in=teams.values_list("id", flat=True),
                is_active=True,
            )
        synchro_teams = skater.synchro_teams.all()
        if synchro_teams.exists():
            ct_synchro = ContentType.objects.get_for_model(SynchroTeam)
            season_query |= Q(
                content_type=ct_synchro,
                object_id__in=synchro_teams.values_list("id", flat=True),
                is_active=True,
            )

        active_seasons = AthleteSeason.objects.filter(season_query)
        data = []
        for season in active_seasons:
            week_plan, created = WeeklyPlan.objects.get_or_create(
                athlete_season=season, week_start=target_date, defaults={"theme": ""}
            )
            label = season.season
            ytp = season.yearly_plans.first()
            if ytp:
                label = str(ytp.planning_entity)
            elif season.planning_entity:
                label = str(season.planning_entity)
            can_edit = season.skater == skater
            data.append(
                {
                    "plan_data": WeeklyPlanSerializer(week_plan).data,
                    "label": label,
                    "season_id": season.id,
                    "can_edit": can_edit,
                }
            )
        return Response({"week_start": target_date, "plans": data})


class TeamMasterWeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
        is_synchro = "synchro" in request.path
        if is_synchro:
            try:
                target_entity = SynchroTeam.objects.get(id=team_id)
            except SynchroTeam.DoesNotExist:
                return Response({"error": "Synchro Team not found"}, status=404)
            ct = ContentType.objects.get_for_model(SynchroTeam)
            relevant_skaters = []
        else:
            try:
                target_entity = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return Response({"error": "Team not found"}, status=404)
            ct = ContentType.objects.get_for_model(Team)
            relevant_skaters = [target_entity.partner_a, target_entity.partner_b]

        date_str = request.query_params.get("date")
        if not date_str:
            today = date.today()
            target_date = today - timedelta(days=today.weekday())
        else:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({"error": "Invalid date"}, status=400)

        team_seasons = AthleteSeason.objects.filter(
            content_type=ct, object_id=team_id, is_active=True
        )
        partner_seasons = AthleteSeason.objects.none()
        for s in relevant_skaters:
            p_seasons = AthleteSeason.objects.filter(skater=s, is_active=True)
            partner_seasons = partner_seasons | p_seasons

        all_seasons = list(team_seasons) + list(partner_seasons)
        data = []
        for season in all_seasons:
            week_plan, created = WeeklyPlan.objects.get_or_create(
                athlete_season=season, week_start=target_date, defaults={"theme": ""}
            )
            label = season.season
            can_edit = False
            if season.planning_entity == target_entity:
                label = "Team Plan"
                can_edit = True
            elif season.skater:
                label = f"{season.skater.full_name.split(' ')[0]} ({season.season})"
            elif season.planning_entity:
                label = str(season.planning_entity)
            data.append(
                {
                    "plan_data": WeeklyPlanSerializer(week_plan).data,
                    "label": label,
                    "season_id": season.id,
                    "can_edit": can_edit,
                }
            )
        return Response({"week_start": target_date, "plans": data})


class GapAnalysisRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = GapAnalysisSerializer

    def get_object(self):
        if "team_id" in self.kwargs:
            team_id = self.kwargs["team_id"]
            if "synchro" in self.request.path:
                entity = SynchroTeam.objects.get(id=team_id)
            else:
                entity = Team.objects.get(id=team_id)

        elif "plan_id" in self.kwargs:
            plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
            entity = plan.planning_entity
            if hasattr(entity, "skater"):
                entity = entity.skater  # Normalize to skater if possible for perm check

        elif "skater_id" in self.kwargs:
            skater_id = self.kwargs["skater_id"]
            entity = Skater.objects.get(id=skater_id)

        self.check_object_permissions(self.request, entity)
        ct = ContentType.objects.get_for_model(entity)
        obj, _ = GapAnalysis.objects.get_or_create(content_type=ct, object_id=entity.id)
        return obj


class GoalListCreateByPlanView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = GoalSerializer

    def get_queryset(self):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        return Goal.objects.filter(
            content_type=plan.content_type, object_id=plan.object_id
        ).order_by("-created_at")

    def perform_create(self, serializer):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        status_val = Goal.GoalStatus.APPROVED
        # If user is NOT owner/coach, set Pending
        role = get_access_role(self.request.user, plan.planning_entity)
        if role not in ["OWNER", "COACH", "MANAGER", "COLLABORATOR"]:
            status_val = Goal.GoalStatus.PENDING_APPROVAL

        serializer.save(
            content_type=plan.content_type,
            object_id=plan.object_id,
            current_status=status_val,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


class GoalListBySkaterView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = GoalSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        user = self.request.user
        skater = Skater.objects.get(id=skater_id)

        # --- REFACTORED FILTERING ---
        role = get_access_role(user, skater)

        # If I am the Skater (Owner), I see everything
        if role == "SKATER_OWNER":
            query = Q()
            # Add all related entities
            singles = skater.singles_entities.all()
            dance = skater.solodance_entities.all()
            teams = list(skater.teams_as_partner_a.all()) + list(
                skater.teams_as_partner_b.all()
            )
            synchro = skater.synchro_teams.all()

            if singles:
                query |= Q(
                    content_type=ContentType.objects.get_for_model(SinglesEntity),
                    object_id__in=[e.id for e in singles],
                )
            if dance:
                query |= Q(
                    content_type=ContentType.objects.get_for_model(SoloDanceEntity),
                    object_id__in=[e.id for e in dance],
                )
            if teams:
                query |= Q(
                    content_type=ContentType.objects.get_for_model(Team),
                    object_id__in=[e.id for e in teams],
                )
            if synchro:
                query |= Q(
                    content_type=ContentType.objects.get_for_model(SynchroTeam),
                    object_id__in=[e.id for e in synchro],
                )

            if not query:
                return Goal.objects.none()
            return Goal.objects.filter(query).order_by("-created_at")

        # If I am Contextual (Coach/Parent/Collab), I see what I have access to
        query = Q()

        # 1. Direct Access (Skater Profile) -> See Singles/Dance
        # Note: Role here comes from get_access_role which checks direct PEA
        if role:
            ct_singles = ContentType.objects.get_for_model(SinglesEntity)
            ct_dance = ContentType.objects.get_for_model(SoloDanceEntity)
            singles_ids = skater.singles_entities.values_list("id", flat=True)
            dance_ids = skater.solodance_entities.values_list("id", flat=True)
            if singles_ids:
                query |= Q(content_type=ct_singles, object_id__in=singles_ids)
            if dance_ids:
                query |= Q(content_type=ct_dance, object_id__in=dance_ids)

        # 2. Team Access (Pairs/Dance)
        teams = list(skater.teams_as_partner_a.all()) + list(
            skater.teams_as_partner_b.all()
        )
        for team in teams:
            if get_access_role(user, team):  # Check permission on team
                ct = ContentType.objects.get_for_model(Team)
                query |= Q(content_type=ct, object_id=team.id)

        # 3. Synchro Access
        for st in skater.synchro_teams.all():
            if get_access_role(user, st):
                ct = ContentType.objects.get_for_model(SynchroTeam)
                query |= Q(content_type=ct, object_id=st.id)

        if not query:
            return Goal.objects.none()
        return Goal.objects.filter(query).order_by("-created_at")

    def perform_create(self, serializer):
        # ... (This logic was already solid, keeping it for simplicity) ...
        skater = Skater.objects.get(id=self.kwargs["skater_id"])
        entity_id = self.request.data.get("planning_entity_id")
        entity = None
        # Find the entity (reusing logic to find which one they meant)
        all_entities = (
            list(skater.singles_entities.all())
            + list(skater.solodance_entities.all())
            + list(skater.teams_as_partner_a.all())
            + list(skater.teams_as_partner_b.all())
            + list(skater.synchro_teams.all())
        )
        if entity_id:
            entity = next(
                (e for e in all_entities if str(e.id) == str(entity_id)), None
            )
        if not entity:
            entity = all_entities[0] if all_entities else None
        if not entity:
            raise ValidationError("No active discipline found.")

        # Security: Do I have write access to this specific entity?
        if not get_access_role(self.request.user, entity):
            raise PermissionDenied(
                "You do not have permission to add goals to this discipline."
            )

        content_type = ContentType.objects.get_for_model(entity)
        status_val = Goal.GoalStatus.APPROVED
        role = get_access_role(self.request.user, entity)
        if role in ["GUARDIAN", "SKATER_OWNER", "SKATER"]:
            status_val = Goal.GoalStatus.PENDING_APPROVAL

        serializer.save(
            content_type=content_type,
            object_id=entity.id,
            current_status=status_val,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


# ... (Rest of Goal Views for Teams remain same) ...
class GoalListByTeamView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(Team)
        return Goal.objects.filter(content_type=ct, object_id=team_id).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(Team)
        serializer.save(
            content_type=ct,
            object_id=team_id,
            current_status=Goal.GoalStatus.APPROVED,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


class SynchroGoalListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        return Goal.objects.filter(content_type=ct, object_id=team_id).order_by(
            "-created_at"
        )

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        serializer.save(
            content_type=ct,
            object_id=team_id,
            current_status=Goal.GoalStatus.APPROVED,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = GoalSerializer
    queryset = Goal.objects.all()

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
