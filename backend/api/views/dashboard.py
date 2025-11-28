from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from datetime import date, timedelta

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
from api.serializers import SessionLogSerializer
from api.permissions import IsCoachUser, IsCoachOrOwner


# --- 1. COACH DASHBOARD AGGREGATOR ---
class CoachDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request):
        skaters = Skater.objects.all()
        today = date.today()
        next_week = today + timedelta(days=7)
        two_weeks = today + timedelta(days=14)

        # A. Injuries
        active_injuries = (
            InjuryLog.objects.filter(
                skater__in=skaters, recovery_status__in=["Active", "Recovering"]
            )
            .select_related("skater")
            .order_by("date_of_onset")
        )

        # B. Planning Alerts
        planning_alerts = []
        start_of_week = today - timedelta(days=today.weekday())

        for skater in skaters:
            if not skater.is_active:
                continue
            active_seasons = skater.athlete_seasons.filter(is_active=True)
            if not active_seasons.exists():
                continue

            for season in active_seasons:
                if not season.yearly_plans.exists():
                    planning_alerts.append(
                        {
                            "skater": skater.full_name,
                            "id": skater.id,
                            "issue": f"No Plan for {season.season}",
                        }
                    )
                else:
                    if (
                        season.start_date
                        and season.end_date
                        and not (season.start_date <= today <= season.end_date)
                    ):
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

        # C. Goals
        overdue_goals = Goal.objects.filter(
            target_date__lt=today,
            current_status__in=["IN_PROGRESS", "PENDING", "APPROVED"],
        ).order_by("target_date")[:10]
        due_soon_goals = Goal.objects.filter(
            target_date__range=(today, next_week),
            current_status__in=["IN_PROGRESS", "PENDING", "APPROVED"],
        ).order_by("target_date")[:10]

        def format_goals(goal_list):
            formatted = []
            for g in goal_list:
                name = "Unknown"
                link_id = ""
                link_type = "skater"
                if g.assignee_skater:
                    name = g.assignee_skater.full_name
                    link_id = g.assignee_skater.id
                elif g.planning_entity:
                    entity = g.planning_entity
                    if hasattr(entity, "skater"):
                        name = entity.skater.full_name
                        link_id = entity.skater.id
                    elif hasattr(entity, "team_name"):
                        name = entity.team_name
                        link_id = entity.id
                        link_type = "team" if isinstance(entity, Team) else "synchro"
                formatted.append(
                    {
                        "title": g.title,
                        "due": g.target_date,
                        "skater_name": name,
                        "link_id": link_id,
                        "link_type": link_type,
                    }
                )
            return formatted

        # D. Activity & Agenda
        three_days_ago = today - timedelta(days=3)

        recent_logs = (
            SessionLog.objects.filter(session_date__gte=three_days_ago)
            .select_related("athlete_season", "athlete_season__skater")
            .order_by("-session_date")[:15]
        )

        activity_data = []
        for log in recent_logs:
            season = log.athlete_season
            name = "Unknown"
            link = "#/"

            if season.skater:
                name = season.skater.full_name
                link = f"#/skater/{season.skater.id}?tab=logs"
            elif season.planning_entity:
                name = str(season.planning_entity)
                if isinstance(season.planning_entity, Team):
                    link = f"#/team/{season.planning_entity.id}?tab=logs"
                elif isinstance(season.planning_entity, SynchroTeam):
                    link = f"#/synchro/{season.planning_entity.id}?tab=logs"

            activity_data.append(
                {
                    "skater": name,
                    "link": link,
                    "type": "Session",
                    "date": log.session_date,
                    "rating": log.session_rating,
                }
            )

        upcoming_tests = (
            SkaterTest.objects.filter(
                test_date__range=(today, two_weeks), skater__in=skaters
            )
            .select_related("skater")
            .order_by("test_date")
        )
        upcoming_comps = Competition.objects.filter(
            start_date__range=(today, two_weeks)
        ).order_by("start_date")

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
            results = CompetitionResult.objects.filter(competition=c)
            attendees = set()
            for r in results:
                if r.planning_entity:
                    if hasattr(r.planning_entity, "skater"):
                        attendees.add(r.planning_entity.skater.full_name)
                    elif hasattr(r.planning_entity, "team_name"):
                        attendees.add(r.planning_entity.team_name)
            if attendees:
                agenda_items.append(
                    {
                        "type": "Competition",
                        "title": c.title,
                        "who": ", ".join(list(attendees)),
                        "date": c.start_date,
                    }
                )

        agenda_items.sort(key=lambda x: x["date"])

        return Response(
            {
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
                "activity": activity_data,
                "agenda": agenda_items,
            }
        )


# --- HELPER FOR STATS ---
def calculate_stats_response(all_results, total_sessions, season_name):
    def make_stat():
        return {"score": 0.0, "comp": "N/A", "date": None}

    stats = {"total": {"pb": make_stat(), "sb": make_stat()}, "segments": {}}

    today = date.today()
    start_year = today.year if today.month >= 7 else today.year - 1
    season_start = date(start_year, 7, 1)
    season_end = date(start_year + 1, 6, 30)

    history = []

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
            "volume": total_sessions,
            "season_name": season_name,
            "history": history,
        }
    )


# --- 2. SKATER STATS ---
class SkaterStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachOrOwner]

    def get(self, request, skater_id):
        skater = Skater.objects.get(id=skater_id)

        # Manual Permission Check
        self.check_object_permissions(request, skater)

        entity_ids = [
            e.id
            for e in list(skater.singles_entities.all())
            + list(skater.solodance_entities.all())
            + list(skater.teams_as_partner_a.all())
            + list(skater.teams_as_partner_b.all())
        ]

        all_results = (
            CompetitionResult.objects.filter(
                object_id__in=entity_ids, status=CompetitionResult.Status.COMPLETED
            )
            .select_related("competition")
            .order_by("competition__start_date")
        )

        active_seasons = AthleteSeason.objects.filter(skater=skater, is_active=True)
        total_sessions = SessionLog.objects.filter(
            athlete_season__in=active_seasons
        ).count()

        season_name = (
            active_seasons.last().season if active_seasons.exists() else "Current"
        )

        return calculate_stats_response(all_results, total_sessions, season_name)


# --- 3. TEAM STATS ---
class TeamStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
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

        total_sessions = SessionLog.objects.filter(
            content_type=ct, object_id=team_id
        ).count()

        return calculate_stats_response(all_results, total_sessions, "Current")


# --- 4. SYNCHRO STATS ---
class SynchroStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCoachUser]

    def get(self, request, team_id):
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

        total_sessions = SessionLog.objects.filter(
            content_type=ct, object_id=team_id
        ).count()

        return calculate_stats_response(all_results, total_sessions, "Current")
