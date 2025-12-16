from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .users import User
from .skaters import Skater
from .competitions import Program


class AthleteSeason(models.Model):
    id = models.AutoField(primary_key=True)
    skater = models.ForeignKey(
        Skater,
        on_delete=models.CASCADE,
        related_name="athlete_seasons",
        null=True,
        blank=True,
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    planning_entity = GenericForeignKey("content_type", "object_id")

    season = models.CharField(max_length=50)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    primary_coach = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coached_seasons",
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.season} - {self.skater or self.planning_entity}"


class YearlyPlan(models.Model):
    id = models.AutoField(primary_key=True)
    coach_owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="yearly_plans"
    )

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    athlete_seasons = models.ManyToManyField(AthleteSeason, related_name="yearly_plans")

    peak_type = models.CharField(
        max_length=50,
        choices=[
            ("Single Peak", "Single Peak"),
            ("Double Peak", "Double Peak"),
            ("Triple Peak", "Triple Peak"),
            ("Development", "Development"),
        ],
        default="Single Peak",
    )

    primary_season_goal = models.TextField(blank=True, null=True)
    title = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Custom name for this plan (e.g. 'Road to Gold')",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"YTP: {self.planning_entity}"


class Macrocycle(models.Model):
    id = models.AutoField(primary_key=True)
    yearly_plan = models.ForeignKey(
        YearlyPlan, on_delete=models.CASCADE, related_name="macrocycles"
    )
    phase_title = models.CharField(max_length=100)
    phase_start = models.DateField()
    phase_end = models.DateField()

    phase_focus = models.TextField(blank=True, null=True)
    technical_focus = models.TextField(blank=True, null=True)
    component_focus = models.TextField(blank=True, null=True)
    physical_focus = models.TextField(blank=True, null=True)
    mental_focus = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["phase_start"]


class WeeklyPlan(models.Model):
    """
    Holistic weekly container for an athlete.
    Links to AthleteSeason (person), not just a discipline.
    """

    id = models.AutoField(primary_key=True)
    athlete_season = models.ForeignKey(
        AthleteSeason, on_delete=models.CASCADE, related_name="weekly_plans"
    )
    week_start = models.DateField()

    theme = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    max_session_hours = models.FloatField(null=True, blank=True)
    max_session_count = models.IntegerField(null=True, blank=True)

    session_breakdown = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("athlete_season", "week_start")
        ordering = ["week_start"]

    def __str__(self):
        return f"Week of {self.week_start} ({self.athlete_season})"


class PlannedSession(models.Model):
    """
    An individual session within a weekly plan.
    Supports all session types for holistic load management.
    """

    class SessionType(models.TextChoices):
        # Training
        ON_ICE = "ON_ICE", "On Ice"
        OFF_ICE = "OFF_ICE", "Off Ice"
        CLASS = "CLASS", "Class / Dance"
        CONDITIONING = "CONDITIONING", "Conditioning"
        # Development
        PROGRAM_DEVELOPMENT = "PROGRAM_DEVELOPMENT", "Program Development"
        CHOREOGRAPHY = "CHOREOGRAPHY", "Choreography"
        MUSIC_EDIT = "MUSIC_EDIT", "Music Edit"
        # Events
        CLINIC = "CLINIC", "Clinic / Seminar"
        SHOW = "SHOW", "Ice Show"
        EXHIBITION = "EXHIBITION", "Exhibition"
        TEST_SESSION = "TEST_SESSION", "Test Session"
        # Competition
        COMPETITION = "COMPETITION", "Competition"
        TRAVEL = "TRAVEL", "Travel"
        # Recovery
        REST = "REST", "Rest Day"
        RECOVERY = "RECOVERY", "Active Recovery"
        OTHER = "OTHER", "Other"

    class DayOfWeek(models.TextChoices):
        MONDAY = "MONDAY", "Monday"
        TUESDAY = "TUESDAY", "Tuesday"
        WEDNESDAY = "WEDNESDAY", "Wednesday"
        THURSDAY = "THURSDAY", "Thursday"
        FRIDAY = "FRIDAY", "Friday"
        SATURDAY = "SATURDAY", "Saturday"
        SUNDAY = "SUNDAY", "Sunday"

    id = models.AutoField(primary_key=True)
    weekly_plan = models.ForeignKey(
        WeeklyPlan, on_delete=models.CASCADE, related_name="planned_sessions"
    )
    yearly_plan = models.ForeignKey(
        YearlyPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
        help_text="Link to specific discipline plan",
    )

    day_of_week = models.CharField(max_length=10, choices=DayOfWeek.choices)
    planned_time = models.TimeField(null=True, blank=True)
    planned_duration = models.IntegerField(help_text="Duration in minutes")

    session_type = models.CharField(
        max_length=20,
        choices=SessionType.choices,
        default=SessionType.ON_ICE,
    )

    # Event Specific Fields
    event_name = models.CharField(max_length=255, blank=True, null=True)
    event_location = models.CharField(max_length=255, blank=True, null=True)
    cost = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planned_sessions",
    )

    focus = models.TextField(blank=True, null=True)
    planned_elements = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_sessions"
    )
    
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        COMPLETED = "COMPLETED", "Completed"
        MISSED = "MISSED", "Missed"
        CANCELLED = "CANCELLED", "Cancelled"

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNED
    )

    class Meta:
        ordering = ["day_of_week", "planned_time"]

    def __str__(self):
        return f"{self.get_session_type_display()} on {self.get_day_of_week_display()}"


class Goal(models.Model):
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

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    assignee_skater = models.ForeignKey(
        Skater,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_goals",
    )

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_goals"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="updated_goals"
    )

    goal_type = models.CharField(max_length=50, blank=True, null=True)
    goal_timeframe = models.CharField(max_length=50, blank=True, null=True)

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


class GapAnalysis(models.Model):
    id = models.AutoField(primary_key=True)

    # FIX: Allow nulls to handle existing rows during migration
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    planning_entity = GenericForeignKey("content_type", "object_id")

    elements_status = models.JSONField(default=dict, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("content_type", "object_id")
