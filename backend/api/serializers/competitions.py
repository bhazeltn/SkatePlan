from rest_framework import serializers
from api.models import Competition, CompetitionResult, SkaterTest, Program, ProgramAsset
import json


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = "__all__"


class CompetitionResultSerializer(serializers.ModelSerializer):
    competition = CompetitionSerializer(read_only=True)
    competition_id = serializers.PrimaryKeyRelatedField(
        queryset=Competition.objects.all(), source="competition", write_only=True
    )

    # --- FIX: Mark object_id as read_only so validation passes ---
    object_id = serializers.IntegerField(read_only=True)
    planning_entity_type = serializers.SerializerMethodField()
    # -------------------------------------------------------------

    class Meta:
        model = CompetitionResult
        fields = (
            "id",
            "competition",
            "competition_id",
            "status",
            "level",
            "placement",
            "total_score",
            "planned_base_value",
            "segment_scores",
            "notes",
            "detail_sheet",
            "video_url",
            "object_id",  # Included in output
            "planning_entity_type",  # Included in output
        )

    def get_planning_entity_type(self, obj):
        if obj.content_type:
            return obj.content_type.model_class().__name__
        return "Unknown"

    def validate_segment_scores(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format.")
        return value


class SkaterTestSerializer(serializers.ModelSerializer):
    # FIX: Mark skater as read_only so validation doesn't fail when missing from payload
    skater = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SkaterTest
        fields = (
            "id",
            "skater",
            "test_type",
            "test_name",
            "test_date",
            "status",
            "result",
            "evaluator_notes",
            "test_sheet",
            "video_url",
        )


class ProgramAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramAsset
        fields = "__all__"


class ProgramSerializer(serializers.ModelSerializer):
    assets = ProgramAssetSerializer(many=True, read_only=True)

    # Ensure these are read_only
    object_id = serializers.IntegerField(read_only=True)
    planning_entity_type = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = (
            "id",
            "title",
            "season",
            "program_category",
            "music_title",
            "choreographer",
            "planned_elements",
            "est_base_value",
            "is_active",
            "music_file",
            "assets",
            "object_id",
            "planning_entity_type",
        )

    def get_planning_entity_type(self, obj):
        if obj.content_type:
            return obj.content_type.model_class().__name__
        return "Unknown"

    def validate_planned_elements(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format.")
        return value
