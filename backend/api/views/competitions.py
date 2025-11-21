from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from datetime import date

from api.models import (
    Skater,
    Competition,
    CompetitionResult,
    SkaterTest,
    Program,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
)
from api.serializers import (
    CompetitionSerializer,
    CompetitionResultSerializer,
    SkaterTestSerializer,
    ProgramSerializer,
)
from api.permissions import IsCoachUser


class CompetitionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompetitionSerializer

    def get_queryset(self):
        queryset = Competition.objects.all().order_by("-start_date")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(city__icontains=search)
            )
        return queryset

    def create(self, request, *args, **kwargs):
        city = request.data.get("city")
        start_str = request.data.get("start_date")
        end_str = request.data.get("end_date")
        force_create = request.data.get("force_create", False)

        if not force_create and city and start_str and end_str:
            try:
                new_start = date.fromisoformat(start_str)
                new_end = date.fromisoformat(end_str)
                duplicates = Competition.objects.filter(
                    city__iexact=city.strip(),
                    start_date__lte=new_end,
                    end_date__gte=new_start,
                )
                if duplicates.exists():
                    serializer = self.get_serializer(duplicates, many=True)
                    return Response(
                        {
                            "error": "Potential duplicate found",
                            "candidates": serializer.data,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
            except ValueError:
                pass

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=self.request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CompetitionResultListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = CompetitionResultSerializer

    def get_queryset(self):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)
        # Find results for all skater's entities
        entities = list(skater.singles_entities.all()) + list(
            skater.solodance_entities.all()
        )
        entity_ids = [e.id for e in entities]
        return CompetitionResult.objects.filter(object_id__in=entity_ids).order_by(
            "-competition__start_date"
        )

    def perform_create(self, serializer):
        skater_id = self.kwargs["skater_id"]
        skater = Skater.objects.get(id=skater_id)

        # Try explicit entity ID
        entity_id = self.request.data.get("planning_entity_id")
        entity = None
        all_entities = (
            list(skater.singles_entities.all())
            + list(skater.solodance_entities.all())
            + list(skater.teams_as_partner_a.all())
        )

        if entity_id:
            entity = next(
                (e for e in all_entities if str(e.id) == str(entity_id)), None
            )

        if not entity:
            entity = all_entities[0] if all_entities else None

        if not entity:
            raise ValidationError("No active discipline found.")

        content_type = ContentType.objects.get_for_model(entity)
        serializer.save(content_type=content_type, object_id=entity.id)


class CompetitionResultDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = CompetitionResultSerializer
    queryset = CompetitionResult.objects.all()


class SkaterTestListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterTestSerializer

    def get_queryset(self):
        return SkaterTest.objects.filter(skater_id=self.kwargs["skater_id"]).order_by(
            "-test_date"
        )

    def perform_create(self, serializer):
        skater = Skater.objects.get(id=self.kwargs["skater_id"])
        serializer.save(skater=skater)


class SkaterTestDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = SkaterTestSerializer
    queryset = SkaterTest.objects.all()


class ProgramListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ProgramSerializer

    def get_queryset(self):
        skater = Skater.objects.get(id=self.kwargs["skater_id"])
        entities = list(skater.singles_entities.all()) + list(
            skater.solodance_entities.all()
        )
        entity_ids = [e.id for e in entities]
        return Program.objects.filter(object_id__in=entity_ids).order_by("-season")

    def perform_create(self, serializer):
        entity_id = self.request.data.get("planning_entity_id")
        entity_type = self.request.data.get("planning_entity_type")

        model_map = {
            "SinglesEntity": SinglesEntity,
            "SoloDanceEntity": SoloDanceEntity,
            "Team": Team,
            "SynchroTeam": SynchroTeam,
        }
        model_class = model_map.get(entity_type)
        content_type = ContentType.objects.get_for_model(model_class)
        serializer.save(content_type=content_type, object_id=entity_id)


class ProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]
    serializer_class = ProgramSerializer
    queryset = Program.objects.all()
