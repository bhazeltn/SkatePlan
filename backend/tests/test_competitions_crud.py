"""Competition CRUD + filtering tests (Sprint 3)."""
from sqlalchemy import select

from app.models.enums import SystemRole
from app.models.federation import Federation


def _coach_token(client, make_user):
    make_user("ccoach@ex.com", password="Coach123!", role=SystemRole.coach)
    r = client.post("/api/auth/login", json={"email": "ccoach@ex.com", "password": "Coach123!"})
    return r.json()["access_token"]


def _athlete_token(client, make_user):
    make_user("cath@ex.com", password="Ath123456!", role=SystemRole.athlete)
    r = client.post("/api/auth/login", json={"email": "cath@ex.com", "password": "Ath123456!"})
    return r.json()["access_token"]


def _fed_id(db):
    return db.execute(select(Federation.id)).scalars().first()


def _payload(name, start, end, season, fed_id):
    return {
        "name": name,
        "start_date": start,
        "end_date": end,
        "city": "Calgary",
        "country": "Canada",
        "federation_id": fed_id,
        "season": season,
    }


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def test_coach_creates_competition(client, make_user, db):
    token = _coach_token(client, make_user)
    resp = client.post(
        "/api/competitions",
        headers=_hdr(token),
        json=_payload("Fall Classic", "2025-10-10", "2025-10-12", "2025-26", _fed_id(db)),
    )
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["name"] == "Fall Classic"
    assert body["season"] == "2025-26"
    assert body["city"] == "Calgary"


def test_athlete_cannot_create_competition(client, make_user, db):
    token = _athlete_token(client, make_user)
    resp = client.post(
        "/api/competitions",
        headers=_hdr(token),
        json=_payload("No Go", "2025-10-10", "2025-10-12", "2025-26", None),
    )
    assert resp.status_code == 403, resp.text


def test_filter_by_season_and_date_range(client, make_user, db):
    token = _coach_token(client, make_user)
    client.post("/api/competitions", headers=_hdr(token),
                json=_payload("Autumn Cup", "2025-10-10", "2025-10-12", "2025-26", None))
    client.post("/api/competitions", headers=_hdr(token),
                json=_payload("Spring Open", "2026-04-01", "2026-04-03", "2026-27", None))

    by_season = client.get("/api/competitions?season=2025-26", headers=_hdr(token))
    assert by_season.status_code == 200, by_season.text
    names = {c["name"] for c in by_season.json()}
    assert names == {"Autumn Cup"}

    by_range = client.get(
        "/api/competitions?date_from=2026-01-01&date_to=2026-12-31", headers=_hdr(token)
    )
    assert by_range.status_code == 200, by_range.text
    rnames = {c["name"] for c in by_range.json()}
    assert rnames == {"Spring Open"}
