from django.db import models
from .users import User


class Federation(models.Model):
    """
    Represents a skating federation (national or regional).

    Federations can be at different support tiers:
    - BASIC: Just name and code
    - ENHANCED: Full level data available
    - PARTNER: Custom integration
    """

    class SupportTier(models.TextChoices):
        BASIC = "BASIC", "Basic - Name only"
        ENHANCED = "ENHANCED", "Enhanced - Full level data"
        PARTNER = "PARTNER", "Partner - Custom integration"

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, blank=True, null=True)  # ISU Code (CAN)
    iso_code = models.CharField(max_length=2, blank=True, null=True)  # ISO Code (ca)

    # New Fields
    support_tier = models.CharField(
        max_length=20,
        choices=SupportTier.choices,
        default=SupportTier.BASIC,
    )
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to="federation_logos/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class FederationLevel(models.Model):
    """
    Optional structured level data for a federation (e.g., "STAR 1", "Novice").
    Enables smart features like element validation and suggestions.
    """

    id = models.AutoField(primary_key=True)
    federation = models.ForeignKey(
        Federation, on_delete=models.CASCADE, related_name="levels"
    )

    level_code = models.CharField(max_length=50, help_text="Internal code (e.g. STAR_5)")
    display_name = models.CharField(max_length=100, help_text="Human readable name")
    sort_order = models.IntegerField(default=0, help_text="For progression ordering")

    # JSON capabilities (flexible structure for any federation rules)
    # e.g., { "can_do_doubles": true, "max_program_length": 120 }
    capabilities = models.JSONField(default=dict, blank=True)

    data_source = models.URLField(
        blank=True, null=True, help_text="Link to rulebook/source"
    )
    verified = models.BooleanField(default=False)

    class Meta:
        unique_together = ("federation", "level_code")
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.display_name} ({self.federation.code})"


class FederationLevelContribution(models.Model):
    """
    Community-submitted federation level data.
    Allows coaches to help populate the database for unsupported federations.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    id = models.AutoField(primary_key=True)
    federation = models.ForeignKey(
        Federation, on_delete=models.CASCADE, related_name="contributions"
    )
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="federation_contributions"
    )

    level_code = models.CharField(max_length=50)
    capabilities = models.JSONField(default=dict)
    data_source = models.URLField(help_text="Required link to rulebook")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    admin_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Contribution for {self.federation.name} - {self.level_code}"


class SkatingElement(models.Model):
    id = models.AutoField(primary_key=True)

    # Identification
    element_name = models.CharField(max_length=255)  # e.g. "Triple Lutz"
    abbreviation = models.CharField(max_length=50)  # e.g. "3Lz"

    # Classification
    discipline_type = models.CharField(max_length=50)
    category = models.CharField(max_length=50, blank=True, null=True)

    # Scoring Data
    base_value = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)

    # NEW: Store the exact points for every GOE level
    # Example: { "-5": -2.95, "-4": -2.36, ... "+5": 2.95 }
    goe_scale = models.JSONField(default=dict, blank=True)

    # Meta
    is_active = models.BooleanField(default=True)
    is_standard = models.BooleanField(default=True)

    class Meta:
        ordering = ["discipline_type", "abbreviation"]
        # Note: Removing unique_together if it causes issues with shared codes across categories
        # unique_together = ("abbreviation", "discipline_type")

    def __str__(self):
        return f"{self.abbreviation} ({self.base_value})"
