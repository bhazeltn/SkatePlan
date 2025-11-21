from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Max
from rest_framework.exceptions import ValidationError
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from datetime import date, timedelta
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
    YearlyPlan,
    Macrocycle,
    Goal,
    WeeklyPlan,
    SessionLog,
    InjuryLog,
    Competition,
    CompetitionResult,
    SkaterTest,
    Program,
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
    YearlyPlanSerializer,
    MacrocycleSerializer,
    AthleteSeasonSerializer,
    GoalSerializer,
    WeeklyPlanSerializer,
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    SessionLogSerializer,
    InjuryLogSerializer,
    CompetitionSerializer,
    CompetitionResultSerializer,
    SkaterTestSerializer,
    ProgramSerializer,
)


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

        # Define standard season dates (July 1 - June 30) as defaults
        season_start = date(start_year, 7, 1)
        season_end = date(start_year + 1, 6, 30)
        season_str = f"{start_year}-{start_year + 1}"

        AthleteSeason.objects.create(
            skater=skater,
            season=season_str,
            start_date=season_start,
            end_date=season_end,
            primary_coach=request.user,
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


# --- PLANNING VIEWS ---


class YearlyPlanListCreateView(generics.ListCreateAPIView):
    # ... permission/serializer/queryset ...
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        return YearlyPlan.objects.filter(athlete_seasons__skater_id=skater_id)

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # --- NEW LOGIC: Determine which Season to use ---
        season_id = self.request.data.get("season_id")
        new_season_data = self.request.data.get(
            "new_season_data"
        )  # Expected dict: {name, start, end}

        target_season = None

        if season_id:
            # Case A: Link to existing season
            try:
                target_season = AthleteSeason.objects.get(id=season_id, skater=skater)
            except AthleteSeason.DoesNotExist:
                raise ValidationError("Selected season does not exist.")

        elif new_season_data:
            # Case B: Create a NEW season on the fly
            # Validate basics
            if not new_season_data.get("season"):
                raise ValidationError("New season must have a name.")

            target_season = AthleteSeason.objects.create(
                skater=skater,
                season=new_season_data.get("season"),
                start_date=new_season_data.get("start_date") or None,
                end_date=new_season_data.get("end_date") or None,
                primary_coach=self.request.user,
            )

        else:
            # Case C: Fallback (Legacy) - Just grab the latest one
            target_season = AthleteSeason.objects.filter(skater=skater).last()
            if not target_season:
                raise ValidationError("No active season found. Please create one.")

        # ------------------------------------------------

        # ... (Existing Entity Link Logic) ...
        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        if not entity_id or not entity_type:
            raise ValidationError("Missing planning entity information.")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)
        if not model_class:
            raise ValidationError(f"Invalid entity type: {entity_type}")

        content_type = ContentType.objects.get_for_model(model_class)

        plan = serializer.save(
            coach_owner=self.request.user,
            content_type=content_type,
            object_id=entity_id,
        )

        # Link the plan to the determined season
        plan.athlete_seasons.add(target_season)


class YearlyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = YearlyPlanSerializer
    queryset = YearlyPlan.objects.all()


class MacrocycleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = MacrocycleSerializer

    def get_queryset(self):
        plan_id = self.kwargs["plan_id"]
        return Macrocycle.objects.filter(yearly_plan_id=plan_id)

    def perform_create(self, serializer):
        plan_id = self.kwargs["plan_id"]
        plan = YearlyPlan.objects.get(id=plan_id)
        serializer.save(yearly_plan=plan)


class MacrocycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = MacrocycleSerializer
    queryset = Macrocycle.objects.all()


class AthleteSeasonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Manage a specific season (e.g. change dates, archive).
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = AthleteSeasonSerializer
    queryset = AthleteSeason.objects.all()


class AthleteSeasonList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = AthleteSeasonSerializer

    def get_queryset(self):
        return AthleteSeason.objects.filter(skater_id=self.kwargs["skater_id"])


class GoalListCreateByPlanView(generics.ListCreateAPIView):
    """
    List or Create Goals associated with the Planning Entity of a specific YTP.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_plan(self):
        return YearlyPlan.objects.get(id=self.kwargs["plan_id"])

    def get_queryset(self):
        plan = self.get_plan()
        # Filter goals that link to the SAME entity (content_type + object_id) as the plan
        return Goal.objects.filter(
            content_type=plan.content_type, object_id=plan.object_id
        ).order_by("-created_at")

    def perform_create(self, serializer):
        plan = self.get_plan()
        # Auto-link the new goal to the plan's entity
        serializer.save(
            content_type=plan.content_type,
            object_id=plan.object_id,
            current_status=Goal.GoalStatus.APPROVED,  # Coach created goals are auto-approved
        )


class GoalListBySkaterView(generics.ListCreateAPIView):  # Changed from ListAPIView
    """
    List ALL goals for a skater, or Create a new one linked to their primary discipline.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # 1. Get all entity IDs for this skater
        singles = skater.singles_entities.all()
        dance = skater.solodance_entities.all()
        teams_a = skater.teams_as_partner_a.all()
        teams_b = skater.teams_as_partner_b.all()

        from django.db.models import Q

        query = Q()

        # Singles
        if singles.exists():
            ct = ContentType.objects.get_for_model(SinglesEntity)
            query |= Q(
                content_type=ct, object_id__in=singles.values_list("id", flat=True)
            )

        # Solo Dance
        if dance.exists():
            ct = ContentType.objects.get_for_model(SoloDanceEntity)
            query |= Q(
                content_type=ct, object_id__in=dance.values_list("id", flat=True)
            )

        # Teams (Partner A)
        if teams_a.exists():
            ct = ContentType.objects.get_for_model(Team)
            query |= Q(
                content_type=ct, object_id__in=teams_a.values_list("id", flat=True)
            )

        # Teams (Partner B)
        if teams_b.exists():
            ct = ContentType.objects.get_for_model(Team)
            query |= Q(
                content_type=ct, object_id__in=teams_b.values_list("id", flat=True)
            )

        if not query:
            return Goal.objects.none()

        return Goal.objects.filter(query).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Auto-link the goal to the skater's primary discipline.
        Priority: Singles -> Solo Dance -> Pairs/Dance Team.
        """
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Find a valid entity to attach to
        entity = skater.singles_entities.first()
        if not entity:
            entity = skater.solodance_entities.first()
        if not entity:
            entity = skater.teams_as_partner_a.first()
        if not entity:
            entity = skater.teams_as_partner_b.first()

        if not entity:
            raise ValidationError(
                "Cannot create goal: No active discipline found for this skater."
            )

        content_type = ContentType.objects.get_for_model(entity)

        serializer.save(
            content_type=content_type,
            object_id=entity.id,
            current_status=Goal.GoalStatus.APPROVED,
        )


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = GoalSerializer
    queryset = Goal.objects.all()


class WeeklyPlanListView(generics.ListAPIView):
    """
    Lists all weeks for a specific Season.
    Dynamically repairs the schedule:
    1. Generates missing weeks for the current date range.
    2. Filters out 'zombie' weeks (outside the current range).
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = WeeklyPlanSerializer

    def get_queryset(self):
        season_id = self.kwargs["season_id"]
        # We will apply date filtering in the 'list' method
        return WeeklyPlan.objects.filter(athlete_season_id=season_id).order_by(
            "week_start"
        )

    def list(self, request, *args, **kwargs):
        season_id = self.kwargs["season_id"]
        try:
            season = AthleteSeason.objects.get(id=season_id)
        except AthleteSeason.DoesNotExist:
            return Response(
                {"error": "Season not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # 1. REPAIR SCHEDULE: Ensure weeks exist for the CURRENT range
        if season.start_date and season.end_date:
            current_date = season.start_date
            weeks_to_create = []

            # Get existing week start dates to avoid duplicates
            existing_dates = set(
                WeeklyPlan.objects.filter(athlete_season=season).values_list(
                    "week_start", flat=True
                )
            )

            # Loop through the official timeline
            while current_date <= season.end_date:
                if current_date not in existing_dates:
                    weeks_to_create.append(
                        WeeklyPlan(
                            athlete_season=season, week_start=current_date, theme=""
                        )
                    )
                current_date += timedelta(days=7)

            if weeks_to_create:
                WeeklyPlan.objects.bulk_create(weeks_to_create)

        # 2. STRICT FILTER: Only return weeks inside the valid range
        # This hides the "Zombie Weeks" from before the new start date
        queryset = self.get_queryset().filter(
            week_start__gte=season.start_date, week_start__lte=season.end_date
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        season_id = self.kwargs["season_id"]
        # Ensure season exists and we have access
        try:
            season = AthleteSeason.objects.get(id=season_id)
        except AthleteSeason.DoesNotExist:
            return Response(
                {"error": "Season not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if weeks exist
        qs = self.get_queryset()

        # If no weeks found, and we have valid dates, GENERATE THEM
        if not qs.exists() and season.start_date and season.end_date:
            weeks_to_create = []
            current_date = season.start_date

            # Loop week by week until we hit the end date
            while current_date <= season.end_date:
                weeks_to_create.append(
                    WeeklyPlan(athlete_season=season, week_start=current_date, theme="")
                )
                current_date += timedelta(days=7)

            # Bulk create for performance
            WeeklyPlan.objects.bulk_create(weeks_to_create)

            # Refresh queryset
            qs = self.get_queryset()

        return super().list(request, *args, **kwargs)


class WeeklyPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Update a specific week (e.g. set the Theme).
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = WeeklyPlanSerializer
    queryset = WeeklyPlan.objects.all()


class SessionLogListCreateView(generics.ListCreateAPIView):
    """
    List all logs for a skater, or create a new one.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        # Return logs for this skater, ordered by newest first
        return SessionLog.objects.filter(athlete_season__skater_id=skater_id).order_by(
            "-session_date"
        )

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # 1. Find Active Season
        # (In a real app, we might let them select the season, but auto-detect is best for MVP)
        active_season = AthleteSeason.objects.filter(skater=skater).last()
        if not active_season:
            raise ValidationError("No active season found. Cannot create log.")

        # 2. Find Planning Entity (Discipline)
        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        if not entity_id or not entity_type:
            raise ValidationError("Missing planning entity information.")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)
        if not model_class:
            raise ValidationError(f"Invalid entity type: {entity_type}")

        content_type = ContentType.objects.get_for_model(model_class)

        # 3. Save
        serializer.save(
            author=self.request.user,
            athlete_season=active_season,
            content_type=content_type,
            object_id=entity_id,
        )


class SessionLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SessionLogSerializer
    queryset = SessionLog.objects.all()


# --- HEALTH & INJURY VIEWS ---


class InjuryLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        # Order by active first, then newest
        return InjuryLog.objects.filter(skater_id=skater_id).order_by(
            "return_to_sport_date", "-date_of_onset"
        )

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Default status to Active if not provided
        status = self.request.data.get("recovery_status", "Active")

        serializer.save(skater=skater, recovery_status=status)


class InjuryLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = InjuryLogSerializer
    queryset = InjuryLog.objects.all()


class CompetitionListCreateView(generics.ListCreateAPIView):
    """
    GET: Search for competitions (query param ?search=Edmonton).
    POST: Create a new competition (with Smart Duplicate Check).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompetitionSerializer

    def get_queryset(self):
        queryset = Competition.objects.all().order_by("-start_date")
        search = self.request.query_params.get("search")
        if search:
            # Search Title or City
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(city__icontains=search)
            )
        return queryset

    def create(self, request, *args, **kwargs):
        city = request.data.get("city")
        start_str = request.data.get("start_date")
        end_str = request.data.get("end_date")
        force_create = request.data.get("force_create", False)

        # 1. DUPLICATE CHECK
        # Check for Space-Time collisions (Same City + Overlapping Dates)
        if not force_create and city and start_str and end_str:
            try:
                new_start = date.fromisoformat(start_str)
                new_end = date.fromisoformat(end_str)

                # Logic: Does an event exist in this city that overlaps these dates?
                duplicates = Competition.objects.filter(
                    city__iexact=city.strip(),
                    start_date__lte=new_end,
                    end_date__gte=new_start,
                )

                if duplicates.exists():
                    serializer = self.get_serializer(duplicates, many=True)
                    return Response(
                        {
                            "error": "Potential duplicate found",
                            "message": f"We found existing events in {city} during these dates.",
                            "candidates": serializer.data,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

            except ValueError:
                pass

        # 2. CREATE
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=self.request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CompetitionResultListCreateView(generics.ListCreateAPIView):
    """
    List results for a skater, or log a new one.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = CompetitionResultSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Find results linked to ANY of the skater's entities
        # (Using the same logic pattern as GoalList)
        singles = skater.singles_entities.all()
        dance = skater.solodance_entities.all()
        teams_a = skater.teams_as_partner_a.all()
        teams_b = skater.teams_as_partner_b.all()

        query = Q()
        if singles.exists():
            query |= Q(
                content_type=ContentType.objects.get_for_model(SinglesEntity),
                object_id__in=singles.values_list("id", flat=True),
            )
        if dance.exists():
            query |= Q(
                content_type=ContentType.objects.get_for_model(SoloDanceEntity),
                object_id__in=dance.values_list("id", flat=True),
            )
        if teams_a.exists():
            query |= Q(
                content_type=ContentType.objects.get_for_model(Team),
                object_id__in=teams_a.values_list("id", flat=True),
            )
        if teams_b.exists():
            query |= Q(
                content_type=ContentType.objects.get_for_model(Team),
                object_id__in=teams_b.values_list("id", flat=True),
            )

        if not query:
            return CompetitionResult.objects.none()

        return CompetitionResult.objects.filter(query).order_by(
            "-competition__start_date"
        )

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Auto-link to primary discipline for MVP
        entity = (
            skater.singles_entities.first()
            or skater.solodance_entities.first()
            or skater.teams_as_partner_a.first()
        )

        if not entity:
            raise ValidationError("No active discipline found.")

        content_type = ContentType.objects.get_for_model(entity)
        serializer.save(content_type=content_type, object_id=entity.id)


class CompetitionResultDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Manage a specific result (Update score, delete).
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = CompetitionResultSerializer
    queryset = CompetitionResult.objects.all()


class SkaterTestListCreateView(generics.ListCreateAPIView):
    """
    List tests for a skater, or log a new one.
    Directly linked to the Skater profile.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterTestSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        # Order by date descending, but prioritize Planned/Scheduled at the top?
        # For now, just simple date ordering.
        return SkaterTest.objects.filter(skater_id=skater_id).order_by("-test_date")

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)
        serializer.save(skater=skater)


class SkaterTestDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterTestSerializer
    queryset = SkaterTest.objects.all()


class ProgramListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ProgramSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Find entities for this skater
        entity_ids = []
        for e in skater.singles_entities.all():
            entity_ids.append(e.id)
        for e in skater.solodance_entities.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_a.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_b.all():
            entity_ids.append(e.id)

        # Return programs linked to these entities
        return Program.objects.filter(object_id__in=entity_ids).order_by(
            "-season", "program_category"
        )

    def perform_create(self, serializer):
        # Link to the specific entity provided in the request
        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        if not entity_id or not entity_type:
            raise ValidationError("Program must be linked to a discipline.")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)
        content_type = ContentType.objects.get_for_model(model_class)

        serializer.save(content_type=content_type, object_id=entity_id)


class ProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ProgramSerializer
    queryset = Program.objects.all()


class SkaterStatsView(APIView):
    """
    Returns calculated statistics for a skater:
    - Personal Best (PB) & Season Best (SB)
    - Context: Competition Name AND Date
    - Full Segment Breakdown (Total, TES, PCS)
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)

        # 1. Find all completed results
        entity_ids = []
        for e in skater.singles_entities.all():
            entity_ids.append(e.id)
        for e in skater.solodance_entities.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_a.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_b.all():
            entity_ids.append(e.id)

        all_results = CompetitionResult.objects.filter(
            object_id__in=entity_ids, status=CompetitionResult.Status.COMPLETED
        ).select_related("competition")

        # 2. Define Active Season
        active_season = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).last()
        season_start = active_season.start_date if active_season else None
        season_end = active_season.end_date if active_season else None

        # 3. Helper to create empty stat object
        def make_stat():
            return {"score": 0.0, "comp": "N/A", "date": None}

        stats = {"total": {"pb": make_stat(), "sb": make_stat()}, "segments": {}}

        # 4. Iterate and Calculate
        for res in all_results:
            is_current_season = False
            if season_start and season_end:
                if season_start <= res.competition.start_date <= season_end:
                    is_current_season = True

            comp_name = res.competition.title
            comp_date = res.competition.start_date

            # A. Overall Total Score
            if res.total_score:
                score = float(res.total_score)
                if score > stats["total"]["pb"]["score"]:
                    stats["total"]["pb"] = {
                        "score": score,
                        "comp": comp_name,
                        "date": comp_date,
                    }
                if is_current_season and score > stats["total"]["sb"]["score"]:
                    stats["total"]["sb"] = {
                        "score": score,
                        "comp": comp_name,
                        "date": comp_date,
                    }

            # B. Segment Breakdown
            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    name = seg.get("name", "Unknown Segment")

                    # --- FIX: Initialize ALL buckets (Total, TES, PCS) ---
                    if name not in stats["segments"]:
                        stats["segments"][name] = {
                            "total": {"pb": make_stat(), "sb": make_stat()},
                            "tes": {
                                "pb": make_stat(),
                                "sb": make_stat(),
                            },  # <--- Was missing
                            "pcs": {
                                "pb": make_stat(),
                                "sb": make_stat(),
                            },  # <--- Was missing
                        }

                    bucket = stats["segments"][name]

                    # Extract values safely
                    s_score = float(seg.get("score") or 0)
                    s_tes = float(seg.get("tes") or 0)
                    s_pcs = float(seg.get("pcs") or 0)

                    # 1. Segment Total
                    if s_score > bucket["total"]["pb"]["score"]:
                        bucket["total"]["pb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_score > bucket["total"]["sb"]["score"]:
                        bucket["total"]["sb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }

                    # 2. TES
                    if s_tes > bucket["tes"]["pb"]["score"]:
                        bucket["tes"]["pb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_tes > bucket["tes"]["sb"]["score"]:
                        bucket["tes"]["sb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }

                    # 3. PCS
                    if s_pcs > bucket["pcs"]["pb"]["score"]:
                        bucket["pcs"]["pb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_pcs > bucket["pcs"]["sb"]["score"]:
                        bucket["pcs"]["sb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }

        # 5. Volume
        total_sessions = (
            SessionLog.objects.filter(athlete_season=active_season).count()
            if active_season
            else 0
        )

        return Response(
            {
                "overall": stats["total"],
                "segments": stats["segments"],
                "volume": total_sessions,
                "season_name": active_season.season if active_season else "None",
            }
        )


class CoachDashboardStatsView(APIView):
    """
    Aggregates "Air Traffic Control" data.
    Refined to include Skater Names and IDs for navigation.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request):
        skaters = Skater.objects.all()
        today = date.today()
        next_week = today + timedelta(days=7)
        two_weeks = today + timedelta(days=14)

        # 1. PREPARE ENTITY LOOKUP
        # We need to find all Planning Entities (Singles, Dance, Teams) owned by these skaters
        # so we can query Goals/Results efficiently.
        entity_map = {}  # {entity_id: skater_obj}
        for s in skaters:
            for e in s.singles_entities.all():
                entity_map[e.id] = s
            for e in s.solodance_entities.all():
                entity_map[e.id] = s
            for e in s.teams_as_partner_a.all():
                entity_map[e.id] = s
            # ... add other relationships as needed

        all_entity_ids = list(entity_map.keys())

        # 2. RED FLAGS: INJURIES
        active_injuries = (
            InjuryLog.objects.filter(
                skater__in=skaters, recovery_status__in=["Active", "Recovering"]
            )
            .select_related("skater")
            .order_by("date_of_onset")
        )

        # 3. GOALS (Linked to Skaters via Entity)
        # Fetch relevant goals
        raw_goals = Goal.objects.filter(
            object_id__in=all_entity_ids,
            current_status__in=["IN_PROGRESS", "PENDING", "APPROVED"],
        ).order_by("target_date")

        overdue_list = []
        due_soon_list = []

        for g in raw_goals:
            # resolve skater from map
            skater = entity_map.get(g.object_id)
            if not skater:
                continue

            goal_data = {
                "title": g.title,
                "due": g.target_date,
                "skater_name": skater.full_name,
                "skater_id": skater.id,
            }

            if g.target_date and g.target_date < today:
                if len(overdue_list) < 5:
                    overdue_list.append(goal_data)
            elif g.target_date and g.target_date <= next_week:
                if len(due_soon_list) < 5:
                    due_soon_list.append(goal_data)

        # 4. PLANNING ALERTS
        planning_alerts = []
        start_of_week = today - timedelta(days=today.weekday())

        for skater in skaters:
            if not skater.is_active:
                continue
            active_season = skater.athlete_seasons.filter(is_active=True).last()

            if active_season:
                if not active_season.yearly_plans.exists():
                    planning_alerts.append(
                        {
                            "skater": skater.full_name,
                            "id": skater.id,
                            "issue": "No Yearly Plan",
                        }
                    )
                else:
                    current_week = WeeklyPlan.objects.filter(
                        athlete_season=active_season, week_start=start_of_week
                    ).first()
                    if not current_week or not current_week.theme:
                        planning_alerts.append(
                            {
                                "skater": skater.full_name,
                                "id": skater.id,
                                "issue": "Unplanned Week",
                            }
                        )

        # 5. AGENDA (Competitions & Tests)
        # A. Tests
        upcoming_tests = (
            SkaterTest.objects.filter(
                test_date__range=(today, two_weeks), skater__in=skaters
            )
            .select_related("skater")
            .order_by("test_date")
        )

        # B. Competitions (Grouped by Event)
        # Find results/registrations for our skaters in the next 2 weeks
        upcoming_results = CompetitionResult.objects.filter(
            object_id__in=all_entity_ids,
            competition__start_date__range=(today, two_weeks),
        ).select_related("competition")

        # Group skaters by competition
        comp_map = {}
        for res in upcoming_results:
            comp_id = res.competition.id
            if comp_id not in comp_map:
                comp_map[comp_id] = {
                    "type": "Competition",
                    "title": res.competition.title,
                    "date": res.competition.start_date,
                    "attendees": set(),  # Use set to avoid dupes if skater has 2 events
                }

            skater = entity_map.get(res.object_id)
            if skater:
                comp_map[comp_id]["attendees"].add(
                    skater.full_name.split(" ")[0]
                )  # First name only for compactness

        # Flatten Agenda
        agenda_items = []
        for t in upcoming_tests:
            agenda_items.append(
                {
                    "type": "Test",
                    "title": t.test_name,
                    "who": t.skater.full_name,
                    "date": t.test_date,
                    "skater_id": t.skater.id,
                }
            )

        for c in comp_map.values():
            # Format attendees list: "Jane, Tom, Mary"
            attendee_list = ", ".join(list(c["attendees"]))
            agenda_items.append(
                {
                    "type": "Competition",
                    "title": c["title"],
                    "who": attendee_list,
                    "date": c["date"],
                    "is_group": True,  # Flag to disable single-skater linking if needed
                }
            )

        agenda_items.sort(key=lambda x: x["date"])

        # 6. RECENT ACTIVITY
        three_days_ago = today - timedelta(days=3)
        recent_logs = (
            SessionLog.objects.filter(
                session_date__gte=three_days_ago, athlete_season__skater__in=skaters
            )
            .select_related("athlete_season__skater")
            .order_by("-session_date")[:10]
        )

        data = {
            "red_flags": {
                "injuries": [
                    {
                        "skater": i.skater.full_name,
                        "skater_id": i.skater.id,
                        "injury": i.injury_type,
                        "status": i.recovery_status,
                        "date": i.date_of_onset,
                    }
                    for i in active_injuries
                ],
                "planning": planning_alerts,
                "overdue_goals": overdue_list,
                "due_soon_goals": due_soon_list,
            },
            "activity": [
                {
                    "skater": l.athlete_season.skater.full_name,
                    "skater_id": l.athlete_season.skater.id,
                    "type": "Session",
                    "date": l.session_date,
                    "rating": l.session_rating,
                }
                for l in recent_logs
            ],
            "agenda": agenda_items,
        }

        return Response(data)
