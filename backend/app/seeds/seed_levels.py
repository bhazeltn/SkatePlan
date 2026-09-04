"""Seed federation streams + competition levels from *_levels.json files.

Idempotent per federation: existing streams for a federation code are cleared
(cascading to their levels) and re-inserted from the source file.
"""
import json
import os

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import SessionLocal
from app.models.federation import CompetitionLevel, Federation, FederationStream
from app.seeds import SEEDS_DIR

LEVEL_FILES = ("ISU_levels.json", "CAN_levels.json", "PHI_levels.json")


def _load(filename: str) -> dict:
    with open(os.path.join(SEEDS_DIR, filename), encoding="utf-8") as fh:
        return json.load(fh)


def _insert_stream(session, code: str, stream: dict) -> None:
    row = FederationStream(
        federation_code=code,
        stream_name=stream["stream_name"],
        stream_display=stream.get("stream_display"),
        discipline=stream.get("discipline"),
    )
    session.add(row)
    session.flush()  # obtain stream_id
    for level in stream.get("levels", []):
        session.add(
            CompetitionLevel(
                stream_id=row.stream_id,
                level_name=level["name"],
                sort_order=level.get("order"),
                is_adult=bool(level.get("is_adult", False)),
                isu_anchor=level.get("isu_anchor"),
            )
        )


def _ensure_federation(session, code: str, name: str) -> None:
    """Guarantee the parent federation exists for the FK.

    Both ``code`` and ``name`` are unique, so a federation matching either is
    reused instead of inserted. This prevents re-runs (or overlapping seed
    sources) from creating name-duplicate rows with a different code.
    """
    existing = (
        session.query(Federation)
        .filter((Federation.code == code) | (Federation.name == name))
        .first()
    )
    if existing is not None:
        return
    stmt = pg_insert(Federation).values(name=name, code=code, iso_code=None)
    stmt = stmt.on_conflict_do_nothing(index_elements=["code"])
    session.execute(stmt)


def _seed_one(session, payload: dict) -> int:
    code = payload["federation_code"]
    _ensure_federation(session, code, payload.get("federation_name", code))
    session.flush()
    session.execute(
        delete(FederationStream).where(FederationStream.federation_code == code)
    )
    streams = payload.get("streams", [])
    for stream in streams:
        _insert_stream(session, code, stream)
    return len(streams)


def seed_levels() -> dict[str, int]:
    """Seed all level files. Returns {federation_code: stream_count}."""
    result: dict[str, int] = {}
    session = SessionLocal()
    try:
        for filename in LEVEL_FILES:
            payload = _load(filename)
            result[payload["federation_code"]] = _seed_one(session, payload)
        session.commit()
    finally:
        session.close()
    return result


if __name__ == "__main__":
    print("levels seeded:", seed_levels())
