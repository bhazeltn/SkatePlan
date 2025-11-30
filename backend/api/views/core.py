from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from api.models import Federation, SkatingElement, PlanningEntityAccess
from api.serializers import FederationSerializer, SkatingElementSerializer
from api.services import get_access_role


class FederationList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FederationSerializer
    queryset = Federation.objects.all().order_by("name")


class SkatingElementList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SkatingElementSerializer
    queryset = SkatingElement.objects.all().order_by("element_name")


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
