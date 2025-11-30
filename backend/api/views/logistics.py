from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from django.contrib.contenttypes.models import ContentType
from api.models import TeamTrip, ItineraryItem, HousingAssignment, SynchroTeam, Skater
from api.serializers import (
    TeamTripSerializer,
    ItineraryItemSerializer,
    HousingAssignmentSerializer,
)
from api.permissions import IsCoachUser, IsCoachOrOwner
from api.services import get_access_role  # <--- Import Service


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
        team = SynchroTeam.objects.get(id=team_id)

        # Security Check
        role = get_access_role(self.request.user, team)
        if role in ["VIEWER", "OBSERVER"] or not role:
            raise PermissionDenied("Observers cannot create trips.")

        ct = ContentType.objects.get_for_model(SynchroTeam)
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

        # 1. Get all synchro teams this skater is on
        teams = skater.synchro_teams.all()

        if not teams.exists():
            return TeamTrip.objects.none()

        # 2. Get trips for these teams
        ct = ContentType.objects.get_for_model(SynchroTeam)
        return TeamTrip.objects.filter(
            content_type=ct,
            object_id__in=teams.values_list("id", flat=True),
            is_active=True,  # Only Active Trips for Skaters/Parents
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
        trip = TeamTrip.objects.get(id=self.kwargs["trip_id"])

        # Resolve Entity (Team) from Trip
        # Trip stores generic relation, so we fetch the object
        entity = trip.team

        role = get_access_role(self.request.user, entity)
        if role in ["VIEWER", "OBSERVER"] or not role:
            raise PermissionDenied("Observers cannot modify itinerary.")

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

        # Resolve Entity
        entity = trip.team

        role = get_access_role(self.request.user, entity)
        if role in ["VIEWER", "OBSERVER"] or not role:
            raise PermissionDenied("Observers cannot modify housing.")

        serializer.save(trip=trip)


class HousingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]
    serializer_class = HousingAssignmentSerializer
    queryset = HousingAssignment.objects.all()
