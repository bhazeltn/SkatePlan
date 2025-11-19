from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from .models import (
    Skater,
    SinglesEntity,
    Federation,
    PlanningEntityAccess,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    AthleteProfile,
    YearlyPlan,
    Macrocycle,
)

User = get_user_model()

# ==========================================
# 1. USER & AUTH SERIALIZERS
# ==========================================


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "full_name", "role", "phone_number")
        read_only_fields = ("role",)


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "password", "full_name", "phone_number")
        extra_kwargs = {
            "password": {"write_only": True, "style": {"input_type": "password"}}
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=validated_data["password"],
            phone_number=validated_data.get("phone_number"),
            role=User.Role.COACH,  # Hardcoded for public sign-up
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        style={"input_type": "password"}, trim_whitespace=False
    )

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(
            request=self.context.get("request"), email=email, password=password
        )
        if not user:
            raise serializers.ValidationError("Unable to log in.", code="authorization")
        attrs["user"] = user
        return attrs


# ==========================================
# 2. INFRASTRUCTURE & BASE SERIALIZERS
# ==========================================


class FederationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Federation
        fields = ("id", "name", "code", "flag_emoji")


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
    """
    Lightweight skater serializer to avoid recursion in entities.
    """

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


# ==========================================
# 3. ENTITY SERIALIZERS
# ==========================================


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

    class Meta:
        model = Team
        fields = ("id", "team_name", "discipline", "current_level", "federation")


class SynchroTeamSerializer(serializers.ModelSerializer):
    federation = FederationSerializer(read_only=True)

    class Meta:
        model = SynchroTeam
        fields = ("id", "team_name", "level", "federation")


class GenericPlanningEntitySerializer(serializers.ModelSerializer):
    """
    Polymorphic serializer that injects the 'type' field.
    """

    def to_representation(self, instance):
        data = None

        # Delegate to specific serializers
        if isinstance(instance, SinglesEntity):
            data = SinglesEntitySerializer(instance, context=self.context).data
        elif isinstance(instance, SoloDanceEntity):
            data = SoloDanceEntitySerializer(instance, context=self.context).data
        elif isinstance(instance, Team):
            data = TeamSerializer(instance, context=self.context).data
        elif isinstance(instance, SynchroTeam):
            data = SynchroTeamSerializer(instance, context=self.context).data

        # Fallback
        if data is None:
            data = {
                "id": instance.id,
                "name": str(instance),
            }

        # --- CRITICAL FIX: Inject Type ---
        # This tells the frontend which entity this is (e.g. "SinglesEntity")
        data["type"] = instance.__class__.__name__

        return data


# ==========================================
# 4. PLANNING SERIALIZERS
# ==========================================


class MacrocycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Macrocycle
        fields = ("id", "phase_title", "phase_start", "phase_end", "phase_focus")


class YearlyPlanSerializer(serializers.ModelSerializer):
    macrocycles = MacrocycleSerializer(many=True, read_only=True)
    discipline_name = serializers.SerializerMethodField()
    # Mark planning_entity as read_only so validation doesn't fail on creation
    # (because we set it manually in the View)
    planning_entity = serializers.SerializerMethodField()

    class Meta:
        model = YearlyPlan
        fields = (
            "id",
            "planning_entity",
            "discipline_name",
            "peak_type",
            "primary_season_goal",
            "macrocycles",
        )

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


# ==========================================
# 5. PROFILE & ROSTER SERIALIZERS
# ==========================================


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


class RosterSkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "planning_entities")

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
