from rest_framework import serializers
from api.models import (
    Skater,
    AthleteProfile,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    Federation,
    PlanningEntityAccess,
)
from .core import FederationSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class AthleteProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteProfile
        fields = (
            "skater_email",
            "guardian_name",
            "guardian_email",
            "emergency_contact_name",
            "emergency_contact_phone",
            "relevant_medical_notes",
        )


class SimpleSkaterSerializer(serializers.ModelSerializer):
    federation = FederationSerializer(read_only=True)

    class Meta:
        model = Skater
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "home_club",
            "is_active",
            "federation",
        )


class SinglesEntitySerializer(serializers.ModelSerializer):
    skater = SimpleSkaterSerializer(read_only=True)
    federation = FederationSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = SinglesEntity
        fields = ("id", "name", "skater", "federation", "current_level")

    def get_name(self, obj):
        return "Singles"


class SoloDanceEntitySerializer(serializers.ModelSerializer):
    skater = SimpleSkaterSerializer(read_only=True)
    federation = FederationSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = SoloDanceEntity
        fields = ("id", "name", "skater", "federation", "current_level")

    def get_name(self, obj):
        return "Solo Dance"


class TeamSerializer(serializers.ModelSerializer):
    federation = FederationSerializer(read_only=True)
    federation_id = serializers.PrimaryKeyRelatedField(
        queryset=Federation.objects.all(),
        source="federation",
        write_only=True,
        required=False,
        allow_null=True,
    )
    partner_a_details = SimpleSkaterSerializer(source="partner_a", read_only=True)
    partner_b_details = SimpleSkaterSerializer(source="partner_b", read_only=True)
    partner_a = serializers.PrimaryKeyRelatedField(
        queryset=Skater.objects.all(), write_only=True
    )
    partner_b = serializers.PrimaryKeyRelatedField(
        queryset=Skater.objects.all(), write_only=True
    )
    name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = (
            "id",
            "name",
            "team_name",
            "discipline",
            "current_level",
            "federation",
            "federation_id",
            "partner_a",
            "partner_b",
            "partner_a_details",
            "partner_b_details",
        )

    def get_name(self, obj):
        return obj.get_discipline_display()


class SynchroTeamSerializer(serializers.ModelSerializer):
    federation = FederationSerializer(read_only=True)
    federation_id = serializers.PrimaryKeyRelatedField(
        queryset=Federation.objects.all(),
        source="federation",
        write_only=True,
        required=False,
        allow_null=True,
    )
    roster = SimpleSkaterSerializer(many=True, read_only=True)
    roster_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skater.objects.all(),
        source="roster",
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = SynchroTeam
        fields = (
            "id",
            "team_name",
            "level",
            "federation",
            "federation_id",
            "roster",
            "roster_ids",
        )


class GenericPlanningEntitySerializer(serializers.Serializer):
    def to_representation(self, instance):
        data = None
        if isinstance(instance, SinglesEntity):
            data = SinglesEntitySerializer(instance, context=self.context).data
        elif isinstance(instance, SoloDanceEntity):
            data = SoloDanceEntitySerializer(instance, context=self.context).data
        elif isinstance(instance, Team):
            data = TeamSerializer(instance, context=self.context).data
        elif isinstance(instance, SynchroTeam):
            data = SynchroTeamSerializer(instance, context=self.context).data
        if data is None:
            data = {"id": instance.id, "name": str(instance)}
        data["type"] = instance.__class__.__name__
        return data


class SkaterUpdateSerializer(serializers.ModelSerializer):
    federation = serializers.PrimaryKeyRelatedField(
        queryset=Federation.objects.all(), required=False, allow_null=True
    )
    profile = AthleteProfileSerializer(required=False)

    class Meta:
        model = Skater
        fields = (
            "full_name",
            "date_of_birth",
            "gender",
            "home_club",
            "federation",
            "is_active",
            "profile",
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            AthleteProfile.objects.update_or_create(
                skater=instance, defaults=profile_data
            )
        return instance


class SkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()
    gender = serializers.CharField(source="get_gender_display", read_only=True)
    federation = FederationSerializer(read_only=True)
    profile = AthleteProfileSerializer(read_only=True)

    # Custom Fields for Account Management
    user_account_email = serializers.SerializerMethodField()
    guardians = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "home_club",
            "planning_entities",
            "is_active",
            "federation",
            "profile",
            "user_account",
            "user_account_email",
            "guardians",
        )

    def get_planning_entities(self, obj):
        entities = []
        for entity in obj.singles_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.solodance_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.teams_as_partner_a.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.teams_as_partner_b.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        return entities

    def get_user_account_email(self, obj):
        return obj.user_account.email if obj.user_account else None

    def get_guardians(self, obj):
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(obj)
        # Find users with GUARDIAN access to this skater
        access_records = PlanningEntityAccess.objects.filter(
            content_type=ct, object_id=obj.id, access_level="GUARDIAN"
        ).select_related("user")

        return [
            {"full_name": record.user.full_name, "email": record.user.email}
            for record in access_records
        ]


class RosterSkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()
    federation = FederationSerializer(read_only=True)
    gender = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model = Skater
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "federation",
            "planning_entities",
        )

    def get_planning_entities(self, obj):
        entities = []
        for entity in obj.singles_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.solodance_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.teams_as_partner_a.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        for entity in obj.teams_as_partner_b.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        return entities
