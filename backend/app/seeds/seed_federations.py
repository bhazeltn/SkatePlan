"""Seed the 78 member federations from federation_data.json (Django-fixture shape)."""
import json
import os

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import SessionLocal
from app.models.federation import Federation
from app.seeds import SEEDS_DIR

JSON_PATH = os.path.join(SEEDS_DIR, "federation_data.json")


def _load_records() -> list[dict]:
    with open(JSON_PATH, encoding="utf-8") as fh:
        raw = json.load(fh)
    records = []
    for entry in raw:
        fields = entry["fields"]
        records.append(
            {
                "name": fields["name"],
                "code": fields["code"],
                "iso_code": fields.get("iso_code"),
            }
        )
    return records


def seed_federations() -> int:
    """Idempotent upsert of federations, keyed by unique code."""
    records = _load_records()
    session = SessionLocal()
    try:
        for rec in records:
            _upsert_one(session, rec)
        session.commit()
    finally:
        session.close()
    return len(records)


def _upsert_one(session, rec: dict) -> None:
    """Insert/update a federation without violating unique code or name.

    If the name already belongs to a different code (a merged survivor), the
    record is skipped so re-running the seed never recreates a duplicate.
    """
    clash = (
        session.query(Federation)
        .filter(Federation.name == rec["name"], Federation.code != rec["code"])
        .first()
    )
    if clash is not None:
        return
    stmt = pg_insert(Federation).values(**rec)
    stmt = stmt.on_conflict_do_update(
        index_elements=["code"],
        set_={"name": rec["name"], "iso_code": rec["iso_code"]},
    )
    session.execute(stmt)


if __name__ == "__main__":
    print("federations seeded:", seed_federations())
