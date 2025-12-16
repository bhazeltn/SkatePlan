from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.utils import timezone
from datetime import date, timedelta
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.COACH)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        COACH = "COACH", "Coach"
        SKATER = "SKATER", "Skater"
        GUARDIAN = "GUARDIAN", "Guardian"
        OBSERVER = "OBSERVER", "Observer"

    email = models.EmailField(unique=True, primary_key=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.SKATER)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email


class Organization(models.Model):
    """
    Represents a federation, club, or academy.
    Can have multiple coaches and athletes.
    """

    class OrganizationType(models.TextChoices):
        FEDERATION = "FEDERATION", "National Federation"
        CLUB = "CLUB", "Skating Club"
        ACADEMY = "ACADEMY", "Training Academy"

    class SubscriptionTier(models.TextChoices):
        FREE = "FREE", "Free"
        BASIC = "BASIC", "Basic - $50/month"
        PRO = "PRO", "Pro - $200/month"
        FEDERATION = "FEDERATION", "Federation - $500/month"

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    organization_type = models.CharField(
        max_length=20, choices=OrganizationType.choices
    )

    # Billing
    subscription_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
    )

    # Settings
    max_coaches = models.IntegerField(null=True, blank=True)  # null = unlimited
    max_athletes = models.IntegerField(null=True, blank=True)

    # Contact
    primary_contact = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="managed_organizations"
    )
    billing_email = models.EmailField()

    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class OrganizationMembership(models.Model):
    """
    Links users (coaches, athletes) to an organization.
    Defines their role within the organization.
    """

    class OrgRole(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        COACH = "COACH", "Coach"
        ATHLETE = "ATHLETE", "Athlete"

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="org_memberships"
    )
    role = models.CharField(max_length=20, choices=OrgRole.choices)

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "user")

    def __str__(self):
        return f"{self.user.email} -> {self.organization.name} ({self.role})"


class OrganizationInvite(models.Model):
    """
    Invitations to join an organization.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="invites"
    )
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=OrganizationMembership.OrgRole.choices)

    invited_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_org_invites"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Invite {self.email} to {self.organization.name}"


class Invitation(models.Model):
    # --- EXTENDED ROLES FOR INVITES ---
    class InviteRole(models.TextChoices):
        # Core User Roles
        COACH = "COACH", "Coach"
        SKATER = "SKATER", "Skater"
        GUARDIAN = "GUARDIAN", "Guardian"
        OBSERVER = "OBSERVER", "Observer"

        # Context/Legacy Roles
        COLLABORATOR = "COLLABORATOR", "Collaborator"
        MANAGER = "MANAGER", "Team Manager"
        ATHLETE = "ATHLETE", "Athlete"  # Legacy/Frontend term for Skater
        PARENT = "PARENT", "Parent"  # Legacy term for Guardian

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()

    sender = models.ForeignKey(
        User, related_name="sent_invites", on_delete=models.CASCADE
    )

    # Updated to use the superset
    role = models.CharField(max_length=20, choices=InviteRole.choices)

    from django.contrib.contenttypes.fields import GenericForeignKey
    from django.contrib.contenttypes.models import ContentType

    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    target_entity = GenericForeignKey("content_type", "object_id")

    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return self.accepted_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite {self.email} ({self.role})"
