from rest_framework import generics, permissions
from django.contrib.contenttypes.models import ContentType
from api.models import TeamTrip, ItineraryItem, HousingAssignment, SynchroTeam, Skater
from api.serializers import (
    TeamTripSerializer,
    ItineraryItemSerializer,
    HousingAssignmentSerializer,
)
from api.permissions import IsCoachUser, IsCoachOrOwner


class SynchroTripListCreateView(generics.ListCreateAPIView):
    # Coach sees ALL trips (Active + Archived)
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamTripSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        return TeamTrip.objects.filter(content_type=ct, object_id=team_id)

    def perform_create(self, serializer):
        team_id = self.kwargs["team_id"]
        ct = ContentType.objects.get_for_model(SynchroTeam)
        team = SynchroTeam.objects.get(id=team_id)
        serializer.save(content_type=ct, object_id=team.id)


class SkaterTripListView(generics.ListAPIView):
    """
    Returns all trips for all Synchro Teams this skater belongs to.
    Read-Only for the Skater/Parent.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = TeamTripSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        teams = skater.synchro_teams.all()

        if not teams.exists():
            return TeamTrip.objects.none()

        ct = ContentType.objects.get_for_model(SynchroTeam)
        return TeamTrip.objects.filter(
            content_type=ct,
            object_id__in=teams.values_list("id", flat=True),
            is_active=True,  # <--- FILTER: Only Active Trips for Parents
        ).order_by("start_date")


class TeamTripDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = TeamTripSerializer
    queryset = TeamTrip.objects.all()


# --- ITINERARY SUB-ITEMS ---
class ItineraryListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = ItineraryItemSerializer

    def get_queryset(self):
        return ItineraryItem.objects.filter(trip_id=self.kwargs["trip_id"])

    def perform_create(self, serializer):
        # Note: IsCoachOrOwner blocks POST for non-coaches implicitly
        # because ItineraryItem is not in the "allowed write" list.
        trip = TeamTrip.objects.get(id=self.kwargs["trip_id"])
        serializer.save(trip=trip)


class ItineraryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = ItineraryItemSerializer
    queryset = ItineraryItem.objects.all()


# --- HOUSING SUB-ITEMS ---
class HousingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = HousingAssignmentSerializer

    def get_queryset(self):
        return HousingAssignment.objects.filter(trip_id=self.kwargs["trip_id"])

    def perform_create(self, serializer):
        trip = TeamTrip.objects.get(id=self.kwargs["trip_id"])
        serializer.save(trip=trip)


class HousingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = HousingAssignmentSerializer
    queryset = HousingAssignment.objects.all()
