from rest_framework import serializers
from api.models import AthleteSeason, Macrocycle, YearlyPlan, WeeklyPlan, Goal


class AthleteSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteSeason
        fields = ("id", "season", "start_date", "end_date", "is_active")


class MacrocycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Macrocycle
        fields = ("id", "phase_title", "phase_start", "phase_end", "phase_focus")


class YearlyPlanSerializer(serializers.ModelSerializer):
    macrocycles = MacrocycleSerializer(many=True, read_only=True)
    discipline_name = serializers.SerializerMethodField()
    planning_entity = serializers.SerializerMethodField()
    season_info = serializers.SerializerMethodField()
    skater_id = serializers.SerializerMethodField()
    dashboard_url = serializers.SerializerMethodField()

    class Meta:
        model = YearlyPlan
        fields = (
            "id",
            "planning_entity",
            "discipline_name",
            "skater_id",
            "peak_type",
            "primary_season_goal",
            "macrocycles",
            "season_info",
            "dashboard_url",
        )

    def get_season_info(self, obj):
        season = obj.athlete_seasons.first()
        if season:
            return AthleteSeasonSerializer(season).data
        return None

    def get_skater_id(self, obj):
        season = obj.athlete_seasons.first()
        if season:
            return season.skater.id
        return None

    def get_discipline_name(self, obj):
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return obj.planning_entity.team_name
            if hasattr(obj.planning_entity, "skater"):
                return (
                    "Singles" if "Singles" in str(obj.planning_entity) else "Solo Dance"
                )
        return "Unknown Discipline"

    def get_planning_entity(self, obj):
        return str(obj.planning_entity)

    def get_dashboard_url(self, obj):
        # Helper to determine where the "Back" button should go
        if not obj.planning_entity:
            return "#/"

        # Check type of entity
        model_name = obj.content_type.model
        if model_name == "synchroteam":
            return f"#/synchro/{obj.object_id}"
        elif model_name == "team":
            return f"#/team/{obj.object_id}"
        elif model_name in ["singlesentity", "solodanceentity"]:
            # For singles, we need the skater ID
            # Access via the entity relation (e.g. obj.planning_entity.skater.id)
            if hasattr(obj.planning_entity, "skater"):
                return f"#/skater/{obj.planning_entity.skater.id}"

        # Fallback: Try finding via season
        season = obj.athlete_seasons.first()
        if season and season.skater:
            return f"#/skater/{season.skater.id}"

        return "#/"


class WeeklyPlanSerializer(serializers.ModelSerializer):
    active_macrocycles = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyPlan
        fields = (
            "id",
            "week_start",
            "theme",
            "planned_off_ice_activities",
            "session_breakdown",
            "active_macrocycles",
        )

    def get_active_macrocycles(self, obj):
        week_date = obj.week_start
        season = obj.athlete_season
        plans = season.yearly_plans.all()
        active_cycles = Macrocycle.objects.filter(
            yearly_plan__in=plans, phase_start__lte=week_date, phase_end__gte=week_date
        )
        results = []
        for cycle in active_cycles:
            discipline = "Unknown"
            entity = cycle.yearly_plan.planning_entity
            if entity:
                if hasattr(entity, "team_name"):
                    discipline = entity.team_name
                elif hasattr(entity, "skater"):
                    discipline = "Singles" if "Singles" in str(entity) else "Solo Dance"
            results.append(
                {
                    "discipline": discipline,
                    "phase_title": cycle.phase_title,
                    "phase_focus": cycle.phase_focus,
                }
            )
        return results


class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = (
            "id",
            "title",
            "goal_type",
            "goal_timeframe",
            "start_date",
            "target_date",
            "smart_description",
            "current_status",
            "progress_notes",
            "created_at",
        )
