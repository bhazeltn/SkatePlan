from rest_framework import serializers
from api.models import SessionLog, InjuryLog
from api.services import get_access_role


class SessionLogSerializer(serializers.ModelSerializer):
    discipline_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = SessionLog
        fields = (
            "id",
            "session_date",
            "session_time",  # <--- Added
            "location",  # <--- Added
            "session_type",  # <--- Added
            "discipline_name",
            "author_name",
            "session_rating",
            "energy_stamina",
            "sentiment_emoji",
            "wellbeing_focus_check_in",
            "wellbeing_mental_focus_notes",
            "coach_notes",
            "skater_notes",
            "attendance",
            "jump_focus",
            "spin_focus",
            "synchro_element_focus",
        )
        read_only_fields = ("author",)

    def get_discipline_name(self, obj):
        if obj.planning_entity:
            if hasattr(obj.planning_entity, "team_name"):
                return obj.planning_entity.team_name
            if hasattr(obj.planning_entity, "skater"):
                return (
                    "Singles" if "Singles" in str(obj.planning_entity) else "Solo Dance"
                )
        return "General"

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else "Unknown"

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if request and request.user:
            user = request.user

            # Resolve Entity to check role
            entity = None
            if instance.athlete_season:
                entity = (
                    instance.athlete_season.skater
                    or instance.athlete_season.planning_entity
                )

            role = get_access_role(user, entity)

            # STAFF: Can edit Coach Notes, CANNOT edit Skater Notes
            if role in ["OWNER", "COACH", "COLLABORATOR", "MANAGER"]:
                if "skater_notes" in validated_data:
                    validated_data.pop("skater_notes")

            # FAMILY: Can edit Skater Notes, CANNOT edit Coach Notes
            elif role in ["SKATER", "GUARDIAN", "SKATER_OWNER"]:
                if "coach_notes" in validated_data:
                    validated_data.pop("coach_notes")

        return super().update(instance, validated_data)


class InjuryLogSerializer(serializers.ModelSerializer):
    skater = serializers.PrimaryKeyRelatedField(read_only=True)
    skater_name = serializers.SerializerMethodField()

    class Meta:
        model = InjuryLog
        fields = (
            "id",
            "skater",
            "skater_name",
            "injury_type",
            "body_area",
            "date_of_onset",
            "return_to_sport_date",
            "severity",
            "recovery_status",
            "recovery_notes",
        )

    def get_skater_name(self, obj):
        return obj.skater.full_name if obj.skater else "Unknown"
