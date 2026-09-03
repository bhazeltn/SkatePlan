"""Protocol tracking: results, protocol readback, planned-vs-executed comparison."""
from app.models.enums import SystemRole


def _coach_token(client, make_user):
    make_user("pcoach@ex.com", password="Coach123!", role=SystemRole.coach)
    r = client.post("/api/auth/login", json={"email": "pcoach@ex.com", "password": "Coach123!"})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _make_program(client, token, skater_id):
    resp = client.post(
        "/api/programs",
        headers=_hdr(token),
        json={
            "skater_id": skater_id,
            "program_type": "FS",
            "title": "Protocol FS",
            "program_elements": [
                {"segment_order": 1, "element_code": "3Lz+3T",
                 "is_second_half_bonus": False, "element_bonus": 0.0},
                {"segment_order": 2, "element_code": "2A",
                 "is_second_half_bonus": False, "element_bonus": 0.0},
            ],
        },
    )
    return resp.json()["id"]


def _make_entry(client, token, make_user):
    skater = make_user("protoskater@ex.com", role=SystemRole.athlete)
    comp = client.post(
        "/api/competitions", headers=_hdr(token),
        json={"name": "Protocol Cup", "start_date": "2025-12-01",
              "end_date": "2025-12-03", "city": "Ottawa", "country": "Canada",
              "season": "2025-26"},
    ).json()
    fs_pid = _make_program(client, token, skater.id)
    entry = client.post(
        f"/api/competitions/{comp['id']}/entries", headers=_hdr(token),
        json={"skater_id": skater.id, "fs_program_id": fs_pid},
    ).json()
    return entry["id"]


def _result_payload():
    return {
        "segment": "FS",
        "tes": 55.50,
        "pcs": 48.20,
        "deductions": 1.0,
        "segment_bonus": 0.0,
        "segment_rank": 2,
        "overall_rank": 3,
        "executed_elements": [
            {"segment_order": 1, "called_code": "3Lz+3T",
             "base_value": 10.10, "goe": 1.20, "info_flags": "q"},
            {"segment_order": 2, "called_code": "2A<",
             "base_value": 2.64, "goe": -0.50, "info_flags": "<"},
        ],
    }


def test_post_results_computes_tss(client, make_user, db):
    token = _coach_token(client, make_user)
    entry_id = _make_entry(client, token, make_user)
    resp = client.post(
        f"/api/competitions/entries/{entry_id}/results",
        headers=_hdr(token), json=_result_payload(),
    )
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    # TSS = TES + PCS - deductions + segment_bonus = 55.50 + 48.20 - 1.0 + 0.0
    assert body["tss"] == 102.70


def test_get_protocol_returns_full_record(client, make_user, db):
    token = _coach_token(client, make_user)
    entry_id = _make_entry(client, token, make_user)
    client.post(f"/api/competitions/entries/{entry_id}/results",
                headers=_hdr(token), json=_result_payload())

    resp = client.get(f"/api/competitions/entries/{entry_id}/protocol", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    seg = body["segments"][0]
    assert seg["segment"] == "FS"
    assert seg["tss"] == 102.70
    assert len(seg["executed_elements"]) == 2
    assert seg["executed_elements"][0]["called_code"] == "3Lz+3T"
    assert seg["executed_elements"][1]["info_flags"] == "<"


def test_comparison_planned_vs_executed(client, make_user, db):
    token = _coach_token(client, make_user)
    entry_id = _make_entry(client, token, make_user)
    client.post(f"/api/competitions/entries/{entry_id}/results",
                headers=_hdr(token), json=_result_payload())

    resp = client.get(
        f"/api/competitions/entries/{entry_id}/comparison", headers=_hdr(token)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # planned: 3Lz+3T=10.10, 2A=3.30 -> 13.40 ; executed: 10.10 + 2.64 -> 12.74
    comp = body["comparisons"][0]
    assert comp["total_planned_base"] == 13.40
    assert comp["total_executed_base"] == 12.74
    assert comp["total_base_differential"] == -0.66
    assert body["total_base_differential"] == -0.66
    rows = comp["rows"]
    assert rows[0]["planned_code"] == "3Lz+3T"
    assert rows[0]["planned_base"] == 10.10
    assert rows[1]["executed_code"] == "2A<"
    assert rows[1]["executed_base"] == 2.64
