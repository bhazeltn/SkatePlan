from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .users import User
from .skaters import Skater


class AthleteSeason(models.Model):
    """
    An "umbrella" holding plans.
    Can belong to a Skater, Team, or SynchroTeam.
    """

    id = models.AutoField(primary_key=True)

    # OLD: Link to Skater (Make optional now)
    skater = models.ForeignKey(
        Skater,
        on_delete=models.CASCADE,
        related_name="athlete_seasons",
        null=True,
        blank=True,
    )

    # NEW: Generic Link (For Teams/Synchro)
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    planning_entity = GenericForeignKey("content_type", "object_id")

    season = models.CharField(max_length=50)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    primary_coach = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="athlete_seasons_as_primary",
    )

    def __str__(self):
        return f"{self.season} ({self.planning_entity or self.skater})"

    class Meta:
        ordering = ["-season"]


class YearlyPlan(models.Model):
    id = models.AutoField(primary_key=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    athlete_seasons = models.ManyToManyField(AthleteSeason, related_name="yearly_plans")

    coach_owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="yearly_plans",
    )

    peak_type = models.CharField(max_length=100, blank=True, null=True)
    primary_season_goal = models.TextField(blank=True, null=True)

    def __str__(self):
        season = (
            self.athlete_seasons.first().season
            if self.athlete_seasons.exists()
            else "Unknown"
        )
        return f"YTP for {self.planning_entity} ({season})"


class Macrocycle(models.Model):
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
    id = models.AutoField(primary_key=True)
    athlete_season = models.ForeignKey(
        AthleteSeason, on_delete=models.CASCADE, related_name="weekly_plans"
    )

    # CHANGED: Remove unique=True here
    week_start = models.DateField()

    theme = models.CharField(max_length=255, blank=True, null=True)
    planned_off_ice_activities = models.JSONField(default=list, blank=True)
    session_breakdown = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Week of {self.week_start} for {self.athlete_season.skater.full_name}"

    class Meta:
        ordering = ["-week_start"]
        # ADDED: Composite Unique Constraint
        unique_together = ("athlete_season", "week_start")


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
