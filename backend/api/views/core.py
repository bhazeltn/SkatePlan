from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q

from api.models import Federation, SkatingElement, PlanningEntityAccess
from api.serializers import FederationSerializer, SkatingElementSerializer
from api.services import get_access_role


class FederationList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FederationSerializer
    queryset = Federation.objects.all().order_by("iso_code")


class SkatingElementList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SkatingElementSerializer

    def get_queryset(self):
        queryset = SkatingElement.objects.filter(is_active=True).order_by(
            "abbreviation"
        )

        # 1. Search (by code or name)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(element_name__icontains=search) | Q(abbreviation__icontains=search)
            )

        # 2. Category Filter (Jump, Spin, etc.)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__iexact=category)

        # 3. Discipline Filter (Singles, Pairs, etc.)
        discipline = self.request.query_params.get("discipline")
        if discipline:
            queryset = queryset.filter(discipline_type__iexact=discipline)

        # 4. Standard Only (Hides <, <<, q, V, e)
        # Pass ?standard=true in the URL to activate this
        standard = self.request.query_params.get("standard")
        if standard and standard.lower() == "true":
            queryset = queryset.filter(is_standard=True)

        return queryset


class RevokeAccessView(APIView):
    """
    Allows a Coach/Owner to remove a Collaborator or Guardian.
    Also allows a user to 'Leave' (Revoke their own access).
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        access_record = get_object_or_404(PlanningEntityAccess, pk=pk)

        # 1. Self-Revoke (Leaving)
        if access_record.user == request.user:
            access_record.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # 2. Owner Revoke (Firing)
        target = access_record.planning_entity

        # Check role on the target entity
        role = get_access_role(request.user, target)

        # Only Owners, Managers, or Global Coaches (if configured) can revoke
        if role in ["OWNER", "COACH", "MANAGER"]:
            access_record.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Permission denied. You cannot revoke this access."}, status=403
        )


class UnlinkAthleteView(APIView):
    """
    Unlinks a User account from a Skater profile (Firing the athlete).
    Only the Owner/Coach can do this.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, skater_id):
        skater = get_object_or_404(Skater, id=skater_id)

        # Check Permission
        role = get_access_role(request.user, skater)
        if role not in ["OWNER", "COACH"]:
            return Response({"error": "Permission denied."}, status=403)

        # Unlink
        skater.user_account = None
        skater.save()

        return Response({"message": "Athlete unlinked successfully."}, status=200)
