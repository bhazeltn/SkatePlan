from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
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
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    GapAnalysis,
)
from api.serializers import (
    AthleteSeasonSerializer,
    YearlyPlanSerializer,
    MacrocycleSerializer,
    WeeklyPlanSerializer,
    GoalSerializer,
    GapAnalysisSerializer,
)
from api.permissions import IsCoachUser


# --- SEASONS ---
class AthleteSeasonList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = AthleteSeasonSerializer

    def get_queryset(self):
        return AthleteSeason.objects.filter(skater_id=self.kwargs["skater_id"])


class AthleteSeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = AthleteSeasonSerializer
    queryset = AthleteSeason.objects.all()


# --- YEARLY PLANS ---
class YearlyPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        # Check if this is a Team or Skater request
        if "team_id" in self.kwargs:
            team_id = self.kwargs["team_id"]
            ct = ContentType.objects.get_for_model(Team)
            return YearlyPlan.objects.filter(content_type=ct, object_id=team_id)
        else:
            skater_id = self.kwargs["skater_id"]
            return YearlyPlan.objects.filter(athlete_seasons__skater_id=skater_id)

    def perform_create(self, serializer):
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
                except AthleteSeason.DoesNotExist:
                    raise ValidationError("Selected season does not exist.")
            elif new_season_data:
                if not new_season_data.get("season"):
                    raise ValidationError("New season must have a name.")
                target_season = AthleteSeason.objects.create(
                    skater=skater,
                    season=new_season_data.get("season"),
                    start_date=new_season_data.get("start_date") or None,
                    end_date=new_season_data.get("end_date") or None,
                    primary_coach=self.request.user,
                )
            else:
                target_season = AthleteSeason.objects.filter(skater=skater).last()
                if not target_season:
                    raise ValidationError("No active season found.")

            entity_id = self.request.data.get("planning_entity_id")
            entity_type = self.request.data.get("planning_entity_type")

            if not entity_id or not entity_type:
                raise ValidationError("Missing planning entity information.")

            model_map = {
                "SinglesEntity": SinglesEntity,
                "SoloDanceEntity": SoloDanceEntity,
                "Team": Team,
                "SynchroTeam": SynchroTeam,
            }
            model_class = model_map.get(entity_type)
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

        season_data = self.request.data.get("new_season_data")
        season_id = self.request.data.get("season_id")

        target_seasons = []
        season_name = None
        start_date = None
        end_date = None

        if season_data and season_data.get("season"):
            season_name = season_data["season"]
            start_date = season_data.get("start_date")
            end_date = season_data.get("end_date")
        elif season_id:
            try:
                ref_season = AthleteSeason.objects.get(id=season_id)
                season_name = ref_season.season
                start_date = ref_season.start_date
                end_date = ref_season.end_date
                target_seasons.append(ref_season)
            except AthleteSeason.DoesNotExist:
                raise ValidationError("Selected season invalid.")

        if not season_name:
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            season_name = f"{start_year}-{start_year + 1}"

        for skater in [team.partner_a, team.partner_b]:
            if any(s.skater == skater for s in target_seasons):
                continue
            obj, created = AthleteSeason.objects.get_or_create(
                skater=skater,
                season=season_name,
                defaults={
                    "start_date": start_date,
                    "end_date": end_date,
                    "primary_coach": self.request.user,
                },
            )
            target_seasons.append(obj)

        ct = ContentType.objects.get_for_model(Team)
        plan = serializer.save(
            coach_owner=self.request.user, content_type=ct, object_id=team.id
        )
        plan.athlete_seasons.set(target_seasons)


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

        # 1. Handle Season Creation (Logic from Modal)
        season_data = self.request.data.get("new_season_data")
        season_name = season_data.get("season") if season_data else None

        if not season_name:
            # Fallback default
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            season_name = f"{start_year}-{start_year + 1}"

        # 2. Create/Get "Team Season"
        ct_team = ContentType.objects.get_for_model(SynchroTeam)

        team_season, created = AthleteSeason.objects.get_or_create(
            content_type=ct_team,
            object_id=team.id,
            season=season_name,
            defaults={
                "start_date": season_data.get("start_date") if season_data else None,
                "end_date": season_data.get("end_date") if season_data else None,
                "primary_coach": self.request.user,
            },
        )

        # 3. Create Plan
        plan = serializer.save(
            coach_owner=self.request.user, content_type=ct_team, object_id=team.id
        )

        # 4. Link Plan to Season
        plan.athlete_seasons.add(team_season)


class YearlyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer
    queryset = YearlyPlan.objects.all()


# --- MACROCYCLES ---
class MacrocycleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = MacrocycleSerializer

    def get_queryset(self):
        return Macrocycle.objects.filter(yearly_plan_id=self.kwargs["plan_id"])

    def perform_create(self, serializer):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        serializer.save(yearly_plan=plan)


class MacrocycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = MacrocycleSerializer
    queryset = Macrocycle.objects.all()


# --- WEEKLY PLANS ---
class WeeklyPlanListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = WeeklyPlanSerializer

    def get_queryset(self):
        return WeeklyPlan.objects.filter(
            athlete_season_id=self.kwargs["season_id"]
        ).order_by("week_start")

    def list(self, request, *args, **kwargs):
        season_id = self.kwargs["season_id"]
        try:
            season = AthleteSeason.objects.get(id=season_id)
        except AthleteSeason.DoesNotExist:
            return Response(
                {"error": "Season not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if season.start_date and season.end_date:
            current_date = season.start_date
            weeks_to_create = []
            existing_dates = set(
                WeeklyPlan.objects.filter(athlete_season=season).values_list(
                    "week_start", flat=True
                )
            )
            while current_date <= season.end_date:
                if current_date not in existing_dates:
                    weeks_to_create.append(
                        WeeklyPlan(
                            athlete_season=season, week_start=current_date, theme=""
                        )
                    )
                current_date += timedelta(days=7)
            if weeks_to_create:
                WeeklyPlan.objects.bulk_create(weeks_to_create)

        queryset = self.get_queryset().filter(
            week_start__gte=season.start_date, week_start__lte=season.end_date
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class WeeklyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = WeeklyPlanSerializer
    queryset = WeeklyPlan.objects.all()


class MasterWeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)
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

        search_start = target_date - timedelta(days=6)

        active_seasons = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).filter(
            Q(start_date__lte=target_date, end_date__gte=target_date)
            | Q(start_date__isnull=True)
            | Q(end_date__isnull=True)
        )

        data = []
        for season in active_seasons:
            week_plan = (
                WeeklyPlan.objects.filter(
                    athlete_season=season,
                    week_start__gte=search_start,
                    week_start__lte=target_date,
                )
                .order_by("-week_start")
                .first()
            )

            if not week_plan:
                week_plan = WeeklyPlan.objects.create(
                    athlete_season=season, week_start=target_date, theme=""
                )

            label = season.season
            ytp = season.yearly_plans.first()
            if ytp:
                label = str(ytp.planning_entity)

            data.append(
                {
                    "plan_data": WeeklyPlanSerializer(week_plan).data,
                    "label": label,
                    "season_id": season.id,
                }
            )

        return Response({"week_start": target_date, "plans": data})


class TeamMasterWeeklyPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
        team = Team.objects.get(id=team_id)
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

        search_start = target_date - timedelta(days=6)
        data = []

        for skater in [team.partner_a, team.partner_b]:
            active_seasons = AthleteSeason.objects.filter(
                skater=skater, is_active=True
            ).filter(
                Q(start_date__lte=target_date, end_date__gte=target_date)
                | Q(start_date__isnull=True)
                | Q(end_date__isnull=True)
            )
            for season in active_seasons:
                week_plan = (
                    WeeklyPlan.objects.filter(
                        athlete_season=season,
                        week_start__gte=search_start,
                        week_start__lte=target_date,
                    )
                    .order_by("-week_start")
                    .first()
                )
                if not week_plan:
                    week_plan = WeeklyPlan.objects.create(
                        athlete_season=season, week_start=target_date, theme=""
                    )

                ytp = season.yearly_plans.first()
                discipline_name = str(ytp.planning_entity) if ytp else season.season
                label = f"{skater.full_name.split(' ')[0]}: {discipline_name}"

                data.append(
                    {
                        "plan_data": WeeklyPlanSerializer(week_plan).data,
                        "label": label,
                        "season_id": season.id,
                        "skater_id": skater.id,
                    }
                )

        return Response({"week_start": target_date, "plans": data})


# --- GOALS ---
class GoalListCreateByPlanView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_queryset(self):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        return Goal.objects.filter(
            content_type=plan.content_type, object_id=plan.object_id
        ).order_by("-created_at")

    def perform_create(self, serializer):
        plan = YearlyPlan.objects.get(id=self.kwargs["plan_id"])
        serializer.save(
            content_type=plan.content_type,
            object_id=plan.object_id,
            current_status=Goal.GoalStatus.APPROVED,
        )


class GoalListBySkaterView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)
        query = Q()
        singles = skater.singles_entities.all()
        dance = skater.solodance_entities.all()
        teams_a = skater.teams_as_partner_a.all()
        teams_b = skater.teams_as_partner_b.all()

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
        if teams_a.exists():
            ct = ContentType.objects.get_for_model(Team)
            query |= Q(
                content_type=ct, object_id__in=teams_a.values_list("id", flat=True)
            )
        if teams_b.exists():
            ct = ContentType.objects.get_for_model(Team)
            query |= Q(
                content_type=ct, object_id__in=teams_b.values_list("id", flat=True)
            )
        if not query:
            return Goal.objects.none()
        return Goal.objects.filter(query).order_by("-created_at")

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)
        entity = (
            skater.singles_entities.first()
            or skater.solodance_entities.first()
            or skater.teams_as_partner_a.first()
        )
        if not entity:
            raise ValidationError("Cannot create goal: No active discipline.")
        content_type = ContentType.objects.get_for_model(entity)
        serializer.save(
            content_type=content_type,
            object_id=entity.id,
            current_status=Goal.GoalStatus.APPROVED,
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
            content_type=ct, object_id=team_id, current_status=Goal.GoalStatus.APPROVED
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
            content_type=ct, object_id=team_id, current_status=Goal.GoalStatus.APPROVED
        )


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer
    queryset = Goal.objects.all()


class GapAnalysisRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    Get or Update the Master Gap Analysis for a Skater or Team.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GapAnalysisSerializer

    def get_object(self):
        # Determine Entity
        if "team_id" in self.kwargs:
            # Synchro or Team
            team_id = self.kwargs["team_id"]
            # Check which type? We might need separate URLs or logic.
            # Let's try Team first, then SynchroTeam if needed, or rely on URL structure.
            # Actually, let's split logic or pass 'model_type' in kwargs?
            # SIMPLER: Look at the URL pattern.

            # If the URL includes 'synchro', it's SynchroTeam.
            if "synchro" in self.request.path:
                model_class = SynchroTeam
            else:
                model_class = Team

            entity = model_class.objects.get(id=team_id)
        else:
            # Skater
            skater_id = self.kwargs["skater_id"]
            entity = Skater.objects.get(id=skater_id)

        ct = ContentType.objects.get_for_model(entity)
        obj, created = GapAnalysis.objects.get_or_create(
            content_type=ct, object_id=entity.id
        )
        return obj
