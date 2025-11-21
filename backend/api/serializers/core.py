from rest_framework import serializers
from api.models import Federation, SkatingElement


class FederationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Federation
        fields = ("id", "name", "code", "flag_emoji")


class SkatingElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkatingElement
        fields = "__all__"
