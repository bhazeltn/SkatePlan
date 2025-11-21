from rest_framework import generics, permissions
from api.models import Federation
from api.serializers import FederationSerializer


class FederationList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FederationSerializer
    queryset = Federation.objects.all().order_by("code")
