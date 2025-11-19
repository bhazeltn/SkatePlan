from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from .models import Skater, SinglesEntity, Federation, PlanningEntityAccess
from .models import SoloDanceEntity, Team, SynchroTeam

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User object.
    """
    class Meta:
        model = User
        fields = ("email", "full_name", "role", "phone_number")
        read_only_fields = ("role",)

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new User.
    Public registration is restricted to COACHES only.
    """
    class Meta:
        model = User
        fields = ("email", "password", "full_name", "phone_number")
        extra_kwargs = {
            "password": {"write_only": True, "style": {"input_type": "password"}}
        }

    def create(self, validated_data):
        # We use our custom UserManager's create_user method.
        # CRITICAL CHANGE: We force the role to COACH.
        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=validated_data["password"],
            phone_number=validated_data.get("phone_number"),
            role=User.Role.COACH  # <-- Hardcoded for public sign-up
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

class SkaterSerializer(serializers.ModelSerializer):
    """
    Serializer for the Skater (person) object.
    Now includes their 'planning_entities' (Disciplines) for the dashboard.
    """
    planning_entities = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "gender", "home_club", "planning_entities", "is_active")

    def get_planning_entities(self, obj):
        entities = []
        # 1. Singles
        for entity in obj.singles_entities.all():
            entities.append(GenericPlanningEntitySerializer(entity).data)
        # 2. Solo Dance
        for entity in obj.solodance_entities.all():
            entities.append(GenericPlanningEntitySerializer(entity).data)
        # 3. Pairs (Partner A)
        for entity in obj.teams_as_partner_a.all():
            entities.append(GenericPlanningEntitySerializer(entity).data)
        # 4. Pairs (Partner B)
        for entity in obj.teams_as_partner_b.all():
            entities.append(GenericPlanningEntitySerializer(entity).data)
        
        return entities
class SinglesEntitySerializer(serializers.ModelSerializer):
    skater = SkaterSerializer(read_only=True)
    class Meta:
        model = SinglesEntity
        fields = ("id", "skater", "federation", "current_level")

class GenericPlanningEntitySerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        if isinstance(instance, SinglesEntity):
            return SinglesEntitySerializer(instance, context=self.context).data
        # Fallback for unknown types
        return {"id": instance.id, "name": str(instance)}

class RosterSkaterSerializer(serializers.ModelSerializer):
    planning_entities = serializers.SerializerMethodField()

    class Meta:
        model = Skater
        fields = ("id", "full_name", "date_of_birth", "planning_entities")

    def get_planning_entities(self, obj):
        entities = []
        for entity in obj.singles_entities.all():
            entities.append(entity)
        # Add other entity lookups here as we build them
        for entity in obj.solodance_entities.all():
            entities.append(entity)
        for entity in obj.teams_as_partner_a.all():
            entities.append(entity)
        for entity in obj.teams_as_partner_b.all():
            entities.append(entity)
        
        return GenericPlanningEntitySerializer(
            entities, many=True, context=self.context
        ).data