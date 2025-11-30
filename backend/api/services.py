from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from api.models import PlanningEntityAccess, Skater, Team, SynchroTeam


def get_access_role(user, entity):
    """
    Determines the specific role (OWNER, COLLABORATOR, VIEWER, GUARDIAN, MANAGER)
    a user has on a specific entity.
    """
    if not user or not user.is_authenticated:
        return None

    if user.is_superuser:
        return "OWNER"

    # 1. Identity Check (Am I this skater?)
    if isinstance(entity, Skater) and entity.user_account == user:
        return "OWNER"  # Skaters own their own profile data

    # 2. Direct Access Check (The most common path)
    ct = ContentType.objects.get_for_model(entity)
    access = PlanningEntityAccess.objects.filter(
        user=user, content_type=ct, object_id=entity.id
    ).first()

    if access:
        return access.access_level

    # 3. Indirect Access (Synchro/Team Hierarchies)
    # If I am a coach/manager of a Team, do I get access to the Skater?
    # Current decision: NO. Access must be explicit.
    # Use 'Invite Staff' on the Skater profile to give access to a specific skater.
    # However, for reading "My Skaters" list, we might infer it,
    # but for "Editing a Skater", we require a direct link.

    return None


def get_accessible_skaters(user):
    """
    Returns a QuerySet of ALL skaters a user can view.
    Unifies:
    1. Skaters I am (Identity)
    2. Skaters I coach/manage (Direct Access)
    3. Skaters on Teams I coach/manage (Indirect Access - Roster View)
    """
    if user.role == "SKATER":
        # Skaters primarily see themselves
        # If we add "Skaters seeing teammates", we'd add that logic here.
        return Skater.objects.filter(user_account=user, is_active=True)

    # Staff/Guardians see via Access Grants
    skater_ids = set()

    # 1. Direct Grants (Skater Profile Access)
    access_records = PlanningEntityAccess.objects.filter(user=user)
    for record in access_records:
        entity = record.planning_entity
        if not entity:
            continue

        if isinstance(entity, Skater):
            skater_ids.add(entity.id)
        elif hasattr(entity, "skater"):  # Wrapper entities
            skater_ids.add(entity.skater.id)
        elif hasattr(entity, "partner_a"):  # Pair Team
            skater_ids.add(entity.partner_a.id)
            skater_ids.add(entity.partner_b.id)
        elif hasattr(entity, "roster"):  # Synchro Team
            skater_ids.update(entity.roster.values_list("id", flat=True))

    return Skater.objects.filter(id__in=skater_ids, is_active=True).distinct()


def can_edit_entity(user, entity):
    """
    General 'Write' permission.
    Owners, Coaches, Collaborators, and Managers can usually edit *something*.
    Specific field restrictions (e.g. Manager can't edit Plan) happen in Serializers/Views.
    """
    role = get_access_role(user, entity)
    return role in ["OWNER", "COACH", "COLLABORATOR", "MANAGER"]


def can_delete_entity(user, entity):
    """
    Destructive permission. Strict.
    """
    role = get_access_role(user, entity)
    return role in ["OWNER", "COACH"]  # Managers/Collaborators CANNOT delete


def is_observer(user, entity):
    role = get_access_role(user, entity)
    return role in ["VIEWER", "OBSERVER"]
