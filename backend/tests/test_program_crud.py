"""Program + ordered program-element CRUD tests (Sprint 2)."""
from app.models.enums import SystemRole


def _coach_token(client, make_user):
    make_user("coach@ex.com", password="Coach123!", role=SystemRole.coach)
    r = client.post("/api/auth/login", json={"email": "coach@ex.com", "password": "Coach123!"})
    return r.json()["access_token"]


def _skater_id(make_user):
    return make_user("progskater@ex.com", role=SystemRole.athlete).id


def _program_payload(skater_id):
    return {
        "skater_id": skater_id,
        "program_type": "FS",
        "title": "Free Skate 2026",
        "season": "2025-26",
        "music_duration_seconds": 240,
        "segment_bonus": 0.5,
        "program_elements": [
            {"segment_order": 1, "element_code": "3Lz+3T",
             "is_second_half_bonus": False, "element_bonus": 1.0,
             "transition_notes": "opening pass"},
            {"segment_order": 2, "element_code": "2A",
             "is_second_half_bonus": True, "element_bonus": 2.0,
             "transition_notes": "bonus jump"},
        ],
    }


def test_coach_creates_program_with_elements(client, make_user, db):
    token = _coach_token(client, make_user)
    skater_id = _skater_id(make_user)
    resp = client.post(
        "/api/programs",
        headers={"Authorization": f"Bearer {token}"},
        json=_program_payload(skater_id),
    )
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["title"] == "Free Skate 2026"
    assert len(body["program_elements"]) == 2


def test_get_program_returns_elements_in_order(client, make_user, db):
    token = _coach_token(client, make_user)
    skater_id = _skater_id(make_user)
    created = client.post(
        "/api/programs",
        headers={"Authorization": f"Bearer {token}"},
        json=_program_payload(skater_id),
    ).json()
    pid = created["id"]

    resp = client.get(f"/api/programs/{pid}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, resp.text
    elems = resp.json()["program_elements"]
    assert [e["segment_order"] for e in elems] == [1, 2]
    assert elems[0]["element_code"] == "3Lz+3T"
    assert elems[1]["is_second_half_bonus"] is True
    assert float(elems[1]["element_bonus"]) == 2.0
    assert elems[0]["transition_notes"] == "opening pass"


def test_put_elements_reorders_and_updates(client, make_user, db):
    token = _coach_token(client, make_user)
    skater_id = _skater_id(make_user)
    created = client.post(
        "/api/programs",
        headers={"Authorization": f"Bearer {token}"},
        json=_program_payload(skater_id),
    ).json()
    pid = created["id"]

    new_elements = [
        {"segment_order": 1, "element_code": "2A",
         "is_second_half_bonus": False, "element_bonus": 0.0,
         "transition_notes": "now first"},
        {"segment_order": 2, "element_code": "3Lz",
         "is_second_half_bonus": True, "element_bonus": 3.0,
         "transition_notes": "now second"},
    ]
    resp = client.put(
        f"/api/programs/{pid}/elements",
        headers={"Authorization": f"Bearer {token}"},
        json={"program_elements": new_elements},
    )
    assert resp.status_code == 200, resp.text

    fetched = client.get(
        f"/api/programs/{pid}", headers={"Authorization": f"Bearer {token}"}
    ).json()["program_elements"]
    assert [e["element_code"] for e in fetched] == ["2A", "3Lz"]
    assert float(fetched[1]["element_bonus"]) == 3.0
    assert fetched[1]["is_second_half_bonus"] is True
