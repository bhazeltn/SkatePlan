from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .users import User
from .skaters import Skater


class Competition(models.Model):
    """
    A global, reusable event.
    """

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)

    location_name = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    province_state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="CA")

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

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        REGISTERED = "REGISTERED", "Registered"
        COMPLETED = "COMPLETED", "Completed"

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.COMPLETED
    )

    level = models.CharField(max_length=100)
    placement = models.IntegerField(null=True, blank=True)
    total_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )

    segment_scores = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Result for {self.planning_entity} at {self.competition}"

    class Meta:
        ordering = ["-competition__start_date"]


class SkaterTest(models.Model):
    """
    Tracks testing progress. Linked to Skater.
    """

    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(Skater, on_delete=models.CASCADE, related_name="tests")

    test_type = models.CharField(max_length=100, default="Skills")
    test_name = models.CharField(max_length=255)
    test_date = models.DateField(null=True, blank=True)

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        SCHEDULED = "SCHEDULED", "Scheduled"
        COMPLETED = "COMPLETED", "Completed"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNED
    )

    result = models.CharField(
        max_length=50,
        choices=[("Pass", "Pass"), ("Retry", "Retry"), ("Honors", "Pass with Honors")],
        null=True,
        blank=True,
    )

    evaluator_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.test_name} ({self.status})"


class Program(models.Model):
    """
    Defines a specific competitive program.
    """

    id = models.AutoField(primary_key=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    title = models.CharField(max_length=255)
    season = models.CharField(max_length=50)

    class Category(models.TextChoices):
        SHORT = "Short Program", "Short Program"
        FREE = "Free Skate", "Free Skate"
        RHYTHM = "Rhythm Dance", "Rhythm Dance"
        FREE_DANCE = "Free Dance", "Free Dance"
        ARTISTIC = "Artistic", "Artistic"
        OTHER = "Other", "Other"

    program_category = models.CharField(
        max_length=50, choices=Category.choices, default=Category.FREE
    )

    music_title = models.CharField(max_length=255, blank=True, null=True)
    choreographer = models.CharField(max_length=255, blank=True, null=True)
    planned_elements = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.season})"
