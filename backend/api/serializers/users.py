from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    skater_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("email", "full_name", "role", "phone_number", "skater_id")
        read_only_fields = ("role",)

    def get_skater_id(self, obj):
        if obj.role == User.Role.SKATER:
            # FIX: Uses the reverse relation 'skaters' (plural) and takes the first one
            skater = obj.skaters.first()
            return skater.id if skater else None
        return None


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
            role=User.Role.COACH,
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
