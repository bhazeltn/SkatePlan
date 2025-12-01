from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
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
from api.services import get_access_role


# --- HELPERS ---
def get_entity_staff(entity_obj, role_list):
    ct = ContentType.objects.get_for_model(entity_obj)
    access_records = PlanningEntityAccess.objects.filter(
        content_type=ct, object_id=entity_obj.id, access_level__in=role_list
    ).select_related("user")

    results = []
    for record in access_records:
        results.append(
            {
                "id": record.id,
                "user_id": record.user.pk,
                "full_name": record.user.full_name,
                "email": record.user.email,
                "role": record.access_level,
            }
        )
    return results


def get_visible_planning_entities(user, skater, context):
    entities = []
    if not user:
        return []

    # 1. Determine Access Rights
    has_direct_access = False
    if user.is_superuser or skater.user_account == user:
        has_direct_access = True
    else:
        ct_skater = ContentType.objects.get_for_model(skater)
        if PlanningEntityAccess.objects.filter(
            user=user, content_type=ct_skater, object_id=skater.id
        ).exists():
            has_direct_access = True

    # 2. Add Personal Disciplines
    if has_direct_access:
        for entity in skater.singles_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=context).data
            )
        for entity in skater.solodance_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=context).data
            )

    # 3. Add Teams
    teams = list(skater.teams_as_partner_a.all()) + list(
        skater.teams_as_partner_b.all()
    )
    ct_team = ContentType.objects.get_for_model(Team)
    for team in teams:
        if (
            user.is_superuser
            or skater.user_account == user
            or PlanningEntityAccess.objects.filter(
                user=user, content_type=ct_team, object_id=team.id
            ).exists()
        ):
            entities.append(GenericPlanningEntitySerializer(team, context=context).data)

    # 4. Add Synchro
    ct_synchro = ContentType.objects.get_for_model(SynchroTeam)
    for team in skater.synchro_teams.all():
        if (
            user.is_superuser
            or skater.user_account == user
            or PlanningEntityAccess.objects.filter(
                user=user, content_type=ct_synchro, object_id=team.id
            ).exists()
        ):
            entities.append(GenericPlanningEntitySerializer(team, context=context).data)

    return entities


# --- SERIALIZERS ---


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


class SimpleSynchroTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = SynchroTeam
        fields = ("id", "team_name", "level")


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

    collaborators = serializers.SerializerMethodField()
    observers = serializers.SerializerMethodField()

    # IMPORTANT: This field controls the Dashboard Section
    access_level = serializers.SerializerMethodField()

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
            "is_active",
            "collaborators",
            "observers",
            "access_level",
        )

    def get_name(self, obj):
        return obj.get_discipline_display()

    def get_collaborators(self, obj):
        return get_entity_staff(obj, ["COLLABORATOR", "MANAGER", "COACH"])

    def get_observers(self, obj):
        return get_entity_staff(obj, ["VIEWER", "OBSERVER"])

    def get_access_level(self, obj):
        user = self.context.get("request").user
        if not user:
            return None
        return get_access_role(user, obj)


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

    collaborators = serializers.SerializerMethodField()
    observers = serializers.SerializerMethodField()

    name = serializers.SerializerMethodField()
    current_level = serializers.SerializerMethodField()

    # IMPORTANT
    access_level = serializers.SerializerMethodField()

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
            "is_active",
            "collaborators",
            "observers",
            "access_level",
            "name",
            "current_level",
        )

    def get_name(self, obj):
        return obj.team_name

    def get_current_level(self, obj):
        return obj.level

    def get_collaborators(self, obj):
        return get_entity_staff(obj, ["COLLABORATOR", "MANAGER", "COACH"])

    def get_observers(self, obj):
        return get_entity_staff(obj, ["VIEWER", "OBSERVER"])

    def get_access_level(self, obj):
        user = self.context.get("request").user
        if not user:
            return None
        return get_access_role(user, obj)

    def update(self, instance, validated_data):
        if "roster" in validated_data:
            instance.roster.set(validated_data.pop("roster"))
        return super().update(instance, validated_data)


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
    user_account_email = serializers.SerializerMethodField()
    guardians = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    observers = serializers.SerializerMethodField()
    synchro_teams = SimpleSynchroTeamSerializer(many=True, read_only=True)
    has_guardian = serializers.SerializerMethodField()
    access_level = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "home_club",
            "planning_entities",
            "synchro_teams",
            "is_active",
            "federation",
            "profile",
            "user_account",
            "user_account_email",
            "guardians",
            "collaborators",
            "observers",
            "has_guardian",
            "access_level",
        )

    def get_planning_entities(self, obj):
        return get_visible_planning_entities(
            self.context.get("request").user, obj, self.context
        )

    def get_user_account_email(self, obj):
        return obj.user_account.email if obj.user_account else None

    def get_guardians(self, obj):
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(obj)
        access_records = PlanningEntityAccess.objects.filter(
            content_type=ct, object_id=obj.id, access_level="GUARDIAN"
        ).select_related("user")

        return [
            {
                "id": record.id,
                "user_id": record.user.pk,
                "full_name": record.user.full_name,
                "email": record.user.email,
            }
            for record in access_records
        ]

    def get_has_guardian(self, obj):
        return len(self.get_guardians(obj)) > 0

    def get_collaborators(self, obj):
        ct = ContentType.objects.get_for_model(obj)
        access_records = PlanningEntityAccess.objects.filter(
            content_type=ct,
            object_id=obj.id,
            access_level__in=["COLLABORATOR", "MANAGER", "COACH"],
        ).select_related("user")

        results = []
        for record in access_records:
            if obj.user_account and record.user == obj.user_account:
                continue

            results.append(
                {
                    "id": record.id,
                    "user_id": record.user.pk,
                    "full_name": record.user.full_name,
                    "email": record.user.email,
                    "role": record.access_level,
                }
            )
        return results

    def get_observers(self, obj):
        ct = ContentType.objects.get_for_model(obj)
        access_records = PlanningEntityAccess.objects.filter(
            content_type=ct, object_id=obj.id, access_level__in=["VIEWER", "OBSERVER"]
        ).select_related("user")

        results = []
        for record in access_records:
            results.append(
                {
                    "id": record.id,
                    "user_id": record.user.pk,
                    "full_name": record.user.full_name,
                    "email": record.user.email,
                    "role": "Observer",
                }
            )
        return results

    def get_access_level(self, obj):
        return get_access_role(self.context.get("request").user, obj)


class RosterSkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()
    federation = FederationSerializer(read_only=True)
    gender = serializers.CharField(source="get_gender_display", read_only=True)
    access_level = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "federation",
            "planning_entities",
            "access_level",
            "is_active",  # <--- ADDED BACK
        )

    def get_planning_entities(self, obj):
        return get_visible_planning_entities(
            self.context.get("request").user, obj, self.context
        )

    def get_access_level(self, obj):
        return get_access_role(self.context.get("request").user, obj)
