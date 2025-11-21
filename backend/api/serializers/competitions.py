from rest_framework import serializers
from api.models import Competition, CompetitionResult, SkaterTest, Program


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = "__all__"


class CompetitionResultSerializer(serializers.ModelSerializer):
    competition = CompetitionSerializer(read_only=True)
    competition_id = serializers.PrimaryKeyRelatedField(
        queryset=Competition.objects.all(), source="competition", write_only=True
    )

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
            "detailed_protocol",
            "segment_scores",
            "notes",
            "detail_sheet",
            "video_url",
        )


class SkaterTestSerializer(serializers.ModelSerializer):
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


class ProgramSerializer(serializers.ModelSerializer):
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
            "costume_design",
            "costume_photo",
            "hair_photo",
        )
