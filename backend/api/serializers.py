from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers

# --- ADDED THIS IMPORT ---
from django.contrib.contenttypes.models import ContentType

# --- ADDED THESE MODELS ---
from .models import Skater, SinglesEntity, Federation, PlanningEntityAccess
from .models import SoloDanceEntity, Team, SynchroTeam


User = get_user_model()  # This gets our custom 'api.User' model


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User object.
    """

    class Meta:
        model = User
        fields = ("email", "full_name", "role", "phone_number")  # Fields to show
        read_only_fields = ("role",)  # Role can't be changed directly by user


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new User.
    """

    class Meta:
        model = User
        fields = ("email", "password", "full_name", "phone_number")
        extra_kwargs = {
            "password": {"write_only": True, "style": {"input_type": "password"}}
        }

    def create(self, validated_data):
        # We use our custom UserManager's create_user method
        # to ensure the password gets hashed correctly.
        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=validated_data["password"],
            phone_number=validated_data.get("phone_number"),
            # Note: The 'role' defaults to 'SKATER' as defined in our User model
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for logging a user in.
    This doesn't use a ModelSerializer because we're just validating input.
    """

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


class SkaterSerializer(serializers.ModelSerializer):
    """
    Serializer for the Skater (person) object.
    """

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "gender", "home_club")


class SinglesEntitySerializer(serializers.ModelSerializer):
    """
    Serializer for a SinglesEntity.
    """

    skater = SkaterSerializer(read_only=True)

    class Meta:
        model = SinglesEntity
        fields = ("id", "skater", "federation", "current_level")


class GenericPlanningEntitySerializer(serializers.ModelSerializer):
    """
    A generic serializer that can handle any planning entity
    (SinglesEntity, Team, etc.)
    """

    # This dynamically gets the serializer for the *specific* entity
    def to_representation(self, instance):
        if isinstance(instance, SinglesEntity):
            return SinglesEntitySerializer(instance, context=self.context).data
        if isinstance(instance, SoloDanceEntity):
            # We'll create SoloDanceEntitySerializer later, for now, just name
            return {"id": instance.id, "name": str(instance)}
        if isinstance(instance, Team):
            # We'll create TeamSerializer later
            return {"id": instance.id, "name": str(instance)}
        if isinstance(instance, SynchroTeam):
            # We'll create SynchroTeamSerializer later
            return {"id": instance.id, "name": str(instance)}
        # Fallback for unknown types
        return {"id": instance.id, "name": str(instance)}


class RosterSkaterSerializer(serializers.ModelSerializer):
    """
    A serializer for the roster, showing a Skater and *all* their entities.
    """

    # We find all entities a skater is part of
    planning_entities = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "planning_entities")

    def get_planning_entities(self, obj):
        # 'obj' is the Skater instance
        entities = []
        # Find all entity types this skater is linked to
        for entity in obj.singles_entities.all():
            entities.append(entity)
        for entity in obj.solodance_entities.all():
            entities.append(entity)
        for entity in obj.teams_as_partner_a.all():
            entities.append(entity)
        for entity in obj.teams_as_partner_b.all():
            entities.append(entity)
        # We can add SynchroRosterEntry later

        # Now, serialize that list of entities
        return GenericPlanningEntitySerializer(
            entities, many=True, context=self.context
        ).data
