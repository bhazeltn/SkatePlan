"""Federation + competition level ingestion and endpoint tests."""
from sqlalchemy import func, select

from app.models.federation import Federation


def _ensure_seeded():
    from app.seeds.seed_federations import seed_federations
    from app.seeds.seed_levels import seed_levels
    seed_federations()
    seed_levels()


def _member_codes():
    import json
    import os

    from app.seeds import SEEDS_DIR

    with open(os.path.join(SEEDS_DIR, "federation_data.json"), encoding="utf-8") as fh:
        return {e["fields"]["code"] for e in json.load(fh)}


def test_all_78_federations_loaded(db):
    from app.seeds.seed_federations import seed_federations

    loaded = seed_federations()
    assert loaded == 78
    # Every member code from the source file must be present.
    codes = {c for (c,) in db.execute(select(Federation.code)).all()}
    assert _member_codes().issubset(codes)
    assert len(_member_codes()) == 78


def test_can_levels_nested_streams(client):
    _ensure_seeded()
    resp = client.get("/api/federations/CAN/levels")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["federation_code"] == "CAN"
    names = {s["stream_name"] for s in body["streams"]}
    assert "STARSkate_Singles" in names
    stream = next(s for s in body["streams"] if s["stream_name"] == "STARSkate_Singles")
    assert len(stream["levels"]) > 0
    assert "level_name" in stream["levels"][0]


def test_phi_levels_have_isu_anchor(client):
    _ensure_seeded()
    resp = client.get("/api/federations/PHI/levels")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["federation_code"] == "PHI"
    anchors = [
        lvl["isu_anchor"]
        for s in body["streams"]
        for lvl in s["levels"]
    ]
    assert any(a is not None for a in anchors)


def test_isu_baseline_levels(client):
    _ensure_seeded()
    resp = client.get("/api/federations/ISU/levels")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["federation_code"] == "ISU"
    assert len(body["streams"]) > 0
