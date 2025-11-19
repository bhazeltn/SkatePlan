from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from .models import Skater, SinglesEntity, Federation, PlanningEntityAccess
from .models import SoloDanceEntity, Team, SynchroTeam

User = get_user_model()

# --- 1. User & Auth Serializers ---


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
            raise serializers.ValidationError(
                "Unable to log in with provided credentials.", code="authorization"
            )

        attrs["user"] = user
        return attrs


class FederationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Federation
        fields = ("id", "name", "code", "flag_emoji")


# --- 2. Base Skater Serializer (Breaks Recursion) ---


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


# --- 3. Entity Serializers ---


class SinglesEntitySerializer(serializers.ModelSerializer):
    skater = SimpleSkaterSerializer(read_only=True)
    # Add a custom field for the display name
    name = serializers.SerializerMethodField()

    class Meta:
        model = SinglesEntity
        # Add 'name' to fields
        fields = ("id", "name", "skater", "federation", "current_level")

    def get_name(self, obj):
        return "Singles"


class SoloDanceEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SoloDanceEntity
        fields = ("id", "skater", "federation", "current_level")


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = (
            "id",
            "team_name",
            "discipline",
            "partner_a",
            "partner_b",
            "federation",
            "current_level",
        )


class SynchroTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = SynchroTeam
        fields = ("id", "team_name", "level", "federation")


class GenericPlanningEntitySerializer(serializers.ModelSerializer):
    """
    Polymorphic serializer that returns the correct data structure
    based on the entity type.
    """

    def to_representation(self, instance):
        if isinstance(instance, SinglesEntity):
            return SinglesEntitySerializer(instance, context=self.context).data

        # Fallback for other types (we will build specific serializers for these later)
        return {
            "id": instance.id,
            "name": str(instance),
            "type": instance.__class__.__name__,
        }


# --- 4. Full Profile Serializers (For Dashboards/Rosters) ---


class SkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()
    gender = serializers.CharField(source="get_gender_display", read_only=True)
    # NEW: Include Federation
    federation = FederationSerializer(read_only=True)

    class Meta:
        model = Skater
        # Add 'federation' to fields
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "gender",
            "home_club",
            "planning_entities",
            "is_active",
            "federation",
        )

    def get_planning_entities(self, obj):
        entities = []
        # 1. Singles
        for entity in obj.singles_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        # 2. Solo Dance
        for entity in obj.solodance_entities.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        # 3. Pairs (Partner A)
        for entity in obj.teams_as_partner_a.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )
        # 4. Pairs (Partner B)
        for entity in obj.teams_as_partner_b.all():
            entities.append(
                GenericPlanningEntitySerializer(entity, context=self.context).data
            )

        return entities


class SkaterUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for UPDATING a skater.
    Accepts raw values (e.g. 'FEMALE', federation_id) instead of nested objects.
    """

    federation = serializers.PrimaryKeyRelatedField(
        queryset=Federation.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Skater
        fields = ("full_name", "date_of_birth", "gender", "home_club", "federation")


class RosterSkaterSerializer(serializers.ModelSerializer):
    """
    Serializer for the Coach's Roster List.
    """

    planning_entities = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "planning_entities")

    def get_planning_entities(self, obj):
        # Reuse the same logic as SkaterSerializer, but kept separate
        # in case Roster needs a lighter version in the future.
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
