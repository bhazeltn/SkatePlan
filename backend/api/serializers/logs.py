from rest_framework import serializers
from api.models import SessionLog, InjuryLog


class SessionLogSerializer(serializers.ModelSerializer):
    discipline_name = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = SessionLog
        fields = (
            "id",
            "session_date",
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


class InjuryLogSerializer(serializers.ModelSerializer):
    # --- NEW: Expose Skater Name ---
    skater_name = serializers.SerializerMethodField()
    # -------------------------------

    class Meta:
        model = InjuryLog
        fields = (
            "id",
            "skater",
            "skater_name",  # <--- Add field
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
