from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers

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
