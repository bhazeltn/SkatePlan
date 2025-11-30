from rest_framework import serializers
from api.models import (
    AthleteSeason,
    Macrocycle,
    YearlyPlan,
    WeeklyPlan,
    Goal,
    GapAnalysis,
    PlanningEntityAccess,
)
from django.contrib.contenttypes.models import ContentType
from api.services import get_access_role


class AthleteSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteSeason
        fields = "__all__"


class MacrocycleSerializer(serializers.ModelSerializer):
    # FIX: Mark as read-only so validation doesn't fail when missing from payload
    yearly_plan = serializers.PrimaryKeyRelatedField(read_only=True)

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
    planning_entity = serializers.SerializerMethodField()
    access_level = serializers.SerializerMethodField()

    class Meta:
        model = YearlyPlan
        fields = (
            "id",
            "coach_owner",
            "planning_entity",
            "title",
            "peak_type",
            "primary_season_goal",
            "created_at",
            "updated_at",
            "macrocycles",
            "season_info",
            "discipline_name",
            "dashboard_url",
            "access_level",
        )

    def get_planning_entity(self, obj):
        return str(obj.planning_entity)

    def get_discipline_name(self, obj):
        if obj.title:
            return obj.title

        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return obj.planning_entity.team_name
            if hasattr(obj.planning_entity, "name"):
                return obj.planning_entity.name
            if obj.planning_entity.__class__.__name__ == "SinglesEntity":
                return "Singles"
        return "General"

    def get_dashboard_url(self, obj):
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "skater"):
                return f"#/skater/{obj.planning_entity.skater.id}"
            if hasattr(obj.planning_entity, "team_name"):
                if hasattr(obj.planning_entity, "roster"):
                    return f"#/synchro/{obj.planning_entity.id}"
                return f"#/team/{obj.planning_entity.id}"
        return "#/"

    def get_access_level(self, obj):
        user = self.context.get("request").user
        if not user:
            return None

        if obj.coach_owner == user:
            return "OWNER"

        target = obj.planning_entity
        if not target:
            return None

        if hasattr(target, "skater"):
            target = target.skater

        return get_access_role(user, target)


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
        # FIX: Ensure internal fields are read-only
        read_only_fields = ("created_by", "updated_by", "content_type", "object_id")

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
        if self.instance:
            user = self.context["request"].user
            if user.role in ["GUARDIAN", "SKATER"]:
                locked_statuses = ["APPROVED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]

                if self.instance.current_status in locked_statuses:
                    raise serializers.ValidationError(
                        f"You cannot edit this goal because it is {self.instance.get_current_status_display()}. Only a coach can modify it now."
                    )
        return data

    def update(self, instance, validated_data):
        user = self.context["request"].user
        if user.role in ["GUARDIAN", "SKATER"]:
            if "current_status" in validated_data:
                validated_data.pop("current_status")
        return super().update(instance, validated_data)


class GapAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = GapAnalysis
        fields = "__all__"
