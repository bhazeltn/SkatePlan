from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

# --- ADDED THESE IMPORTS ---
from .permissions import IsCoachUser
from .models import Skater, SinglesEntity, Federation, PlanningEntityAccess
from .models import SoloDanceEntity, Team, SynchroTeam  # Import all models
from .serializers import (
    SkaterSerializer,
    SinglesEntitySerializer,
    RosterSkaterSerializer,
)
from django.utils import timezone
from datetime import date


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


# This is a simple fuzzy name matching helper
def is_name_match(name1, name2):
    """
    Simple fuzzy match for names.
    Compares lowercased, whitespace-stripped names.
    """
    return name1.lower().replace(" ", "") == name2.lower().replace(" ", "")


class CreateSkaterView(generics.CreateAPIView):
    """
    API endpoint for a Coach to create a new Skater and their first PlanningEntity.
    This view performs the "Create & De-duplicate" check.
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsCoachUser,
    ]  # Must be a logged-in Coach
    serializer_class = (
        SkaterSerializer  # We use this for validation, but will override create
    )

    def create(self, request, *args, **kwargs):
        full_name = request.data.get("full_name")
        date_of_birth_str = request.data.get("date_of_birth")  # Expecting "YYYY-MM-DD"

        if not full_name or not date_of_birth_str:
            return Response(
                {"error": "Full name and date of birth are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date_of_birth = date.fromisoformat(date_of_birth_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Please use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- De-duplication Check (from spec 2.7) ---
        # 1. Check for an exact DOB match
        potential_matches = Skater.objects.filter(date_of_birth=date_of_birth)

        # 2. Check for fuzzy name match
        for skater in potential_matches:
            if is_name_match(skater.full_name, full_name):
                # MATCH FOUND!
                # As per spec, we return an error prompting the coach to request access.
                return Response(
                    {
                        "error": "A skater with a similar name and the same date of birth already exists.",
                        "skater_id": skater.id,
                        "action": "request_access",
                    },
                    status=status.HTTP_409_CONFLICT,  # 409 Conflict is perfect for this
                )

        # --- NO MATCH FOUND ---
        # 3. Create the new Skater
        skater = Skater.objects.create(
            full_name=full_name,
            date_of_birth=date_of_birth,
            gender=request.data.get("gender"),
            home_club=request.data.get("home_club"),
        )

        # 4. Create their initial "SinglesEntity"
        #    (We'll just create a basic one for now, as per Phase 1)
        singles_entity = SinglesEntity.objects.create(
            skater=skater, current_level="Beginner"  # Placeholder
        )

        # 5. --- THIS IS NEW ---
        #    Assign the coach who created them access to this new entity.
        PlanningEntityAccess.objects.create(
            user=request.user,
            access_level=PlanningEntityAccess.AccessLevel.COACH,
            planning_entity=singles_entity,
        )

        # Return the data for the *new Skater*
        return Response(SkaterSerializer(skater).data, status=status.HTTP_201_CREATED)


# --- THIS IS THE CLASS THAT WAS IN THE WRONG FILE ---
class RosterView(generics.ListAPIView):
    """
    API endpoint to list all Skaters a logged-in user has access to.
    A Coach sees all their skaters.
    A Skater/Guardian sees only themselves.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RosterSkaterSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == User.Role.COACH:
            # A Coach sees all skaters they have access to via PlanningEntityAccess
            # 1. Find all PlanningEntityAccess objects for this coach
            access_objects = PlanningEntityAccess.objects.filter(user=user)

            # 2. Get all the unique Skater IDs from those entities
            skater_ids = set()
            for access in access_objects:
                entity = access.planning_entity
                if isinstance(entity, (SinglesEntity, SoloDanceEntity)):
                    skater_ids.add(entity.skater.id)
                elif isinstance(entity, Team):
                    skater_ids.add(entity.partner_a.id)
                    if entity.partner_b:
                        skater_ids.add(entity.partner_b.id)
                elif isinstance(entity, SynchroTeam):
                    # We'll add synchro roster logic later
                    pass

            # 3. Return all Skater objects with those IDs
            return Skater.objects.filter(id__in=skater_ids)

        else:
            # A Skater, Guardian, or Observer only sees their own profile
            # We must check if they even have a skater profile yet
            try:
                skater_profile = user.skater_profile
                return Skater.objects.filter(id=skater_profile.id)
            except Skater.DoesNotExist:
                # If they are a Guardian/Observer with no skater profile, return empty
                return Skater.objects.none()
