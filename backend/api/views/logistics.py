from rest_framework import generics, permissions
from django.contrib.contenttypes.models import ContentType
from api.models import TeamTrip, ItineraryItem, HousingAssignment, SynchroTeam
from api.serializers import (
    TeamTripSerializer,
    ItineraryItemSerializer,
    HousingAssignmentSerializer,
)
from api.permissions import IsCoachUser


class SynchroTripListCreateView(generics.ListCreateAPIView):
    """
    Manage Trips specifically for a Synchro Team.
    """

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


class TeamTripDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamTripSerializer
    queryset = TeamTrip.objects.all()


# --- ITINERARY SUB-ITEMS ---
class ItineraryListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ItineraryItemSerializer

    def get_queryset(self):
        return ItineraryItem.objects.filter(trip_id=self.kwargs["trip_id"])

    def perform_create(self, serializer):
        trip = TeamTrip.objects.get(id=self.kwargs["trip_id"])
        serializer.save(trip=trip)


class ItineraryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ItineraryItemSerializer
    queryset = ItineraryItem.objects.all()


# --- HOUSING SUB-ITEMS ---
class HousingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = HousingAssignmentSerializer

    def get_queryset(self):
        return HousingAssignment.objects.filter(trip_id=self.kwargs["trip_id"])

    def perform_create(self, serializer):
        trip = TeamTrip.objects.get(id=self.kwargs["trip_id"])
        serializer.save(trip=trip)


class HousingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = HousingAssignmentSerializer
    queryset = HousingAssignment.objects.all()
