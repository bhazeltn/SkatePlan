from rest_framework import serializers
from api.models import Federation, SkatingElement


class FederationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Federation
        fields = ("id", "name", "code", "iso_code")


class SkatingElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkatingElement
        fields = "__all__"
