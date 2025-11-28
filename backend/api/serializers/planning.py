from rest_framework import serializers
from api.models import (
    AthleteSeason,
    Macrocycle,
    YearlyPlan,
    WeeklyPlan,
    Goal,
    GapAnalysis,
)


class AthleteSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteSeason
        fields = ("id", "season", "start_date", "end_date", "is_active")


class MacrocycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Macrocycle
        fields = (
            "id",
            "phase_title",
            "phase_start",
            "phase_end",
            "phase_focus",
            "technical_focus",
            "component_focus",
            "physical_focus",
            "mental_focus",
        )


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
        # --- FIX: Handle missing skater (Team/Synchro Plan) ---
        # Try to get skater from seasons
        season = obj.athlete_seasons.first()
        if season and season.skater:
            return season.skater.id

        # Fallback: If linked to entity via GenericFK
        if hasattr(obj.planning_entity, "skater") and obj.planning_entity.skater:
            return obj.planning_entity.skater.id

        return None  # Return None for Teams

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
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    discipline = serializers.SerializerMethodField()

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
            "updated_at",
            "created_by_name",
            "updated_by_name",
            "discipline",
            "coach_review_notes",
        )
        read_only_fields = ("created_by", "updated_by", "current_status")

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else "System"

    def get_updated_by_name(self, obj):
        return obj.updated_by.full_name if obj.updated_by else "System"

    def get_discipline(self, obj):
        # Polymorphic lookup for the display name
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return f"{obj.planning_entity.team_name}"  # Team/Synchro
            if hasattr(obj.planning_entity, "name"):
                return obj.planning_entity.name  # Singles/Dance Entity name
        return "General"

    def validate(self, data):
        # --- PERMISSION LOCK LOGIC ---
        # If this is an update (instance exists)
        if self.instance:
            user = self.context["request"].user

            # If user is NOT a coach (i.e. Guardian or Skater)
            if user.role in ["GUARDIAN", "SKATER"]:
                # Check the status of the EXISTING record (from DB)
                locked_statuses = ["APPROVED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]
                if self.instance.current_status in locked_statuses:
                    raise serializers.ValidationError(
                        f"You cannot edit this goal because it is {self.instance.get_current_status_display()}. Only a coach can modify it now."
                    )

        return data


class GapAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = GapAnalysis
        fields = "__all__"
