from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .competitions import Competition
from .skaters import Skater


class TeamTrip(models.Model):
    """
    A container for a Synchro Team's travel event.
    """

    id = models.AutoField(primary_key=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    team = GenericForeignKey("content_type", "object_id")

    competition = models.ForeignKey(
        Competition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trips",
    )

    title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()

    # --- CHANGED: Structured Travel ---
    # Stores list: [
    #   { "type": "FLIGHT", "carrier": "AC", "number": "123", "dep": "...", "arr": "..." },
    #   { "type": "TRAIN", "carrier": "Via", "number": "64", ... }
    # ]
    travel_segments = models.JSONField(default=list, blank=True)
    # ----------------------------------

    hotel_info = models.TextField(
        blank=True, null=True, help_text="Hotel name, address, booking block"
    )

    # --- RENAMED: Destination Transport ---
    ground_transport_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Transport at destination (e.g. Shuttle bus to rink)",
    )
    # --------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.start_date})"

    class Meta:
        ordering = ["-start_date"]


# ... (ItineraryItem and HousingAssignment remain the same) ...
class ItineraryItem(models.Model):
    id = models.AutoField(primary_key=True)
    trip = models.ForeignKey(
        TeamTrip, on_delete=models.CASCADE, related_name="itinerary"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    activity = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Category(models.TextChoices):
        TRAVEL = "TRAVEL", "Travel"
        ICE = "ICE", "On Ice"
        OFF_ICE = "OFF_ICE", "Off Ice / Warmup"
        MEAL = "MEAL", "Meal"
        MEETING = "MEETING", "Meeting"
        COMPETITION = "COMPETITION", "Competition"
        OTHER = "OTHER", "Other"

    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )

    class Meta:
        ordering = ["start_time"]


class HousingAssignment(models.Model):
    id = models.AutoField(primary_key=True)
    trip = models.ForeignKey(
        TeamTrip, on_delete=models.CASCADE, related_name="rooming_list"
    )
    room_number = models.CharField(max_length=50, blank=True, null=True)
    occupants = models.ManyToManyField(Skater, related_name="trip_rooms")
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.room_number} ({self.occupants.count()})"
