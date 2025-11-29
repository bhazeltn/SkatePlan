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
    PlanningEntityAccess,
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


# --- SEASONS ---
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
        # --- BLOCK COLLABORATORS FROM CREATING PLANS ---
        target_id = self.kwargs.get("skater_id")
        target_model = Skater

        if "team_id" in self.kwargs:
            target_id = self.kwargs["team_id"]
            target_model = Team

        if target_id:
            ct = ContentType.objects.get_for_model(target_model)
            access = PlanningEntityAccess.objects.filter(
                user=self.request.user, content_type=ct, object_id=target_id
            ).first()

            if access and access.access_level == "COLLABORATOR":
                raise PermissionDenied("Collaborators cannot create Yearly Plans.")
        # ----------------------------------------------------

        if "skater_id" in self.kwargs:
            skater_id = self.kwargs["skater_id"]
            skater = Skater.objects.get(id=skater_id)

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

                target_season, created = AthleteSeason.objects.get_or_create(
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


# --- MASTER VIEWS ---
class MasterWeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)

        # Manual Check
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
        debug = []
        is_synchro = "synchro" in request.path

        if is_synchro:
            try:
                target_entity = SynchroTeam.objects.get(id=team_id)
                ct = ContentType.objects.get_for_model(SynchroTeam)
                relevant_skaters = []
            except SynchroTeam.DoesNotExist:
                return Response({"error": "Synchro Team not found"}, status=404)
        else:
            try:
                target_entity = Team.objects.get(id=team_id)
                ct = ContentType.objects.get_for_model(Team)
                relevant_skaters = [target_entity.partner_a, target_entity.partner_b]
            except Team.DoesNotExist:
                return Response({"error": "Team not found"}, status=404)

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

        return Response({"week_start": target_date, "plans": data, "debug": debug})


class GapAnalysisRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = GapAnalysisSerializer

    def get_object(self):
        # Option A: Team via URL
        if "team_id" in self.kwargs:
            team_id = self.kwargs["team_id"]
            if "synchro" in self.request.path:
                entity = SynchroTeam.objects.get(id=team_id)
            else:
                entity = Team.objects.get(id=team_id)

        # Option B: Plan via URL (Fix for KeyError)
        elif "plan_id" in self.kwargs:
            plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
            entity = plan.planning_entity

        # Option C: Skater via URL
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
        if self.request.user.role in ["SKATER", "GUARDIAN"]:
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

        # 1. Get all access records for this user related to this skater
        access_records = PlanningEntityAccess.objects.filter(user=user)

        allowed_content_types = []
        allowed_object_ids = []
        can_see_personal = False

        for record in access_records:
            entity = record.planning_entity
            if not entity:
                continue

            if isinstance(entity, Skater) and entity.id == int(skater_id):
                can_see_personal = True
            elif isinstance(entity, Team):
                if entity.partner_a_id == int(skater_id) or entity.partner_b_id == int(
                    skater_id
                ):
                    allowed_content_types.append(
                        ContentType.objects.get_for_model(Team)
                    )
                    allowed_object_ids.append(entity.id)
            elif isinstance(entity, SynchroTeam):
                if entity.roster.filter(id=skater_id).exists():
                    allowed_content_types.append(
                        ContentType.objects.get_for_model(SynchroTeam)
                    )
                    allowed_object_ids.append(entity.id)

        # Owner Override
        if user.role == "SKATER" and user.skater_id == int(skater_id):
            can_see_personal = True

        # Build Query
        query = Q()

        if user.role == "SKATER" and user.skater_id == int(skater_id):
            # OWNER VIEW (See Everything)
            skater = Skater.objects.get(id=skater_id)
            singles = skater.singles_entities.all()
            dance = skater.solodance_entities.all()
            teams = Team.objects.filter(Q(partner_a=skater) | Q(partner_b=skater))
            synchro = skater.synchro_teams.all()

            if singles.exists():
                ct = ContentType.objects.get_for_model(SinglesEntity)
                query |= Q(
                    content_type=ct, object_id__in=singles.values_list("id", flat=True)
                )
            if dance.exists():
                ct = ContentType.objects.get_for_model(SoloDanceEntity)
                query |= Q(
                    content_type=ct, object_id__in=dance.values_list("id", flat=True)
                )
            if teams.exists():
                ct = ContentType.objects.get_for_model(Team)
                query |= Q(
                    content_type=ct, object_id__in=teams.values_list("id", flat=True)
                )
            if synchro.exists():
                ct = ContentType.objects.get_for_model(SynchroTeam)
                query |= Q(
                    content_type=ct, object_id__in=synchro.values_list("id", flat=True)
                )

        else:
            # RESTRICTED VIEW (Coach/Collab/Parent)
            if can_see_personal:
                ct_singles = ContentType.objects.get_for_model(SinglesEntity)
                ct_dance = ContentType.objects.get_for_model(SoloDanceEntity)
                skater_obj = Skater.objects.get(id=skater_id)
                singles_ids = skater_obj.singles_entities.values_list("id", flat=True)
                dance_ids = skater_obj.solodance_entities.values_list("id", flat=True)

                if singles_ids:
                    query |= Q(content_type=ct_singles, object_id__in=singles_ids)
                if dance_ids:
                    query |= Q(content_type=ct_dance, object_id__in=dance_ids)

            for i, ct in enumerate(allowed_content_types):
                query |= Q(content_type=ct, object_id=allowed_object_ids[i])

        if not query:
            return Goal.objects.none()
        return Goal.objects.filter(query).order_by("-created_at")

    def perform_create(self, serializer):
        skater = Skater.objects.get(id=self.kwargs["skater_id"])
        entity_id = self.request.data.get("planning_entity_id")
        entity = None

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

        content_type = ContentType.objects.get_for_model(entity)

        status_val = Goal.GoalStatus.APPROVED
        if self.request.user.role in ["SKATER", "GUARDIAN"]:
            status_val = Goal.GoalStatus.PENDING_APPROVAL

        serializer.save(
            content_type=content_type,
            object_id=entity.id,
            current_status=status_val,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


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
