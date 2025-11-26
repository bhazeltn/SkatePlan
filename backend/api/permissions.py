from rest_framework import permissions
from .models import PlanningEntityAccess, Skater, Team, SynchroTeam


class IsCoachUser(permissions.BasePermission):
    """
    Allows access only to the Head Coach (Owner) or Collaborating Coaches.
    """

    def has_permission(self, request, view):
        # Check if user is logged in
        if not request.user or not request.user.is_authenticated:
            return False

        # Check role (COACH or COLLABORATOR)
        # Also allow Superusers (Admins) for now
        return (
            request.user.role in ["COACH", "COLLABORATOR"] or request.user.is_superuser
        )


class IsCoachOrOwner(permissions.BasePermission):
    """
    Allows access to:
    1. The Head Coach / Collaborator
    2. The Linked Athlete (Owner of the data)
    3. A Parent (via PlanningEntityAccess)
    """

    def has_object_permission(self, request, view, obj):
        # 1. Coach / Admin / Collaborator
        if request.user.role in ["COACH", "COLLABORATOR"] or request.user.is_superuser:
            return True

        # 2. The Athlete Themselves
        skater = None
        if isinstance(obj, Skater):
            skater = obj
        elif hasattr(obj, "skater"):
            skater = obj.skater
        elif hasattr(obj, "athlete_season") and obj.athlete_season.skater:
            skater = obj.athlete_season.skater

        if skater and skater.user_account == request.user:
            return True

        # 3. Check PlanningEntityAccess (Parents, Managers)
        target_entity = None
        if isinstance(obj, (Skater, Team, SynchroTeam)):
            target_entity = obj
        elif hasattr(obj, "planning_entity"):
            target_entity = obj.planning_entity

        if target_entity:
            from django.contrib.contenttypes.models import ContentType

            ct = ContentType.objects.get_for_model(target_entity)

            access = PlanningEntityAccess.objects.filter(
                user=request.user, content_type=ct, object_id=target_entity.id
            ).first()

            if access:
                # Viewers (Parents) can only READ
                if request.method in permissions.SAFE_METHODS:
                    return True

                # Managers can WRITE
                if access.access_level in ["COLLABORATOR", "MANAGER"]:
                    return True

                return False

        return False
