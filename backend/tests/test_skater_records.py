"""GET /api/skaters (roster list) and GET /api/skaters/{id} (profile hub)."""
from datetime import date

from sqlalchemy import select

from app.models.enums import RoleInUnit, SystemRole
from app.models.federation import Federation
from app.models.program import Program
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _federation(db) -> Federation:
    # `name` is unique (see the dedup migration); reuse by name to avoid
    # colliding with the seeded federation of the same name.
    name = "Philippine Skating Union"
    existing = db.execute(
        select(Federation).where(Federation.name == name)
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    fed = Federation(name=name, code="PHI-T", iso_code="ph")
    db.add(fed)
    db.flush()
    return fed


def _roster(client, make_user, db, s_email, c_email, first="Ava", last="Nguyen"):
    fed = _federation(db)
    skater = make_user(s_email, role=SystemRole.athlete, first=first, last=last)
    db.add(
        SkaterProfile(
            skater_id=skater.id,
            date_of_birth=date(2005, 1, 1),
            home_club="Glacier FSC",
            competitive_level="Senior",
            federation_id=fed.id,
        )
    )
    coach = make_user(c_email, password="Coach123!", role=SystemRole.coach)
    unit = TrainingUnit(unit_name="Unit", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(
        CoachAssignment(
            coach_user_id=coach.id,
            training_unit_id=unit.training_unit_id,
            role_in_unit=RoleInUnit.primary,
        )
    )
    db.commit()
    return skater, coach


def test_skater_records_require_auth(client):
    assert client.get("/api/skaters").status_code == 401
    assert client.get("/api/skaters/1").status_code == 401


def test_roster_list_includes_federation_enrichment(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "rls@ex.com", "rlc@ex.com")
    token = _login(client, "rlc@ex.com", "Coach123!")
    resp = client.get("/api/skaters", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    rows = {s["skater_id"]: s for s in resp.json()}
    row = rows[skater.id]
    assert row["federation_name"] == "Philippine Skating Union"
    assert row["country_code"] == "ph"
    assert row["competitive_level"] == "Senior"
    assert row["home_club"] == "Glacier FSC"


def test_skater_detail_returns_full_profile(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "sds@ex.com", "sdc@ex.com")
    token = _login(client, "sdc@ex.com", "Coach123!")
    client.post(
        "/api/injuries",
        headers=_hdr(token),
        json={
            "skater_id": skater.id,
            "title": "Ankle sprain",
            "onset_date": "2026-01-10",
            "status": "active",
            "restrictions": "Triple jump restriction / No impact landing",
        },
    )
    db.add(Program(skater_id=skater.id, program_type="FS", title="Free Skate 2026"))
    db.commit()

    resp = client.get(f"/api/skaters/{skater.id}", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["first_name"] == "Ava"
    assert body["federation_name"] == "Philippine Skating Union"
    assert body["country_code"] == "ph"
    assert body["has_active_restriction"] is True
    assert len(body["restrictions"]) == 1
    assert body["restrictions"][0]["status"] == "active"
    titles = {p["title"] for p in body["programs"]}
    assert "Free Skate 2026" in titles


def test_skater_detail_404_for_unknown(client, make_user, db):
    make_user("unkc@ex.com", password="Coach123!", role=SystemRole.coach)
    token = _login(client, "unkc@ex.com", "Coach123!")
    assert client.get("/api/skaters/999999", headers=_hdr(token)).status_code == 404


def test_create_restriction_flips_load_flag(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "crs@ex.com", "crc@ex.com")
    token = _login(client, "crc@ex.com", "Coach123!")
    assert (
        client.get(f"/api/skaters/{skater.id}", headers=_hdr(token)).json()[
            "has_active_restriction"
        ]
        is False
    )
    resp = client.post(
        f"/api/skaters/{skater.id}/restrictions",
        headers=_hdr(token),
        json={
            "restriction_type": "Jump Impact Limit",
            "excluded_elements": "No 2A/Triples",
            "review_date": "2026-02-01",
            "notes": "Ease back over two weeks",
        },
    )
    assert resp.status_code == 201, resp.text
    detail = client.get(f"/api/skaters/{skater.id}", headers=_hdr(token)).json()
    assert detail["has_active_restriction"] is True
    assert len(detail["restrictions"]) == 1
    r = detail["restrictions"][0]
    assert r["title"] == "Jump Impact Limit"
    assert "No 2A/Triples" in (r["restrictions"] or "")


def test_resolve_restriction_clears_load_flag(client, make_user, db):
    skater, _ = _roster(client, make_user, db, "rrs@ex.com", "rrc@ex.com")
    token = _login(client, "rrc@ex.com", "Coach123!")
    rid = client.post(
        f"/api/skaters/{skater.id}/restrictions",
        headers=_hdr(token),
        json={"restriction_type": "Total Rest"},
    ).json()["id"]
    assert (
        client.get(f"/api/skaters/{skater.id}", headers=_hdr(token)).json()[
            "has_active_restriction"
        ]
        is True
    )
    resp = client.delete(
        f"/api/skaters/{skater.id}/restrictions/{rid}", headers=_hdr(token)
    )
    assert resp.status_code == 200, resp.text
    detail = client.get(f"/api/skaters/{skater.id}", headers=_hdr(token)).json()
    assert detail["has_active_restriction"] is False
    assert detail["restrictions"] == []
