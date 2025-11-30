from rest_framework import permissions
from api.services import get_access_role
from api.models import (
    Skater,
    Team,
    SynchroTeam,
    SessionLog,
    InjuryLog,
    Goal,
    CompetitionResult,
    SkaterTest,
)


class IsCoachUser(permissions.BasePermission):
    """
    Global Role Check. Used for broad list views where queryset filtering handles security.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Allow if they have a 'staff' role globally, OR if they are a Skater/Guardian
        # relying on object-level permissions later.
        # Actually, for "Create Team", we restrict to Global Coaches.
        return (
            request.user.role in ["COACH", "COLLABORATOR", "MANAGER"]
            or request.user.is_superuser
        )


class IsCoachOrOwner(permissions.BasePermission):
    """
    Context-Aware Permission.
    Delegates to api.services.get_access_role to determine relationship.
    """

    def has_object_permission(self, request, view, obj):
        # 1. Resolve the "Real" Entity from the object (e.g. Log -> Skater)
        entity = obj
        if isinstance(obj, (Skater, Team, SynchroTeam)):
            entity = obj
        elif hasattr(obj, "skater") and obj.skater:
            entity = obj.skater
        elif hasattr(obj, "planning_entity") and obj.planning_entity:
            entity = obj.planning_entity
            if hasattr(entity, "skater"):
                entity = entity.skater  # Unwrap Singles/Dance
        elif hasattr(obj, "athlete_season") and obj.athlete_season:
            if obj.athlete_season.skater:
                entity = obj.athlete_season.skater
            elif obj.athlete_season.planning_entity:
                entity = obj.athlete_season.planning_entity

        # 2. Ask Service for Role
        role = get_access_role(request.user, entity)

        # No role? Deny.
        if not role:
            return False

        # 3. Apply Rules

        # DELETE: Only Owners/Coaches
        if request.method == "DELETE":
            return role in ["OWNER", "COACH"]

        # WRITE (POST/PUT/PATCH):
        if request.method in ["POST", "PUT", "PATCH"]:
            # Guardians/Skaters have limited write access (Logs/Goals/Injuries)
            if role in ["GUARDIAN", "OWNER"] and isinstance(
                obj, (SessionLog, InjuryLog, Goal, CompetitionResult, SkaterTest)
            ):
                return True  # Special exception for "Data Entry" models

            # Otherwise, standard Staff Write Access
            return role in ["OWNER", "COACH", "COLLABORATOR", "MANAGER"]

        # READ (GET): Everyone with a role (including OBSERVER/VIEWER/GUARDIAN)
        return True
