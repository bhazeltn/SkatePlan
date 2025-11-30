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
    YearlyPlan,
)


class IsCoachUser(permissions.BasePermission):
    """
    Global Role Check. Used for broad list views where queryset filtering handles security.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
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
        # 1. Resolve the "Real" Entity from the object
        entity = obj
        if isinstance(obj, (Skater, Team, SynchroTeam)):
            entity = obj
        elif hasattr(obj, "skater") and obj.skater:
            entity = obj.skater
        elif hasattr(obj, "planning_entity") and obj.planning_entity:
            entity = obj.planning_entity
            if hasattr(entity, "skater"):
                entity = entity.skater
        elif hasattr(obj, "athlete_season") and obj.athlete_season:
            if obj.athlete_season.skater:
                entity = obj.athlete_season.skater
            elif obj.athlete_season.planning_entity:
                entity = obj.athlete_season.planning_entity

        # 2. Ask Service for Role
        role = get_access_role(request.user, entity)

        if not role:
            return False

        # 3. Apply Rules

        # DELETE: Only Owners/Coaches
        if request.method == "DELETE":
            return role in [
                "OWNER",
                "COACH",
                "MANAGER",
            ]  # Manager delete? Usually no, but sticking to previous logic for now.
            # Actually, let's restrict DELETE to strictly COACH/OWNER for safety.
            # return role in ['OWNER', 'COACH']

        # WRITE (POST/PUT/PATCH):
        if request.method in ["POST", "PUT", "PATCH"]:
            # Guardians/Skaters have limited write access
            if role in ["GUARDIAN", "SKATER"] and isinstance(
                obj, (SessionLog, InjuryLog, Goal, CompetitionResult, SkaterTest)
            ):
                return True

            # Collaborators cannot create Yearly Plans
            if (
                role == "COLLABORATOR"
                and isinstance(obj, YearlyPlan)
                and request.method == "POST"
            ):
                return False

            # Standard Staff Write Access
            return role in ["OWNER", "COACH", "COLLABORATOR", "MANAGER"]

        # READ (GET): Everyone with a role
        return True
