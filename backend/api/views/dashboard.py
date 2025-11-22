from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Q
from datetime import date, timedelta
from django.contrib.contenttypes.models import ContentType

from api.models import (
    Skater,
    InjuryLog,
    Goal,
    SessionLog,
    SkaterTest,
    Competition,
    CompetitionResult,
    WeeklyPlan,
    AthleteSeason,
    SinglesEntity,
    SoloDanceEntity,
    Team,
    SynchroTeam,
)
from api.permissions import IsCoachUser


class CoachDashboardStatsView(APIView):
    """
    Aggregates "Air Traffic Control" data for the Coach's Dashboard.
    - Red Flags (Injuries, Missing Plans, Overdue Goals)
    - Recent Activity
    - Upcoming Agenda
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request):
        skaters = Skater.objects.all()
        today = date.today()
        next_week = today + timedelta(days=7)
        two_weeks = today + timedelta(days=14)

        # 1. HEALTH (Injuries)
        active_injuries = (
            InjuryLog.objects.filter(
                skater__in=skaters, recovery_status__in=["Active", "Recovering"]
            )
            .select_related("skater")
            .order_by("date_of_onset")
        )

        # 2. PLANNING ALERTS
        planning_alerts = []
        start_of_week = today - timedelta(days=today.weekday())

        for skater in skaters:
            if not skater.is_active:
                continue

            # CHANGED: Fetch ALL active seasons, not just the last one
            active_seasons = skater.athlete_seasons.filter(is_active=True)

            if not active_seasons.exists():
                # Optional: Warn if NO active season exists at all?
                # planning_alerts.append({ ... "No Active Season" ... })
                continue

            for season in active_seasons:
                # Check A: Yearly Plan
                if not season.yearly_plans.exists():
                    planning_alerts.append(
                        {
                            "skater": skater.full_name,
                            "id": skater.id,
                            "issue": f"No Plan for {season.season}",  # Detailed message
                        }
                    )
                else:
                    # Check B: Weekly Plan (Only if within date range)
                    # If today is outside this season's dates, don't nag about weekly plans
                    if season.start_date and season.end_date:
                        if not (season.start_date <= today <= season.end_date):
                            continue

                    current_week = WeeklyPlan.objects.filter(
                        athlete_season=season, week_start=start_of_week
                    ).first()

                    if not current_week or not current_week.theme:
                        planning_alerts.append(
                            {
                                "skater": skater.full_name,
                                "id": skater.id,
                                "issue": f"Unplanned Week ({season.season})",
                            }
                        )

        # 3. GOALS
        # To find goals relevant to these skaters, we need their Entity IDs
        # Simplified for MVP: Fetch all active goals and filter in Python or simple query
        # assuming coach has access to all goals.
        overdue_goals = Goal.objects.filter(
            target_date__lt=today,
            current_status__in=["IN_PROGRESS", "PENDING", "APPROVED"],
        ).order_by("target_date")[:10]

        due_soon_goals = Goal.objects.filter(
            target_date__range=(today, next_week),
            current_status__in=["IN_PROGRESS", "PENDING", "APPROVED"],
        ).order_by("target_date")[:10]

        # Helper to format goal list
        def format_goals(goal_list):
            formatted = []
            for g in goal_list:
                # Try to resolve skater name from the generic relationship
                skater_name = "Unknown"
                skater_id = ""

                # Try direct link first
                if g.assignee_skater:
                    skater_name = g.assignee_skater.full_name
                    skater_id = g.assignee_skater.id
                elif g.planning_entity:
                    # Try to resolve via Entity
                    entity = g.planning_entity
                    if hasattr(entity, "skater"):
                        skater_name = entity.skater.full_name
                        skater_id = entity.skater.id
                    elif hasattr(entity, "team_name"):
                        skater_name = entity.team_name  # Team Goal
                        # For ID, maybe link to partner_a? Or leave blank.
                        if hasattr(entity, "partner_a"):
                            skater_id = entity.partner_a.id

                formatted.append(
                    {
                        "title": g.title,
                        "due": g.target_date,
                        "skater_name": skater_name,
                        "skater_id": skater_id,
                    }
                )
            return formatted

        # 4. RECENT ACTIVITY
        three_days_ago = today - timedelta(days=3)
        recent_logs = (
            SessionLog.objects.filter(session_date__gte=three_days_ago)
            .select_related("athlete_season__skater")
            .order_by("-session_date")[:10]
        )

        # 5. AGENDA
        upcoming_tests = (
            SkaterTest.objects.filter(test_date__range=(today, two_weeks))
            .select_related("skater")
            .order_by("test_date")
        )

        upcoming_comps = Competition.objects.filter(
            start_date__range=(today, two_weeks)
        ).order_by("start_date")

        # Build Agenda List
        agenda_items = []
        for t in upcoming_tests:
            agenda_items.append(
                {
                    "type": "Test",
                    "title": t.test_name,
                    "who": t.skater.full_name,
                    "date": t.test_date,
                    "skater_id": t.skater.id,
                }
            )

        for c in upcoming_comps:
            # Find who is attending this comp
            attendees = set()
            # Find results for this comp
            results = CompetitionResult.objects.filter(competition=c)
            for r in results:
                entity = r.planning_entity
                if entity:
                    if hasattr(entity, "skater"):
                        attendees.add(entity.skater.full_name)
                    elif hasattr(entity, "team_name"):
                        attendees.add(entity.team_name)

            agenda_items.append(
                {
                    "type": "Competition",
                    "title": c.title,
                    "who": ", ".join(list(attendees)) if attendees else "Global Event",
                    "date": c.start_date,
                    "is_group": True,
                }
            )

        agenda_items.sort(key=lambda x: x["date"])

        # 6. CONSTRUCT RESPONSE
        data = {
            "red_flags": {
                "injuries": [
                    {
                        "skater": i.skater.full_name,
                        "skater_id": i.skater.id,
                        "injury": i.injury_type,
                        "status": i.recovery_status,
                        "date": i.date_of_onset,
                    }
                    for i in active_injuries
                ],
                "planning": planning_alerts,
                "overdue_goals": format_goals(overdue_goals),
                "due_soon_goals": format_goals(due_soon_goals),
            },
            "activity": [
                {
                    "skater": l.athlete_season.skater.full_name,
                    "skater_id": l.athlete_season.skater.id,
                    "type": "Session",
                    "date": l.session_date,
                    "rating": l.session_rating,
                }
                for l in recent_logs
            ],
            "agenda": agenda_items,
        }

        return Response(data)


class SkaterStatsView(APIView):
    """
    Returns calculated statistics for a skater:
    - PB/SB Snapshots
    - Time-Series History (for Charts)
    - Segment Breakdowns
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)

        # 1. Find all completed results
        entity_ids = []
        for e in skater.singles_entities.all():
            entity_ids.append(e.id)
        for e in skater.solodance_entities.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_a.all():
            entity_ids.append(e.id)
        for e in skater.teams_as_partner_b.all():
            entity_ids.append(e.id)

        all_results = (
            CompetitionResult.objects.filter(
                object_id__in=entity_ids, status=CompetitionResult.Status.COMPLETED
            )
            .select_related("competition")
            .order_by("competition__start_date")
        )

        # 2. Active Season Context
        active_season = AthleteSeason.objects.filter(
            skater=skater, is_active=True
        ).last()
        season_start = active_season.start_date if active_season else None
        season_end = active_season.end_date if active_season else None

        # 3. Stats Containers
        def make_stat():
            return {"score": 0.0, "comp": "N/A", "date": None}

        stats = {"total": {"pb": make_stat(), "sb": make_stat()}, "segments": {}}

        # --- NEW: HISTORY LIST FOR CHARTS ---
        history = []

        for res in all_results:
            # A. Calculations
            total_tes = 0.0
            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    total_tes += float(seg.get("tes") or 0)

            # Use the snapshot BV we just added to the model
            planned_bv = float(res.planned_base_value or 0)
            total_score = float(res.total_score or 0)

            # B. Add to History (Chronological)
            history.append(
                {
                    "date": res.competition.start_date,
                    "name": res.competition.title,
                    "total_score": total_score,
                    "tes": total_tes,
                    "planned_bv": planned_bv,
                    # Rough PCS calculation (Total - TES - Deductions if we had them separate)
                    # For charting purposes, Total - TES is close enough to PCS+Ded
                    "pcs_approx": total_score - total_tes,
                }
            )

            # C. PB/SB Logic (Existing)
            is_current_season = False
            if season_start and season_end:
                if season_start <= res.competition.start_date <= season_end:
                    is_current_season = True

            comp_name = res.competition.title
            comp_date = res.competition.start_date

            if total_score > stats["total"]["pb"]["score"]:
                stats["total"]["pb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }
            if is_current_season and total_score > stats["total"]["sb"]["score"]:
                stats["total"]["sb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }

            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    name = seg.get("name", "Unknown Segment")
                    if name not in stats["segments"]:
                        stats["segments"][name] = {
                            "total": {"pb": make_stat(), "sb": make_stat()},
                            "tes": {"pb": make_stat(), "sb": make_stat()},
                            "pcs": {"pb": make_stat(), "sb": make_stat()},
                        }

                    bucket = stats["segments"][name]
                    s_score = float(seg.get("score") or 0)
                    s_tes = float(seg.get("tes") or 0)
                    s_pcs = float(seg.get("pcs") or 0)

                    if s_score > bucket["total"]["pb"]["score"]:
                        bucket["total"]["pb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_score > bucket["total"]["sb"]["score"]:
                        bucket["total"]["sb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }

                    if s_tes > bucket["tes"]["pb"]["score"]:
                        bucket["tes"]["pb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_tes > bucket["tes"]["sb"]["score"]:
                        bucket["tes"]["sb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }

                    if s_pcs > bucket["pcs"]["pb"]["score"]:
                        bucket["pcs"]["pb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current_season and s_pcs > bucket["pcs"]["sb"]["score"]:
                        bucket["pcs"]["sb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }

        total_sessions = (
            SessionLog.objects.filter(athlete_season=active_season).count()
            if active_season
            else 0
        )

        return Response(
            {
                "overall": stats["total"],
                "segments": stats["segments"],
                "volume": total_sessions,
                "season_name": active_season.season if active_season else "None",
                "history": history,
            }
        )


class TeamStatsView(APIView):
    """
    Calculates PB/SB for a specific Team.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
        # 1. Find Results
        ct = ContentType.objects.get_for_model(Team)
        all_results = (
            CompetitionResult.objects.filter(
                content_type=ct,
                object_id=team_id,
                status=CompetitionResult.Status.COMPLETED,
            )
            .select_related("competition")
            .order_by("competition__start_date")
        )

        # 2. Setup Containers
        def make_stat():
            return {"score": 0.0, "comp": "N/A", "date": None}

        stats = {"total": {"pb": make_stat(), "sb": make_stat()}, "segments": {}}

        # Current Season Logic (Simple Year-Based)
        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_start = date(start_year, 7, 1)
        season_end = date(start_year + 1, 6, 30)

        history = []

        # 3. Iterate Safely
        for res in all_results:
            comp_name = res.competition.title
            comp_date = res.competition.start_date

            total_tes = 0.0
            # Safe JSON iteration
            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    total_tes += float(seg.get("tes") or 0)

            planned_bv = float(res.planned_base_value or 0)
            total_score = float(res.total_score or 0)

            history.append(
                {
                    "date": comp_date,
                    "name": comp_name,
                    "total_score": total_score,
                    "tes": total_tes,
                    "planned_bv": planned_bv,
                    "pcs_approx": total_score - total_tes,
                }
            )

            is_current = season_start <= comp_date <= season_end

            # Update Totals
            if total_score > stats["total"]["pb"]["score"]:
                stats["total"]["pb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }
            if is_current and total_score > stats["total"]["sb"]["score"]:
                stats["total"]["sb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }

            # Update Segments
            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    name = seg.get("name", "Unknown")

                    if name not in stats["segments"]:
                        stats["segments"][name] = {
                            "total": {"pb": make_stat(), "sb": make_stat()},
                            "tes": {"pb": make_stat(), "sb": make_stat()},
                            "pcs": {"pb": make_stat(), "sb": make_stat()},
                        }
                    bucket = stats["segments"][name]

                    s_score = float(seg.get("score") or 0)
                    s_tes = float(seg.get("tes") or 0)
                    s_pcs = float(seg.get("pcs") or 0)

                    # Segment Total
                    if s_score > bucket["total"]["pb"]["score"]:
                        bucket["total"]["pb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current and s_score > bucket["total"]["sb"]["score"]:
                        bucket["total"]["sb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }

        return Response(
            {
                "overall": stats["total"],
                "segments": stats["segments"],
                "volume": 0,
                "season_name": f"{start_year}-{start_year+1}",
                "history": history,
            }
        )


class SynchroStatsView(APIView):
    """
    Calculates PB/SB for a specific Synchro Team.
    """

    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
        # 1. Find Results for this Synchro Team
        ct = ContentType.objects.get_for_model(SynchroTeam)
        all_results = (
            CompetitionResult.objects.filter(
                content_type=ct,
                object_id=team_id,
                status=CompetitionResult.Status.COMPLETED,
            )
            .select_related("competition")
            .order_by("competition__start_date")
        )

        # 2. Setup Containers
        def make_stat():
            return {"score": 0.0, "comp": "N/A", "date": None}

        stats = {"total": {"pb": make_stat(), "sb": make_stat()}, "segments": {}}

        today = date.today()
        start_year = today.year if today.month >= 7 else today.year - 1
        season_start = date(start_year, 7, 1)
        season_end = date(start_year + 1, 6, 30)

        history = []

        # 3. Iterate
        for res in all_results:
            comp_name = res.competition.title
            comp_date = res.competition.start_date

            total_tes = 0.0
            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    total_tes += float(seg.get("tes") or 0)

            planned_bv = float(res.planned_base_value or 0)
            total_score = float(res.total_score or 0)

            history.append(
                {
                    "date": comp_date,
                    "name": comp_name,
                    "total_score": total_score,
                    "tes": total_tes,
                    "planned_bv": planned_bv,
                    "pcs_approx": total_score - total_tes,
                }
            )

            is_current = season_start <= comp_date <= season_end

            if total_score > stats["total"]["pb"]["score"]:
                stats["total"]["pb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }
            if is_current and total_score > stats["total"]["sb"]["score"]:
                stats["total"]["sb"] = {
                    "score": total_score,
                    "comp": comp_name,
                    "date": comp_date,
                }

            if res.segment_scores and isinstance(res.segment_scores, list):
                for seg in res.segment_scores:
                    name = seg.get("name", "Unknown")
                    if name not in stats["segments"]:
                        stats["segments"][name] = {
                            "total": {"pb": make_stat(), "sb": make_stat()},
                            "tes": {"pb": make_stat(), "sb": make_stat()},
                            "pcs": {"pb": make_stat(), "sb": make_stat()},
                        }
                    bucket = stats["segments"][name]
                    s_score = float(seg.get("score") or 0)
                    s_tes = float(seg.get("tes") or 0)
                    s_pcs = float(seg.get("pcs") or 0)

                    if s_score > bucket["total"]["pb"]["score"]:
                        bucket["total"]["pb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current and s_score > bucket["total"]["sb"]["score"]:
                        bucket["total"]["sb"] = {
                            "score": s_score,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if s_tes > bucket["tes"]["pb"]["score"]:
                        bucket["tes"]["pb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current and s_tes > bucket["tes"]["sb"]["score"]:
                        bucket["tes"]["sb"] = {
                            "score": s_tes,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if s_pcs > bucket["pcs"]["pb"]["score"]:
                        bucket["pcs"]["pb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }
                    if is_current and s_pcs > bucket["pcs"]["sb"]["score"]:
                        bucket["pcs"]["sb"] = {
                            "score": s_pcs,
                            "comp": comp_name,
                            "date": comp_date,
                        }

        return Response(
            {
                "overall": stats["total"],
                "segments": stats["segments"],
                "volume": 0,
                "season_name": f"{start_year}-{start_year+1}",
                "history": history,
            }
        )
