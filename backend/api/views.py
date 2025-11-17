from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    API endpoint for registering a new user.
    Creates a new user and returns their info and an auth token.
    """

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]  # Anyone can register
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "user": UserSerializer(
                    user, context=self.get_serializer_context()
                ).data,
                "token": token.key,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(generics.GenericAPIView):
    """
    API endpoint for logging in.
    Takes email/password and returns the user's info and auth token.
    """

    permission_classes = [permissions.AllowAny]  # Anyone can log in
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "user": UserSerializer(
                    user, context=self.get_serializer_context()
                ).data,
                "token": token.key,
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for getting and updating the logged-in user's profile.
    """

    permission_classes = [permissions.IsAuthenticated]  # Must be logged in
    serializer_class = UserSerializer

    def get_object(self):
        # Returns the user associated with the token
        return self.request.user
