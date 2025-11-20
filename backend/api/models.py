from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
    ContentType,
)
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey

# --- 1. USER AUTHENTICATION MODELS ---
# We must define a custom User Manager to tell Django
# how to create our custom User (e.g., how to create a superuser).


class UserManager(BaseUserManager):
    """
    Custom manager for our User model.
    We use email as the unique identifier instead of username.
    """

    def create_user(self, email, full_name, password=None, **extra_fields):
        """
        Creates and saves a regular User with the given email and password.
        """
        if not email:
            raise ValueError("The Email field must be set")

        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        """
        Creates and saves a Superuser with the given email and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.COACH)  # Superusers are Coaches

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Our custom User model.
    This replaces the default Django User.
    It stores all authentication-related info.
    """

    # These are the roles defined in our spec
    class Role(models.TextChoices):
        COACH = "COACH", "Coach"
        SKATER = "SKATER", "Skater"
        GUARDIAN = "GUARDIAN", "Guardian"
        OBSERVER = "OBSERVER", "Observer"

    email = models.EmailField(unique=True, primary_key=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.SKATER)

    # Django-required fields for the admin panel
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        default=False
    )  # 'is_staff' allows login to admin panel
    date_joined = models.DateTimeField(default=timezone.now)

    # Tell Django to use our custom UserManager
    objects = UserManager()

    # Tell Django what field to use as the "username"
    USERNAME_FIELD = "email"
    # Tell Django what fields are required when creating a superuser
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email


# --- 2. INFRASTRUCTURE MODELS ---
# These are the global lookup tables from Phase 0.5 of our plan.


class Federation(models.Model):
    """
    A global lookup table for all national federations.
    e.g., "Skate Canada", "US Figure Skating"
    """

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, blank=True, null=True)  # e.g., "CAN", "USA"
    flag_emoji = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class SkatingElement(models.Model):
    """
    A global lookup table for all skating elements.
    e.g., "Triple Lutz", "Camel Spin"
    """

    class ElementCategory(models.TextChoices):
        SINGLES = "SINGLES", "Singles"
        PAIRS = "PAIRS", "Pairs"
        ICE_DANCE = "ICE_DANCE", "Ice Dance"
        SYNCHRO = "SYNCHRO", "Synchro"

    # Expanded list based on your initial_data.json
    class DisciplineType(models.TextChoices):
        # Singles / Standard
        JUMP = "JUMP", "Jump"
        SPIN = "SPIN", "Spin"
        SPIN_COMBINATION = "SPIN COMBINATION", "Spin Combination"
        STEP = "STEP", "Step Sequence"  # Keep for legacy/manual
        STEP_SEQUENCE = "STEP SEQUENCE", "Step Sequence"  # Matches fixture
        CHOREO_ELEMENT = "CHOREOGRAPHIC ELEMENT", "Choreographic Element"

        # Pairs
        THROW_JUMP = "THROW JUMP", "Throw Jump"
        TWIST_LIFT = "TWIST LIFT", "Twist Lift"
        PAIR_SPIN = "PAIR SPIN", "Pair Spin"
        PAIR_SPIN_COMBO = "PAIR SPIN COMBINATION", "Pair Spin Combination"
        PAIR_LIFT = "PAIR LIFT", "Pair Lift"
        DEATH_SPIRAL = "DEATH SPIRAL", "Death Spiral"
        PAIR_ELEMENT = "PAIR ELEMENT", "Pair Element"

        # Ice Dance
        PATTERN_DANCE = "PATTERN DANCE", "Pattern Dance"
        PATTERN_DANCE_ELEMENT = "PATTERN DANCE ELEMENT", "Pattern Dance Element"
        DANCE_STEP = "DANCE STEP", "Dance Step"
        DANCE_SPIN = "DANCE SPIN", "Dance Spin"
        DANCE_LIFT = "DANCE LIFT", "Dance Lift"
        DANCE_TWIZZLE = "DANCE TWIZZLE", "Dance Twizzle"
        DANCE_STEP_TURN = "DANCE STEP/TURN", "Dance Step/Turn"
        DANCE_EDGE = "DANCE EDGE ELEMENT", "Dance Edge Element"
        CHOREOGRAPHIC = "CHOREOGRAPHIC", "Choreographic"

        # Synchro
        SYNCHRO_ARTISTIC = "SYNCHRO ARTISTIC", "Synchro Artistic"
        SYNCHRO_CREATIVE = "SYNCHRO CREATIVE", "Synchro Creative"
        SYNCHRO_LIFT = "SYNCHRO LIFT", "Synchro Lift"
        SYNCHRO_INTERSECTION = "SYNCHRO INTERSECTION", "Synchro Intersection"
        SYNCHRO_FORMATION = "SYNCHRO FORMATION", "Synchro Formation"
        SYNCHRO_PIVOTING = "SYNCHRO PIVOTING", "Synchro Pivoting"
        SYNCHRO_SPIN = "SYNCHRO SPIN", "Synchro Spin"
        SYNCHRO_TWIZZLE = "SYNCHRO TWIZZLE", "Synchro Twizzle"
        SYNCHRO_MIXED = "SYNCHRO", "Synchro Mixed/Element"

        OTHER = "OTHER", "Other"

    id = models.AutoField(primary_key=True)
    element_name = models.CharField(max_length=100)  # e.g., "Triple Lutz"

    # Increased max_length to 20 just to be safe (longest in fixture is ~8 chars)
    abbreviation = models.CharField(max_length=20, unique=True)

    # Increased max_length to 50 to handle "PATTERN DANCE ELEMENT" etc.
    discipline_type = models.CharField(
        max_length=50, choices=DisciplineType.choices, default=DisciplineType.OTHER
    )

    # New field required by your seed data
    element_category = models.CharField(
        max_length=20, choices=ElementCategory.choices, default=ElementCategory.SINGLES
    )

    def __str__(self):
        return f"{self.element_name} ({self.abbreviation})"

    class Meta:
        ordering = ["element_category", "discipline_type", "element_name"]


# --- 3. PLANNING ENTITY MODELS ---
# These are the "who" and "what" of our application.
# (Append this to the bottom of backend/api/models.py)


class Skater(models.Model):
    """
    The central profile for an individual athlete (the person).
    This model stores their personal information.
    """

    id = models.AutoField(primary_key=True)
    user_account = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skater_profile",
    )
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(
        default=True, help_text="If false, skater is archived."
    )

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        NON_BINARY = "NON_BINARY", "Non-Binary"
        OTHER = "OTHER", "Other"

    gender = models.CharField(
        max_length=10, choices=Gender.choices, blank=True, null=True
    )
    home_club = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name

    class Meta:
        ordering = ["full_name"]


# --- PLANNING ENTITIES ---
# These models represent an athlete's "career" in a specific discipline.
# We will use a GenericForeignKey to link them to other models (like Goals, Logs).
# NOTE: We need to import this first.
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class SinglesEntity(models.Model):
    """
    Represents a skater's "Singles" career.
    """

    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(
        Skater, on_delete=models.CASCADE, related_name="singles_entities"
    )
    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    current_level = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.skater.full_name} (Singles)"


class SoloDanceEntity(models.Model):
    """
    Represents a skater's "Solo Dance" career.
    """

    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(
        Skater, on_delete=models.CASCADE, related_name="solodance_entities"
    )
    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    current_level = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.skater.full_name} (Solo Dance)"


class Team(models.Model):
    """
    A profile for a Pairs or Ice Dance team.
    """

    class Discipline(models.TextChoices):
        PAIRS = "PAIRS", "Pairs"
        ICE_DANCE = "ICE_DANCE", "Ice Dance"

    id = models.AutoField(primary_key=True)
    team_name = models.CharField(max_length=255)
    discipline = models.CharField(max_length=10, choices=Discipline.choices)

    # A team must have at least one partner. Partner B is optional (e.g., during tryouts).
    partner_a = models.ForeignKey(
        Skater, on_delete=models.CASCADE, related_name="teams_as_partner_a"
    )
    partner_b = models.ForeignKey(
        Skater,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams_as_partner_b",
    )

    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    current_level = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.team_name


class SynchroTeam(models.Model):
    """
    A profile for a Synchronized Skating team.
    """

    id = models.AutoField(primary_key=True)
    team_name = models.CharField(max_length=255, unique=True)
    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    level = models.CharField(max_length=100)

    def __str__(self):
        return self.team_name


# --- PERMISSIONS & TEAM MANAGEMENT ---


class PlanningEntityAccess(models.Model):
    """
    This is the core PERMISSION model.
    It links a User (Coach, Guardian, Observer) to a Planning Entity
    and defines their access level.
    """

    class AccessLevel(models.TextChoices):
        COACH = "COACH", "Coach"
        GUARDIAN = "GUARDIAN", "Guardian"
        OBSERVER = "OBSERVER", "Observer"
        # Note: The 'Skater' role is implicit, managed via Skater.user_account

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="planning_access"
    )
    access_level = models.CharField(max_length=10, choices=AccessLevel.choices)

    # --- Generic Foreign Key ---
    # This is how we link to *any* entity (SinglesEntity, Team, SynchroTeam, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return f"{self.user.email} -> {self.get_access_level_display()} access to {self.planning_entity}"

    class Meta:
        # Ensures a user can't have the same role on the same object twice
        unique_together = ("user", "content_type", "object_id", "access_level")


# --- 4. HOLISTIC PLANNING MODELS ---
# (Append this to the bottom of backend/api/models.py)


class AthleteSeason(models.Model):
    """
    An "umbrella" holding all plans for one Skater (person) in one season.
    This allows for holistic load management for multi-discipline athletes.
    """

    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(
        Skater, on_delete=models.CASCADE, related_name="athlete_seasons"
    )
    season = models.CharField(max_length=10)  # e.g., "2025-2026"
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)  # To distinguish current vs past

    primary_coach = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="athlete_seasons_as_primary",
    )

    def __str__(self):
        return f"{self.skater.full_name} ({self.season})"

    class Meta:
        unique_together = ("skater", "season")
        ordering = ["skater__full_name", "-season"]


class YearlyPlan(models.Model):
    """
    A high-level plan for a *single discipline* (a PlanningEntity).
    """

    id = models.AutoField(primary_key=True)

    # --- Generic Foreign Key to a PlanningEntity ---
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    # This plan is part of one or more AthleteSeasons
    # (e.g., a Pairs plan is part of two skaters' seasons)
    athlete_seasons = models.ManyToManyField(AthleteSeason, related_name="yearly_plans")

    coach_owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="yearly_plans",
    )

    peak_type = models.CharField(
        max_length=100, blank=True, null=True
    )  # e.g., "Single Peak", "Double Peak"
    primary_season_goal = models.TextField(blank=True, null=True)

    # We will link this to the Competition model later
    # primary_peak_event = models.ForeignKey('Competition', ...)

    def __str__(self):
        return f"YTP for {self.planning_entity} ({self.athlete_seasons.first().season})"


class Macrocycle(models.Model):
    """
    A phase within a YearlyPlan.
    e.g., "Preparation", "Competition 1", "Peak"
    """

    id = models.AutoField(primary_key=True)
    yearly_plan = models.ForeignKey(
        YearlyPlan, on_delete=models.CASCADE, related_name="macrocycles"
    )
    phase_title = models.CharField(max_length=100)
    phase_start = models.DateField()
    phase_end = models.DateField()
    phase_focus = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.phase_title

    class Meta:
        ordering = ["phase_start"]


class WeeklyPlan(models.Model):
    """
    The holistic, unified plan for the *entire* athlete for one week.
    Linked to the AthleteSeason, not a single YTP.
    """

    id = models.AutoField(primary_key=True)
    athlete_season = models.ForeignKey(
        AthleteSeason, on_delete=models.CASCADE, related_name="weekly_plans"
    )
    week_start = models.DateField(unique=True)
    theme = models.CharField(max_length=255, blank=True, null=True)

    # We use JSONField to store flexible weekly data
    planned_off_ice_activities = models.JSONField(default=list, blank=True)
    session_breakdown = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Week of {self.week_start} for {self.athlete_season.skater.full_name}"

    class Meta:
        ordering = ["-week_start"]


# --- 5. PLANNING & LOGGING MODULES ---


class Goal(models.Model):
    """
    A single, trackable SMART goal.
    Can be linked to a single PlanningEntity.
    """

    class GoalStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_APPROVAL = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        NEEDS_REVISION = "REVISION", "Needs Revision"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        ARCHIVED = "ARCHIVED", "Archived"

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)

    # --- Generic Foreign Key to a PlanningEntity ---
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    # For team goals, we can optionally assign it to one skater
    assignee_skater = models.ForeignKey(
        Skater,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_goals",
    )

    goal_type = models.CharField(
        max_length=50, blank=True, null=True
    )  # e.g., "Technical", "Mental"
    goal_timeframe = models.CharField(
        max_length=50, blank=True, null=True
    )  # e.g., "Weekly", "Macrocycle"
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    smart_description = models.TextField(blank=True, null=True)
    progress_notes = models.TextField(blank=True, null=True)

    current_status = models.CharField(
        max_length=20, choices=GoalStatus.choices, default=GoalStatus.DRAFT
    )
    coach_review_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["-updated_at"]


class SessionLog(models.Model):
    """
    A log entry for a single training session.
    """

    id = models.AutoField(primary_key=True)
    session_date = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="authored_session_logs"
    )

    # Link to the *holistic* season for aggregation
    athlete_season = models.ForeignKey(
        AthleteSeason, on_delete=models.CASCADE, related_name="session_logs"
    )

    # --- Generic Foreign Key to a PlanningEntity ---
    # So we know *which discipline* this log was for
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    # Wellbeing Check-in
    energy_stamina = models.IntegerField(default=3, help_text="1-5 Rating")
    session_rating = models.IntegerField(default=3, help_text="1-5 Star Rating")
    wellbeing_focus_check_in = models.JSONField(
        default=list, blank=True
    )  # e.g., ["Focus", "Stress"]
    wellbeing_mental_focus_notes = models.TextField(blank=True, null=True)
    sentiment_emoji = models.CharField(max_length=10, blank=True, null=True)

    # Coach/Skater Notes
    coach_notes = models.TextField(blank=True, null=True)  # Rich Text
    skater_notes = models.TextField(blank=True, null=True)  # Rich Text

    # Flexible JSON for element focus
    jump_focus = models.JSONField(default=dict, blank=True)
    spin_focus = models.JSONField(default=dict, blank=True)
    synchro_element_focus = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Log for {self.planning_entity} on {self.session_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-session_date"]


class InjuryLog(models.Model):
    """
    Tracks a single injury for a Skater (person).
    """

    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(
        Skater, on_delete=models.CASCADE, related_name="injury_logs"
    )

    injury_type = models.CharField(max_length=100)  # e.g., "Sprain", "Strain"
    body_area = models.JSONField(default=list, blank=True)  # e.g., ["Right", "Ankle"]
    date_of_onset = models.DateField()
    return_to_sport_date = models.DateField(null=True, blank=True)

    severity = models.CharField(
        max_length=50, blank=True, null=True
    )  # e.g., "Mild", "Severe"
    recovery_status = models.CharField(
        max_length=100, blank=True, null=True
    )  # e.g., "Off-ice", "Full-program"

    # This field should be encrypted
    recovery_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.injury_type} ({self.skater.full_name})"

    class Meta:
        ordering = ["-date_of_onset"]


class MeetingLog(models.Model):
    """
    A log for a non-practice meeting.
    e.g., "Parent-Coach", "Goal Setting"
    """

    id = models.AutoField(primary_key=True)
    meeting_date = models.DateTimeField(default=timezone.now)
    meeting_type = models.JSONField(
        default=list, blank=True
    )  # e.g., ["Parent", "Coach"]

    # A meeting can involve multiple skaters
    skaters = models.ManyToManyField(Skater, related_name="meetings")

    participants = models.TextField(blank=True, null=True)  # Text list of names
    summary_notes = models.TextField(blank=True, null=True)  # Rich Text

    def __str__(self):
        return f"Meeting on {self.meeting_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-meeting_date"]


class AthleteProfile(models.Model):
    """
    Stores private, sensitive PII/PHI for a skater.
    One-to-One with Skater.
    """

    id = models.AutoField(primary_key=True)
    skater = models.OneToOneField(
        Skater, on_delete=models.CASCADE, related_name="profile"
    )

    # --- Contact Info (For Invites) ---
    # We store these here until the User account is actually created/linked.
    skater_email = models.EmailField(blank=True, null=True)
    guardian_name = models.CharField(max_length=255, blank=True, null=True)
    guardian_email = models.EmailField(blank=True, null=True)

    # --- Emergency & Safety ---
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=50, blank=True, null=True)

    # In a real prod env, use django-cryptography for this field
    relevant_medical_notes = models.TextField(
        blank=True, null=True, help_text="Allergies, conditions, etc."
    )

    def __str__(self):
        return f"Profile for {self.skater.full_name}"


class Competition(models.Model):
    """
    A global, reusable event.
    e.g. "2026 Skate Canada Challenge"
    """

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)

    # Location Data
    location_name = models.CharField(
        max_length=255, blank=True, null=True, help_text="Arena or Venue Name"
    )
    city = models.CharField(max_length=100)
    province_state = models.CharField(
        max_length=100, help_text="Province or State Code (e.g. AB, CA)"
    )
    country = models.CharField(max_length=100, default="CA")  # ISO Code

    # Time Box (Crucial for de-duplication)
    start_date = models.DateField()
    end_date = models.DateField()

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_competitions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.city})"

    class Meta:
        ordering = ["-start_date"]


class CompetitionResult(models.Model):
    """
    Records a result for a specific entity at a competition.
    """

    id = models.AutoField(primary_key=True)

    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="results"
    )

    # Generic Link to Entity (Singles, Team, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    level = models.CharField(max_length=100)  # e.g. "Junior Women"
    placement = models.IntegerField(null=True, blank=True)
    total_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )

    # Detailed breakdown
    segment_scores = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Result for {self.planning_entity} at {self.competition}"


class SkaterTest(models.Model):
    """
    Tracks testing progress (e.g. "Gold Skills").
    """

    id = models.AutoField(primary_key=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    test_name = models.CharField(max_length=255)
    test_date = models.DateField(null=True, blank=True)
    result = models.CharField(
        max_length=50,
        choices=[("Pass", "Pass"), ("Retry", "Retry"), ("Honors", "Pass with Honors")],
    )

    evaluator_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.test_name} - {self.result}"
