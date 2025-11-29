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
    YearlyPlan,
)


class IsCoachUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.role in ["COACH", "COLLABORATOR"] or request.user.is_superuser
        )


class IsCoachOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        # --- RESOLVE TARGET ENTITY ---
        target_entity = None
        if isinstance(obj, (Skater, Team, SynchroTeam)):
            target_entity = obj
        elif hasattr(obj, "skater") and obj.skater:
            target_entity = obj.skater
        elif hasattr(obj, "athlete_season") and obj.athlete_season:
            if obj.athlete_season.skater:
                target_entity = obj.athlete_season.skater
            elif obj.athlete_season.planning_entity:
                target_entity = obj.athlete_season.planning_entity
        elif hasattr(obj, "planning_entity") and obj.planning_entity:
            entity = obj.planning_entity
            if hasattr(entity, "skater") and entity.skater:
                target_entity = entity.skater
            elif isinstance(entity, (Team, SynchroTeam)):
                target_entity = entity

        if not target_entity:
            return False

        # --- PERMISSION CHECKS ---
        if (
            isinstance(target_entity, Skater)
            and target_entity.user_account == request.user
        ):
            if isinstance(obj, Skater) and request.method == "DELETE":
                return False
            return True

        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(target_entity)

        access = PlanningEntityAccess.objects.filter(
            user=request.user, content_type=ct, object_id=target_entity.id
        ).first()

        if access:
            level = access.access_level

            # 1. OWNER / MANAGER (Full Access)
            if level in ["COACH", "MANAGER", "OWNER"]:
                return True

            # 2. COLLABORATOR (Edit, No Delete, No YTP Create)
            if level == "COLLABORATOR":
                if request.method == "DELETE":
                    return False

                # Explicitly block creating Yearly Plans (POST)
                # (Note: Creation is often handled in the View, but this protects object-level ops)
                if isinstance(obj, YearlyPlan) and request.method == "POST":
                    return False

                return True

            # 3. GUARDIAN / VIEWER (Read Only + Specific Write)
            if level in ["GUARDIAN", "VIEWER", "OBSERVER"]:
                if request.method in permissions.SAFE_METHODS:
                    return True

                if level == "GUARDIAN" and isinstance(
                    obj, (SessionLog, InjuryLog, Goal, CompetitionResult, SkaterTest)
                ):
                    if request.method == "DELETE":
                        return False
                    return True

                return False

        return False
