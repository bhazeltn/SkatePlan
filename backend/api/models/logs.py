from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import date
from .users import User
from .skaters import Skater
from .planning import AthleteSeason


class SessionLog(models.Model):
    """
    A log entry for a single training session.
    """

    id = models.AutoField(primary_key=True)
    session_date = models.DateField(default=date.today)
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="authored_session_logs"
    )

    athlete_season = models.ForeignKey(
        AthleteSeason, on_delete=models.CASCADE, related_name="session_logs"
    )

    # Link to Discipline (Singles, Dance, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    planning_entity = GenericForeignKey("content_type", "object_id")

    # Wellbeing
    energy_stamina = models.IntegerField(default=3, help_text="1-5 Rating")
    session_rating = models.IntegerField(default=3, help_text="1-5 Star Rating")
    sentiment_emoji = models.CharField(max_length=10, blank=True, null=True)

    wellbeing_focus_check_in = models.JSONField(default=list, blank=True)
    wellbeing_mental_focus_notes = models.TextField(blank=True, null=True)

    # Notes
    coach_notes = models.TextField(blank=True, null=True)
    skater_notes = models.TextField(blank=True, null=True)

    attendance = models.JSONField(default=list, blank=True)

    # Focus Areas
    jump_focus = models.JSONField(default=dict, blank=True)
    spin_focus = models.JSONField(default=dict, blank=True)
    synchro_element_focus = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Log for {self.planning_entity} on {self.session_date}"

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

    injury_type = models.CharField(max_length=100)
    body_area = models.JSONField(default=list, blank=True)
    date_of_onset = models.DateField()
    return_to_sport_date = models.DateField(null=True, blank=True)

    severity = models.CharField(max_length=50, blank=True, null=True)
    recovery_status = models.CharField(max_length=100, blank=True, null=True)
    recovery_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.injury_type} ({self.skater.full_name})"

    class Meta:
        ordering = ["-date_of_onset"]


class MeetingLog(models.Model):
    """
    A log for a non-practice meeting (Parent-Coach, Goal Setting).
    """

    id = models.AutoField(primary_key=True)
    meeting_date = models.DateTimeField(default=timezone.now)
    meeting_type = models.JSONField(default=list, blank=True)

    skaters = models.ManyToManyField(Skater, related_name="meetings")
    participants = models.TextField(blank=True, null=True)
    summary_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Meeting on {self.meeting_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-meeting_date"]
