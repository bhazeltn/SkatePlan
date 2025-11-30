from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .users import User
from .core import Federation


class Skater(models.Model):
    """
    The central profile for an individual athlete (the person).
    """

    id = models.AutoField(primary_key=True)
    user_account = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="skaters", null=True, blank=True
    )

    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Archiving Field
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
    skater_email = models.EmailField(blank=True, null=True)
    guardian_name = models.CharField(max_length=255, blank=True, null=True)
    guardian_email = models.EmailField(blank=True, null=True)

    # --- Emergency & Safety ---
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=50, blank=True, null=True)

    relevant_medical_notes = models.TextField(
        blank=True, null=True, help_text="Allergies, conditions, etc."
    )

    def __str__(self):
        return f"Profile for {self.skater.full_name}"


class SinglesEntity(models.Model):
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
    class Discipline(models.TextChoices):
        PAIRS = "PAIRS", "Pairs"
        ICE_DANCE = "ICE_DANCE", "Ice Dance"

    id = models.AutoField(primary_key=True)
    team_name = models.CharField(max_length=255)
    discipline = models.CharField(max_length=10, choices=Discipline.choices)

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

    # Archiving
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.team_name


class SynchroTeam(models.Model):
    id = models.AutoField(primary_key=True)
    team_name = models.CharField(max_length=255, unique=True)

    roster = models.ManyToManyField(Skater, related_name="synchro_teams", blank=True)

    federation = models.ForeignKey(
        Federation, on_delete=models.SET_NULL, null=True, blank=True
    )
    level = models.CharField(max_length=100)  # e.g. "Junior", "Novice"

    # Archiving
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.team_name


class PlanningEntityAccess(models.Model):
    class AccessLevel(models.TextChoices):
        COACH = "COACH", "Coach"
        GUARDIAN = "GUARDIAN", "Guardian"
        OBSERVER = "OBSERVER", "Observer"
        # Added to support new roles
        COLLABORATOR = "COLLABORATOR", "Collaborator"
        MANAGER = "MANAGER", "Manager"
        VIEWER = "VIEWER", "Viewer"

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="planning_access"
    )
    access_level = models.CharField(max_length=20, choices=AccessLevel.choices)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return f"{self.user.email} -> {self.get_access_level_display()} access to {self.planning_entity}"

    class Meta:
        unique_together = ("user", "content_type", "object_id", "access_level")
