from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from datetime import date

from api.models import (
    Skater,
    AthleteSeason,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
    PlanningEntityAccess,
    Federation,
)
from api.serializers import (
    SkaterSerializer,
    SkaterUpdateSerializer,
    RosterSkaterSerializer,
)
from api.permissions import IsCoachUser


def is_name_match(name1, name2):
    return name1.strip().lower() == name2.strip().lower()


class CreateSkaterView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterSerializer

    def create(self, request, *args, **kwargs):
        full_name = request.data.get("full_name")
        dob_str = request.data.get("date_of_birth")

        discipline = request.data.get("discipline", "SINGLES")
        level = request.data.get("level", "Beginner")
        federation_id = request.data.get("federation_id")

        if not full_name or not dob_str:
            return Response(
                {"error": "Full name and date of birth are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            dob = date.fromisoformat(dob_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Duplicate Check
        potential_matches = Skater.objects.filter(date_of_birth=dob)
        for skater in potential_matches:
            if is_name_match(skater.full_name, full_name):
                return Response(
                    {
                        "error": "A skater with this name and birthday already exists.",
                        "skater_id": skater.id,
                        "action": "request_access",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # Fetch Federation
        federation_obj = None
        if federation_id:
            try:
                federation_obj = Federation.objects.get(id=federation_id)
            except Federation.DoesNotExist:
                pass

        # Create Skater
        skater = Skater.objects.create(
            full_name=full_name,
            date_of_birth=dob,
            gender=request.data.get("gender"),
            home_club=request.data.get("home_club"),
            federation=federation_obj,
        )

        # Create Entity
        entity = None
        if discipline == "SINGLES":
            entity = SinglesEntity.objects.create(skater=skater, current_level=level)
        elif discipline == "SOLO_DANCE":
            entity = SoloDanceEntity.objects.create(skater=skater, current_level=level)
        elif discipline == "PAIRS":
            entity = Team.objects.create(
                team_name=f"{skater.full_name} (Pairs)",
                discipline="PAIRS",
                partner_a=skater,
                current_level=level,
            )
        elif discipline == "ICE_DANCE":
            entity = Team.objects.create(
                team_name=f"{skater.full_name} (Dance)",
                discipline="ICE_DANCE",
                partner_a=skater,
                current_level=level,
            )
        elif discipline == "SYNCHRO":
            entity = SynchroTeam.objects.create(
                team_name=f"{skater.full_name}'s Team", level=level
            )
        else:
            entity = SinglesEntity.objects.create(skater=skater, current_level=level)

        # Permissions
        PlanningEntityAccess.objects.create(
            user=request.user,
            access_level=PlanningEntityAccess.AccessLevel.COACH,
            planning_entity=entity,
        )

        # Auto-Create Season
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_start = date(start_year, 7, 1)
        season_end = date(start_year + 1, 6, 30)
        season_str = f"{start_year}-{start_year + 1}"

        AthleteSeason.objects.create(
            skater=skater,
            season=season_str,
            start_date=season_start,
            end_date=season_end,
            primary_coach=request.user,
        )

        return Response(SkaterSerializer(skater).data, status=status.HTTP_201_CREATED)


class SkaterDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    queryset = Skater.objects.all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return SkaterSerializer
        return SkaterUpdateSerializer


class RosterView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = RosterSkaterSerializer

    def get_queryset(self):
        user = self.request.user
        # Return all skaters where this user has COACH access to any of their entities
        # (For MVP, we simplify to "All skaters created/accessed by user")
        # Complex query omitted for brevity, assuming simple link for now:
        # In reality, we query PlanningEntityAccess -> Entity -> Skater

        # Get entities where user is coach
        access_records = PlanningEntityAccess.objects.filter(
            user=user, access_level="COACH"
        )

        # Collect skaters from these entities
        skater_ids = set()
        for record in access_records:
            entity = record.planning_entity
            if hasattr(entity, "skater"):
                skater_ids.add(entity.skater.id)
            elif hasattr(entity, "partner_a"):
                skater_ids.add(entity.partner_a.id)
                if entity.partner_b:
                    skater_ids.add(entity.partner_b.id)
            # Synchro logic would go here

        # Also include skaters where user is primary_coach on a season (fallback)
        season_skaters = AthleteSeason.objects.filter(primary_coach=user).values_list(
            "skater_id", flat=True
        )
        skater_ids.update(season_skaters)

        return Skater.objects.filter(id__in=skater_ids).distinct()


# --- Entity Management Views ---
# (Small enough to live here for now)
from api.serializers import (
    SinglesEntitySerializer,
    SoloDanceEntitySerializer,
    TeamSerializer,
    SynchroTeamSerializer,
)


class SinglesEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SinglesEntitySerializer
    queryset = SinglesEntity.objects.all()


class SoloDanceEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SoloDanceEntitySerializer
    queryset = SoloDanceEntity.objects.all()


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = TeamSerializer
    queryset = Team.objects.all()


class SynchroTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SynchroTeamSerializer
    queryset = SynchroTeam.objects.all()
