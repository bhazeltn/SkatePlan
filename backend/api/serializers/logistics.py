from rest_framework import serializers
from api.models import TeamTrip, ItineraryItem, HousingAssignment, Skater


class ItineraryItemSerializer(serializers.ModelSerializer):
    trip = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ItineraryItem
        fields = "__all__"


class SkaterSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skater
        fields = ("id", "full_name")


class HousingAssignmentSerializer(serializers.ModelSerializer):
    trip = serializers.PrimaryKeyRelatedField(read_only=True)

    # Skaters
    occupants = SkaterSimpleSerializer(many=True, read_only=True)
    occupant_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skater.objects.all(),
        source="occupants",
        many=True,
        write_only=True,
        required=False,
    )

    # Guests (JSON)
    guest_occupants = serializers.JSONField(required=False)

    class Meta:
        model = HousingAssignment
        fields = (
            "id",
            "trip",
            "room_number",
            "occupants",
            "occupant_ids",
            "guest_occupants",
            "notes",
        )


class TeamTripSerializer(serializers.ModelSerializer):
    itinerary = ItineraryItemSerializer(many=True, read_only=True)
    rooming_list = HousingAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = TeamTrip
        fields = (
            "id",
            "title",
            "start_date",
            "end_date",
            "competition",
            "travel_segments",
            "guests",
            "hotel_info",
            "ground_transport_notes",
            "is_active",
            "itinerary",
            "rooming_list",
        )
