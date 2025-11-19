from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

from .permissions import IsCoachUser
from .models import (
    Skater,
    SinglesEntity,
    Federation,
    PlanningEntityAccess,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    AthleteSeason,
    Federation,
)
from .serializers import (
    SkaterSerializer,
    SinglesEntitySerializer,
    RosterSkaterSerializer,
    FederationSerializer,
    SkaterUpdateSerializer,
    SoloDanceEntitySerializer,
    TeamSerializer,
    SynchroTeamSerializer,
)
from django.utils import timezone
from datetime import date

User = get_user_model()


class SkaterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for viewing, updating, or deleting a specific skater.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    queryset = Skater.objects.all()

    def get_serializer_class(self):
        # Use the detailed serializer for reading (GET)
        if self.request.method == "GET":
            return SkaterSerializer
        # Use the flat serializer for writing (PUT/PATCH)
        return SkaterUpdateSerializer


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


class UserProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for getting, updating, AND deleting the logged-in user's profile.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# This is a simple fuzzy name matching helper
def is_name_match(name1, name2):
    """
    Simple fuzzy match for names.
    Compares lowercased, whitespace-stripped names.
    """
    return name1.lower().replace(" ", "") == name2.lower().replace(" ", "")


class FederationList(generics.ListAPIView):
    """
    Returns a list of all Federations (for dropdowns).
    Sorted by Code (e.g. AUS, CAN, USA) for better UX.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FederationSerializer
    queryset = Federation.objects.all().order_by("code")


class CreateSkaterView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterSerializer

    def create(self, request, *args, **kwargs):
        full_name = request.data.get("full_name")
        dob_str = request.data.get("date_of_birth")

        # CAPTURE INPUTS (Defaults provided if missing)
        discipline = request.data.get("discipline", "SINGLES")
        level = request.data.get("level", "Beginner")
        federation_id = request.data.get("federation_id")

        if not full_name or not dob_str:
            return Response(
                {"error": "Full name and date of birth are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dob = date.fromisoformat(dob_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Global Duplicate Check
        potential_matches = Skater.objects.filter(date_of_birth=dob)
        for skater in potential_matches:
            if is_name_match(skater.full_name, full_name):
                return Response(
                    {
                        "error": "A skater with this name and birthday already exists.",
                        "skater_id": skater.id,
                        "action": "request_access",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # Fetch Federation
        federation_obj = None
        if federation_id:
            try:
                federation_obj = Federation.objects.get(id=federation_id)
            except Federation.DoesNotExist:
                pass

        # Create Skater
        skater = Skater.objects.create(
            full_name=full_name,
            date_of_birth=dob,
            gender=request.data.get("gender"),
            home_club=request.data.get("home_club"),
            federation=federation_obj,
        )

        # Create Entity based on Discipline AND Level
        entity = None
        if discipline == "SINGLES":
            entity = SinglesEntity.objects.create(skater=skater, current_level=level)
        elif discipline == "SOLO_DANCE":
            entity = SoloDanceEntity.objects.create(skater=skater, current_level=level)
        elif discipline == "PAIRS":
            entity = Team.objects.create(
                team_name=f"{skater.full_name} (Pairs)",
                discipline="PAIRS",
                partner_a=skater,
                current_level=level,
            )
        elif discipline == "ICE_DANCE":
            entity = Team.objects.create(
                team_name=f"{skater.full_name} (Dance)",
                discipline="ICE_DANCE",
                partner_a=skater,
                current_level=level,
            )
        elif discipline == "SYNCHRO":
            entity = SynchroTeam.objects.create(
                team_name=f"{skater.full_name}'s Team",
                level=level,
                federation=federation_obj,  # Synchro teams keep their own federation
            )
        else:
            entity = SinglesEntity.objects.create(skater=skater, current_level=level)

        # Create Permissions
        PlanningEntityAccess.objects.create(
            user=request.user,
            access_level=PlanningEntityAccess.AccessLevel.COACH,
            planning_entity=entity,
        )

        # Auto-Create Season
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_str = f"{start_year}-{start_year + 1}"

        AthleteSeason.objects.create(
            skater=skater, season=season_str, primary_coach=request.user
        )

        return Response(SkaterSerializer(skater).data, status=status.HTTP_201_CREATED)


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


class SinglesEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SinglesEntitySerializer
    queryset = SinglesEntity.objects.all()


class SoloDanceEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SoloDanceEntitySerializer
    queryset = SoloDanceEntity.objects.all()


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamSerializer
    queryset = Team.objects.all()


class SynchroTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SynchroTeamSerializer
    queryset = SynchroTeam.objects.all()
