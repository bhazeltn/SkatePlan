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
)


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
    # (Make sure you kept the SimpleSkaterSerializer fix here!)
    skater = SimpleSkaterSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = SinglesEntity
        fields = ("id", "name", "skater", "federation", "current_level")

    def get_name(self, obj):
        return "Singles"


class SoloDanceEntitySerializer(serializers.ModelSerializer):
    skater = SimpleSkaterSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = SoloDanceEntity
        fields = ("id", "name", "skater", "federation", "current_level")

    def get_name(self, obj):
        return "Solo Dance"


class TeamSerializer(serializers.ModelSerializer):
    # For teams, we might want to show both partners, but for now just the basic info
    federation = FederationSerializer(read_only=True)

    class Meta:
        model = Team
        fields = ("id", "team_name", "discipline", "federation", "current_level")


class SynchroTeamSerializer(serializers.ModelSerializer):
    federation = FederationSerializer(read_only=True)

    class Meta:
        model = SynchroTeam
        fields = ("id", "team_name", "level", "federation")


class GenericPlanningEntitySerializer(serializers.ModelSerializer):
    """
    Polymorphic serializer that returns the correct data structure
    based on the entity type.
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

        # Fallback for unknown types
        if data is None:
            data = {
                "id": instance.id,
                "name": str(instance),
            }

        # --- CRITICAL FIX ---
        # Inject the 'type' field so the frontend knows which API endpoint to use.
        data["type"] = instance.__class__.__name__
        # --------------------

        return data


# --- 4. Full Profile Serializers (For Dashboards/Rosters) ---


class SkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()
    gender = serializers.CharField(source="get_gender_display", read_only=True)
    federation = FederationSerializer(read_only=True)
    # Add nested profile for reading
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
    federation = serializers.PrimaryKeyRelatedField(
        queryset=Federation.objects.all(), required=False, allow_null=True
    )
    # Add nested profile serializer
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

    # Override update to handle the nested 'profile' data
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)

        # Update Skater fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or Create AthleteProfile
        if profile_data:
            # defaults ensures we update if exists, create if not
            AthleteProfile.objects.update_or_create(
                skater=instance, defaults=profile_data
            )

        return instance


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
