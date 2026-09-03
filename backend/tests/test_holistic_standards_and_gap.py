"""Holistic development standards + deterministic gap analysis tests (Sprint 5).

Canonical pillar enum: 'technical','skating_skills','physical','mental'.
Status mapping: auto_data measured>=target => 'met'; measured<target => 'developing';
no data => 'not_started'. Rubric 'acquired'/'mastered' => 'met'; 'developing' =>
'developing'; none/'not_started' => 'not_started'.
"""
from app.models.enums import SystemRole


def _login(client, email, password="Secret123!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _standard_payload():
    return {
        "name": "Senior LTD Standard",
        "framework_type": "LTD",
        "description": "Holistic senior benchmark",
        "benchmarks": [
            {"title": "3Lz clean rate", "pillar": "technical",
             "evaluation_mode": "auto_data", "target_metric_code": "clean_rate:3Lz",
             "target_value": 80},
            {"title": "Deep edges", "pillar": "skating_skills",
             "evaluation_mode": "rubric", "rubric_criteria": "Edge depth & control"},
            {"title": "Core strength", "pillar": "physical",
             "evaluation_mode": "rubric", "rubric_criteria": "Plank 2 min"},
            {"title": "Focus routine", "pillar": "mental",
             "evaluation_mode": "rubric", "rubric_criteria": "Pre-skate routine"},
        ],
    }


def _seed_attempts(client, token, skater_id):
    sid = client.post("/api/sessions", headers=_hdr(token),
                      json={"skater_id": skater_id, "session_date": "2026-01-10",
                            "session_type": "on_ice", "duration_minutes": 60, "rpe": 6}
                      ).json()["id"]
    client.post(f"/api/sessions/{sid}/attempts", headers=_hdr(token),
                json=[{"element_code": "3Lz", "outcome": "clean", "attempts_count": 3},
                      {"element_code": "3Lz", "outcome": "fall", "attempts_count": 2}])


def test_create_standard_with_all_pillars(client, make_user, db):
    make_user("stdadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "stdadmin@ex.com")
    resp = client.post("/api/standards", headers=_hdr(token), json=_standard_payload())
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert {b["pillar"] for b in body["benchmarks"]} == {
        "technical", "skating_skills", "physical", "mental"}


def test_gap_analysis_grouped_by_pillar(client, make_user, db):
    skater = make_user("gapskater@ex.com", role=SystemRole.athlete)
    make_user("gapadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "gapadmin@ex.com")

    std = client.post("/api/standards", headers=_hdr(token), json=_standard_payload()).json()
    assign = client.put(f"/api/skaters/{skater.id}/target-standard", headers=_hdr(token),
                        json={"target_standard_id": std["id"]})
    assert assign.status_code == 200, assign.text

    _seed_attempts(client, token, skater.id)  # 3 clean / 5 total -> 60.0% for 3Lz

    ss_bench = next(b for b in std["benchmarks"] if b["pillar"] == "skating_skills")
    a = client.post(f"/api/skaters/{skater.id}/assessments", headers=_hdr(token),
                    json={"benchmark_id": ss_bench["id"], "status": "acquired",
                          "score": 4.0, "notes": "Strong edges"})
    assert a.status_code in (200, 201), a.text

    resp = client.get(f"/api/skaters/{skater.id}/gap-analysis", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    pillars = resp.json()["pillars"]
    assert set(pillars.keys()) == {"technical", "skating_skills", "physical", "mental"}

    tech = pillars["technical"][0]
    assert tech["evaluation_mode"] == "auto_data"
    assert tech["measured"] == 60.0
    assert tech["target"] == 80.0
    assert tech["status"] == "developing"
    assert tech["delta"] == -20.0

    ss = pillars["skating_skills"][0]
    assert ss["evaluation_mode"] == "rubric"
    assert ss["status"] == "met"

    assert pillars["physical"][0]["status"] == "not_started"
    assert pillars["mental"][0]["status"] == "not_started"
