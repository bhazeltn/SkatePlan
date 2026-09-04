"""Coach Action & Risk Hub dashboard aggregation tests (read-only endpoint)."""
from datetime import date, datetime, timedelta

from app.models.competition import Competition, CompetitionEntry
from app.models.enums import RoleInUnit, SystemRole
from app.models.program import Program
from app.models.standard import (
    DevelopmentStandard,
    SkaterBenchmarkAssessment,
    StandardBenchmark,
)
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _roster(client, make_user, db, s_email, c_email, first="Ava", last="Nguyen"):
    skater = make_user(s_email, role=SystemRole.athlete, first=first, last=last)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=date(2005, 1, 1),
                         home_club="Glacier FSC"))
    coach = make_user(c_email, password="Coach123!", role=SystemRole.coach)
    unit = TrainingUnit(unit_name="Unit", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(CoachAssignment(coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
                           role_in_unit=RoleInUnit.primary))
    db.commit()
    return skater, coach


def test_empty_dashboard_for_coach_without_roster(client, make_user, db):
    make_user("emptyc@ex.com", password="Coach123!", role=SystemRole.coach)
    token = _login(client, "emptyc@ex.com", "Coach123!")
    resp = client.get("/api/dashboard", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["roster"] == []
    assert body["restrictions"] == []
    assert body["upcoming_competitions"] == []


def test_dashboard_requires_auth(client):
    resp = client.get("/api/dashboard")
    assert resp.status_code == 401


def test_active_injury_appears_in_restrictions_and_roster(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "injs@ex.com", "injc@ex.com")
    token = _login(client, "injc@ex.com", "Coach123!")
    client.post("/api/injuries", headers=_hdr(token), json={
        "skater_id": skater.id, "title": "Ankle sprain", "body_part": "ankle",
        "onset_date": "2026-01-10", "status": "active",
        "restrictions": "Triple jump restriction / No impact landing",
    })
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    assert len(body["restrictions"]) == 1
    r = body["restrictions"][0]
    assert r["skater_name"] == "Ava Nguyen"
    assert "Triple jump" in r["restrictions"]
    assert r["status"] == "active"
    roster_ids = {s["skater_id"]: s for s in body["roster"]}
    assert roster_ids[skater.id]["has_active_restriction"] is True


def test_missing_plan_alert_when_no_programs(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "mps@ex.com", "mpc@ex.com")
    token = _login(client, "mpc@ex.com", "Coach123!")
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    alerts = [a for a in body["alerts"] if a["kind"] == "missing_plan"]
    assert len(alerts) == 1
    assert "Short/Free layout" in alerts[0]["message"]


def test_no_missing_plan_alert_when_both_layouts_present(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "cps@ex.com", "cpc@ex.com")
    token = _login(client, "cpc@ex.com", "Coach123!")
    db.add(Program(skater_id=skater.id, program_type="SP", title="SP"))
    db.add(Program(skater_id=skater.id, program_type="FS", title="FS"))
    db.commit()
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    assert [a for a in body["alerts"] if a["kind"] == "missing_plan"] == []


def test_at_risk_alert_when_benchmark_behind(client, make_user, db):
    skater, coach = _roster(client, make_user, db, "ars@ex.com", "arc@ex.com")
    token = _login(client, "arc@ex.com", "Coach123!")
    std = DevelopmentStandard(name="Axel", coach_id=coach.id)
    db.add(std)
    db.flush()
    db.add(StandardBenchmark(standard_id=std.id, title="Axel", pillar="technical",
                             evaluation_mode="rubric"))
    profile = db.get(SkaterProfile, skater.id)
    profile.target_standard_id = std.id
    # Give both layouts so the only alert is at_risk.
    db.add(Program(skater_id=skater.id, program_type="SP", title="SP"))
    db.add(Program(skater_id=skater.id, program_type="FS", title="FS"))
    db.commit()
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    at_risk = [a for a in body["alerts"] if a["kind"] == "at_risk_goal"]
    assert len(at_risk) == 1
    assert "behind schedule" in at_risk[0]["message"]


def test_acquired_benchmark_not_at_risk(client, make_user, db):
    skater, coach = _roster(client, make_user, db, "oks@ex.com", "okc@ex.com")
    token = _login(client, "okc@ex.com", "Coach123!")
    std = DevelopmentStandard(name="Axel", coach_id=coach.id)
    db.add(std)
    db.flush()
    bench = StandardBenchmark(standard_id=std.id, title="Axel", pillar="technical",
                              evaluation_mode="rubric")
    db.add(bench)
    db.flush()
    db.add(SkaterBenchmarkAssessment(skater_id=skater.id, benchmark_id=bench.id,
                                     status="mastered", assessed_at=datetime.utcnow()))
    profile = db.get(SkaterProfile, skater.id)
    profile.target_standard_id = std.id
    db.commit()
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    assert [a for a in body["alerts"] if a["kind"] == "at_risk_goal"] == []


def test_upcoming_competition_filtered_and_sorted(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "ucs@ex.com", "ucc@ex.com")
    token = _login(client, "ucc@ex.com", "Coach123!")
    today = date.today()
    later = Competition(name="Winter Open", start_date=today + timedelta(days=60))
    sooner = Competition(name="Autumn Classic", start_date=today + timedelta(days=20))
    past = Competition(name="Old Meet", start_date=today - timedelta(days=5))
    db.add_all([later, sooner, past])
    db.flush()
    db.add(CompetitionEntry(competition_id=later.id, skater_id=skater.id,
                            status="prospective"))
    db.add(CompetitionEntry(competition_id=sooner.id, skater_id=skater.id,
                            status="confirmed"))
    # Excluded: only-registered entry and a past competition.
    db.add(CompetitionEntry(competition_id=past.id, skater_id=skater.id,
                            status="confirmed"))
    db.commit()
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    comps = body["upcoming_competitions"]
    assert [c["name"] for c in comps] == ["Autumn Classic", "Winter Open"]
    assert comps[0]["entry_status"] == "confirmed"


def test_registered_entry_excluded_from_upcoming(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "res@ex.com", "rec@ex.com")
    token = _login(client, "rec@ex.com", "Coach123!")
    comp = Competition(name="Reg Only", start_date=date.today() + timedelta(days=30))
    db.add(comp)
    db.flush()
    db.add(CompetitionEntry(competition_id=comp.id, skater_id=skater.id,
                            status="registered"))
    db.commit()
    body = client.get("/api/dashboard", headers=_hdr(token)).json()
    assert body["upcoming_competitions"] == []
