from rest_framework import generics, permissions
from api.models import Federation, SkatingElement
from api.serializers import FederationSerializer, SkatingElementSerializer
from django.db.models import Q


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
