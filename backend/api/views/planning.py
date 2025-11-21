from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from datetime import date, timedelta
from rest_framework.views import APIView

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
)
from api.serializers import (
    AthleteSeasonSerializer,
    YearlyPlanSerializer,
    MacrocycleSerializer,
    WeeklyPlanSerializer,
    GoalSerializer,
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
        skater_id = self.kwargs["skater_id"]
        return YearlyPlan.objects.filter(athlete_seasons__skater_id=skater_id)

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Determine Season
        season_id = self.request.data.get("season_id")
        new_season_data = self.request.data.get("new_season_data")

        target_season = None
        if season_id:
            try:
                target_season = AthleteSeason.objects.get(id=season_id, skater=skater)
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

        # Link Entity
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

        # Repair/Generate Weeks
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

        # Filter by all skater's entities
        from django.db.models import Q

        query = Q()

        singles = skater.singles_entities.all()
        dance = skater.solodance_entities.all()
        # (Teams logic would go here)

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

        if not query:
            return Goal.objects.none()
        return Goal.objects.filter(query).order_by("-created_at")

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Auto-link
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


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer
    queryset = Goal.objects.all()


class TeamYearlyPlanListCreateView(generics.ListCreateAPIView):
    """
    List/Create Plans for a TEAM.
    Auto-creates AthleteSeasons for partners if they don't exist.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(Team)
        return YearlyPlan.objects.filter(content_type=ct, object_id=team_id)

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        team = Team.objects.get(id=team_id)

        # 1. Determine Season Name & Dates
        # We expect the frontend to send 'new_season_data' or 'season_id'
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
            # If user picked an existing season from the dropdown (likely Partner A's),
            # we use its details to sync Partner B.
            try:
                ref_season = AthleteSeason.objects.get(id=season_id)
                season_name = ref_season.season
                start_date = ref_season.start_date
                end_date = ref_season.end_date
                target_seasons.append(ref_season)  # Add the one we found
            except AthleteSeason.DoesNotExist:
                raise ValidationError("Selected season invalid.")

        if not season_name:
            # Fallback: Auto-generate based on today
            today = date.today()
            start_year = today.year if today.month >= 7 else today.year - 1
            season_name = f"{start_year}-{start_year + 1}"

        # 2. Ensure BOTH partners have this season bucket
        # (We loop through both to be safe, get_or_create handles duplicates)
        for skater in [team.partner_a, team.partner_b]:
            # If we already added this skater's season via season_id, skip
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

        # 3. Link Plan to Team
        ct = ContentType.objects.get_for_model(Team)
        plan = serializer.save(
            coach_owner=self.request.user, content_type=ct, object_id=team.id
        )

        # 4. Link Plan to BOTH Seasons
        plan.athlete_seasons.set(target_seasons)


class MasterWeeklyPlanView(APIView):
    """
    Aggregates ALL weekly plans for a skater for a specific week.
    Auto-generates weekly records if they are missing for an active season.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)
        date_str = request.query_params.get("date")

        if not date_str:
            today = date.today()
            week_start = today - timedelta(days=today.weekday())
        else:
            try:
                week_start = date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date"}, status=status.HTTP_400_BAD_REQUEST
                )

        # --- 1. FIND ACTIVE SEASONS ---
        # Logic: Season is Active AND (Date falls in range OR Dates are missing)
        active_seasons = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).filter(
            Q(start_date__lte=week_start, end_date__gte=week_start)
            | Q(start_date__isnull=True)
            | Q(end_date__isnull=True)
        )

        # --- 2. AUTO-GENERATE MISSING WEEKS ---
        for season in active_seasons:
            # Ensure the container exists for this week
            WeeklyPlan.objects.get_or_create(
                athlete_season=season, week_start=week_start, defaults={"theme": ""}
            )

        # --- 3. QUERY PLANS ---
        plans = WeeklyPlan.objects.filter(
            athlete_season__skater=skater, week_start=week_start
        ).select_related("athlete_season")

        # --- 4. SERIALIZE ---
        data = []
        for plan in plans:
            label = plan.athlete_season.season
            ytp = plan.athlete_season.yearly_plans.first()
            if ytp:
                label = str(ytp.planning_entity)

            data.append(
                {
                    "plan_data": WeeklyPlanSerializer(plan).data,
                    "label": label,
                    "season_id": plan.athlete_season.id,
                }
            )

        return Response({"week_start": week_start, "plans": data})
