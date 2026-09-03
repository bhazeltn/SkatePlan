"""Seed the Scale of Values (Singles only) from the adjudicated CSV.

Deterministic rules (no LLM):
- EXCLUDE any row whose Element_Name contains (case-insensitive) any of:
  throw, twist, lift, death spiral, pair  -> removes all Pairs elements.
- Exactly one duplicate abbreviation remains after filtering: "2A<"
  (BASE 0.88 and BASE 2.64). Collapse to a SINGLE row, keeping BASE 2.64.
- Final result: exactly 402 unique Singles element rows.
"""
import csv
import io
import os

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import SessionLocal
from app.models.scoring import ScaleOfValues
from app.seeds import SEEDS_DIR

CSV_PATH = os.path.join(SEEDS_DIR, "Pairs and Singles.csv")
_EXCLUDE = ("throw", "twist", "lift", "death spiral", "pair")
_GOE_MAP = {
    "GOE_-5": "goe_minus_5", "GOE_-4": "goe_minus_4", "GOE_-3": "goe_minus_3",
    "GOE_-2": "goe_minus_2", "GOE_-1": "goe_minus_1", "GOE_+1": "goe_plus_1",
    "GOE_+2": "goe_plus_2", "GOE_+3": "goe_plus_3", "GOE_+4": "goe_plus_4",
    "GOE_+5": "goe_plus_5",
}


def _is_singles(element_name: str) -> bool:
    lowered = element_name.lower()
    return not any(term in lowered for term in _EXCLUDE)


def _row_to_record(row: dict) -> dict:
    record = {
        "abbreviation": row["Abbreviation"].strip(),
        "element_name": row["Element_Name"].strip(),
        "base_value": float(row["BASE"]),
    }
    for csv_col, model_col in _GOE_MAP.items():
        record[model_col] = float(row[csv_col])
    return record


def parse_singles_records(text: str) -> list[dict]:
    """Parse CSV text into Singles-only records, collapsing the 2A< duplicate."""
    by_abbr: dict[str, dict] = {}
    for row in csv.DictReader(io.StringIO(text)):
        if not _is_singles(row["Element_Name"]):
            continue
        record = _row_to_record(row)
        existing = by_abbr.get(record["abbreviation"])
        # Collapse duplicates keeping the HIGHER base value (2A< -> 2.64).
        if existing is None or record["base_value"] > existing["base_value"]:
            by_abbr[record["abbreviation"]] = record
    return list(by_abbr.values())


def upsert_records(records: list[dict]) -> int:
    """Idempotent upsert on the abbreviation primary key."""
    session = SessionLocal()
    try:
        for rec in records:
            stmt = pg_insert(ScaleOfValues).values(**rec)
            update_cols = {k: rec[k] for k in rec if k != "abbreviation"}
            stmt = stmt.on_conflict_do_update(
                index_elements=["abbreviation"], set_=update_cols
            )
            session.execute(stmt)
        session.commit()
    finally:
        session.close()
    return len(records)


def seed_scale_of_values() -> int:
    with open(CSV_PATH, encoding="utf-8") as fh:
        records = parse_singles_records(fh.read())
    return upsert_records(records)


if __name__ == "__main__":
    print("scale_of_values seeded:", seed_scale_of_values())
