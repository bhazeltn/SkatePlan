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
        fields = "__all__"


class MacrocycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Macrocycle
        fields = "__all__"


class YearlyPlanSerializer(serializers.ModelSerializer):
    macrocycles = MacrocycleSerializer(many=True, read_only=True)
    season_info = AthleteSeasonSerializer(
        source="athlete_seasons", many=True, read_only=True
    )
    discipline_name = serializers.SerializerMethodField()
    dashboard_url = serializers.SerializerMethodField()

    class Meta:
        model = YearlyPlan
        fields = (
            "id",
            "coach_owner",
            "planning_entity",
            "peak_type",
            "primary_season_goal",
            "created_at",
            "updated_at",
            "macrocycles",
            "season_info",
            "discipline_name",
            "dashboard_url",
        )

    def get_discipline_name(self, obj):
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return obj.planning_entity.team_name
            if hasattr(obj.planning_entity, "name"):
                return obj.planning_entity.name
        return "General"

    def get_dashboard_url(self, obj):
        # Helper to link back to the correct dashboard from the Editor
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "skater"):
                return f"#/skater/{obj.planning_entity.skater.id}"
            if hasattr(obj.planning_entity, "team_name"):
                # Check if Synchro
                if hasattr(obj.planning_entity, "roster"):
                    return f"#/synchro/{obj.planning_entity.id}"
                return f"#/team/{obj.planning_entity.id}"
        return "#/"


class WeeklyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyPlan
        fields = "__all__"


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
        # NOTE: current_status is NOT read-only so Coaches can update it.
        # We protect it via the update() method below for non-coaches.
        read_only_fields = ("created_by", "updated_by")

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else "System"

    def get_updated_by_name(self, obj):
        return obj.updated_by.full_name if obj.updated_by else "System"

    def get_discipline(self, obj):
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return f"{obj.planning_entity.team_name}"
            if hasattr(obj.planning_entity, "name"):
                return obj.planning_entity.name
        return "General"

    def validate(self, data):
        # Lock Logic: Non-coaches cannot edit locked goals
        if self.instance:
            user = self.context["request"].user
            if user.role in ["GUARDIAN", "SKATER"]:
                locked_statuses = ["APPROVED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]

                # If the goal IS locked, prevent editing core details via the modal form
                # We check the *existing* status in the DB, not the incoming one
                if self.instance.current_status in locked_statuses:
                    # Exception: If they are just adding progress notes?
                    # For now, strict block to match requirements.
                    raise serializers.ValidationError(
                        f"You cannot edit this goal because it is {self.instance.get_current_status_display()}. Only a coach can modify it now."
                    )
        return data

    def update(self, instance, validated_data):
        # Permission Logic for Status Changes
        user = self.context["request"].user

        if user.role in ["GUARDIAN", "SKATER"]:
            # If a non-coach tries to change status (e.g. via API directly), ignore it
            if "current_status" in validated_data:
                validated_data.pop("current_status")

        return super().update(instance, validated_data)


class GapAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = GapAnalysis
        fields = "__all__"
