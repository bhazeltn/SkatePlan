from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from api.models import PlanningEntityAccess, Skater, Team, SynchroTeam


def get_access_role(user, entity):
    """
    Determines the specific role (OWNER, COLLABORATOR, VIEWER, GUARDIAN, MANAGER)
    a user has on a specific entity (Skater/Team).
    """
    if not user or not user.is_authenticated:
        return None

    if user.is_superuser:
        return "COACH"

    # 1. Identity Check (Am I this skater?)
    if isinstance(entity, Skater) and entity.user_account == user:
        return "SKATER"

    # 2. Direct Access Check
    ct = ContentType.objects.get_for_model(entity)
    access = PlanningEntityAccess.objects.filter(
        user=user, content_type=ct, object_id=entity.id
    ).first()

    if access:
        return access.access_level

    # 3. Indirect Access (Synchro/Team Hierarchies)
    # If no direct link, check if I coach a team this skater is on.
    if isinstance(entity, Skater):
        # Check Teams (Pairs/Dance)
        team_ids = list(entity.teams_as_partner_a.values_list("id", flat=True)) + list(
            entity.teams_as_partner_b.values_list("id", flat=True)
        )

        if team_ids:
            ct_team = ContentType.objects.get_for_model(Team)
            team_access = PlanningEntityAccess.objects.filter(
                user=user, content_type=ct_team, object_id__in=team_ids
            ).first()
            if team_access:
                return team_access.access_level

        # Check Synchro
        synchro_ids = entity.synchro_teams.values_list("id", flat=True)
        if synchro_ids:
            ct_synchro = ContentType.objects.get_for_model(SynchroTeam)
            synchro_access = PlanningEntityAccess.objects.filter(
                user=user, content_type=ct_synchro, object_id__in=synchro_ids
            ).first()
            if synchro_access:
                return synchro_access.access_level

    return None


def get_accessible_skaters(user, filter_mode="ALL"):
    """
    Returns QuerySet of ALL skaters (Active + Archived).
    Sorted by Active First, then Name.
    """
    if user.role == "SKATER":
        # Skaters only see themselves (Active only? Or should they see archived self? Usually active)
        return Skater.objects.filter(user_account=user)

    query = PlanningEntityAccess.objects.filter(user=user)
    if filter_mode == "OPERATIONAL":
        query = query.exclude(access_level__in=["VIEWER", "OBSERVER"])

    skater_ids = set()
    for record in query:
        entity = record.planning_entity
        if not entity:
            continue

        if isinstance(entity, Skater):
            skater_ids.add(entity.id)
        elif hasattr(entity, "skater"):
            skater_ids.add(entity.skater.id)
        elif hasattr(entity, "partner_a"):
            skater_ids.add(entity.partner_a.id)
            skater_ids.add(entity.partner_b.id)
        elif hasattr(entity, "roster"):
            skater_ids.update(entity.roster.values_list("id", flat=True))

    if user.role == "COACH":
        linked = Skater.objects.filter(user_account=user).first()
        if linked:
            skater_ids.add(linked.id)

    # FIX: Removed is_active=True filter, added ordering
    return (
        Skater.objects.filter(id__in=skater_ids)
        .distinct()
        .order_by("-is_active", "full_name")
    )
