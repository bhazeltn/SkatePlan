from rest_framework import permissions
from .models import (
    PlanningEntityAccess,
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
    Allows access only to the Head Coach (Owner) or Collaborating Coaches.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.role in ["COACH", "COLLABORATOR"] or request.user.is_superuser
        )


class IsCoachOrOwner(permissions.BasePermission):
    """
    Allows access to:
    1. The Head Coach / Collaborator (Full Access)
    2. The Linked Athlete (Owner) (Full Access to own data)
    3. A Parent (Guardian) -> Read All, but Write ONLY to Logs, Goals, Injuries, Results.
    """

    def has_object_permission(self, request, view, obj):
        # 1. Coach / Admin / Collaborator (Always allow)
        if request.user.role in ["COACH", "COLLABORATOR"] or request.user.is_superuser:
            return True

        # --- RESOLVE THE "ACCESS OBJECT" (Skater/Team) ---
        target_entity = None

        # A. Direct Object
        if isinstance(obj, (Skater, Team, SynchroTeam)):
            target_entity = obj

        # B. Linked via 'skater' field
        elif hasattr(obj, "skater") and obj.skater:
            target_entity = obj.skater

        # C. Linked via 'athlete_season'
        elif hasattr(obj, "athlete_season") and obj.athlete_season:
            if obj.athlete_season.skater:
                target_entity = obj.athlete_season.skater
            elif obj.athlete_season.planning_entity:
                # Team Season
                target_entity = obj.athlete_season.planning_entity

        # D. Linked via 'planning_entity'
        elif hasattr(obj, "planning_entity") and obj.planning_entity:
            entity = obj.planning_entity
            if hasattr(entity, "skater") and entity.skater:
                target_entity = entity.skater
            elif isinstance(entity, (Team, SynchroTeam)):
                target_entity = entity

        # --- CHECK PERMISSIONS ON TARGET ---
        if target_entity:

            # 2. Check if User IS the Athlete (Owner)
            if (
                isinstance(target_entity, Skater)
                and target_entity.user_account == request.user
            ):
                # Skaters cannot delete usually, but let's allow them to delete their own logs for now if needed,
                # OR restrict DELETE here too if you prefer.
                # For now, we only restrict GUARDIANS from deleting below.
                return True

            # 3. Check Guardian / Access Table
            from django.contrib.contenttypes.models import ContentType

            ct = ContentType.objects.get_for_model(target_entity)

            access = PlanningEntityAccess.objects.filter(
                user=request.user, content_type=ct, object_id=target_entity.id
            ).first()

            if access:
                if access.access_level in ["COLLABORATOR", "MANAGER"]:
                    return True

                # GUARDIAN Logic
                if access.access_level == "GUARDIAN":
                    # Read is always allowed
                    if request.method in permissions.SAFE_METHODS:
                        return True

                    # BLOCK DELETE for Guardians
                    if request.method == "DELETE":
                        return False

                    # Write (POST/PATCH) allowed ONLY for specific models
                    if isinstance(
                        obj,
                        (SessionLog, InjuryLog, Goal, CompetitionResult, SkaterTest),
                    ):
                        return True

                    # Everything else is Read-Only
                    return False

        return False
