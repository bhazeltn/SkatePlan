from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.utils import timezone

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

    class DisciplineType(models.TextChoices):
        JUMP = "JUMP", "Jump"
        SPIN = "SPIN", "Spin"
        LIFT = "LIFT", "Lift"
        STEP = "STEP", "Step Sequence"
        CHOREO = "CHOREO", "Choreographic Sequence"
        OTHER = "OTHER", "Other"

    id = models.AutoField(primary_key=True)
    element_name = models.CharField(max_length=100)  # e.g., "Triple Lutz"
    abbreviation = models.CharField(max_length=10, unique=True)  # e.g., "3Lz"
    discipline_type = models.CharField(
        max_length=10, choices=DisciplineType.choices, default=DisciplineType.OTHER
    )

    def __str__(self):
        return f"{self.element_name} ({self.abbreviation})"

    class Meta:
        ordering = ["discipline_type", "element_name"]


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
