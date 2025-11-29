from rest_framework import generics, permissions, status
from rest_framework.response import Response
from api.models import Federation, SkatingElement
from api.serializers import FederationSerializer, SkatingElementSerializer
from django.db.models import Q
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from api.models import PlanningEntityAccess
from api.permissions import IsCoachUser


class FederationList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FederationSerializer
    queryset = Federation.objects.all().order_by("code")


class SkatingElementList(generics.ListAPIView):
    """
    Searchable list of skating elements.
    Usage: /api/elements/?search=Lutz&category=JUMP
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SkatingElementSerializer

    def get_queryset(self):
        queryset = SkatingElement.objects.all()
        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")

        if search:
            queryset = queryset.filter(
                Q(element_name__icontains=search) | Q(abbreviation__icontains=search)
            )

        if category:
            queryset = queryset.filter(discipline_type=category)

        return queryset.order_by("element_name")[:20]  # Limit to 20 for speed


class RevokeAccessView(APIView):
    """
    Allows a Coach/Owner to remove a Collaborator or Guardian.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def delete(self, request, pk):
        access_record = get_object_or_404(PlanningEntityAccess, pk=pk)

        # Security Check: Can I revoke this?
        # I must be the OWNER/COACH of the entity this record belongs to.
        # Or I must be revoking my OWN access (leaving).

        is_self_revoke = access_record.user == request.user

        # Check if requestor is the "Owner" of the target entity
        is_owner = False
        target = access_record.planning_entity

        # Look for an Owner/Coach record for this requester on the same entity
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(target)
        owner_record = PlanningEntityAccess.objects.filter(
            user=request.user,
            content_type=ct,
            object_id=target.id,
            access_level__in=["COACH", "OWNER", "MANAGER"],
        ).exists()

        if is_self_revoke or owner_record:
            access_record.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Permission denied. You cannot revoke this access."}, status=403
        )
