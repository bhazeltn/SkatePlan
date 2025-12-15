from django.db import models


class Federation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, blank=True, null=True)  # ISU Code (CAN)
    iso_code = models.CharField(max_length=2, blank=True, null=True)  # ISO Code (ca)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


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
