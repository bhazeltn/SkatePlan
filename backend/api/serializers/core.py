from rest_framework import serializers
from api.models import Federation


class FederationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Federation
        fields = ("id", "name", "code", "flag_emoji")
