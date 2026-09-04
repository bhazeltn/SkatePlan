"""dedup federations by name, repoint FKs, add unique(name)

Revision ID: c1f2d3e4b5a6
Revises: fbdf285aa51d
Create Date: 2026-09-03 00:00:00.000000

Duplicate federation rows share the same ``name`` but differ by ``code``
(``code`` is already unique). This migration keeps the lowest ``id`` per
name, repoints every referencing FK (skater_profiles, competitions) to
the survivor, deletes the duplicate rows, and adds a UNIQUE constraint on
``name`` so duplicates cannot recur.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c1f2d3e4b5a6"
down_revision: Union[str, Sequence[str], None] = "fbdf285aa51d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Tables that reference federations.id and must be repointed to the survivor.
_REFERENCING = (
    ("skater_profiles", "federation_id"),
    ("competitions", "federation_id"),
)


def _repoint(table: str, column: str) -> None:
    """Point rows at the surviving (lowest-id) federation for each name."""
    op.execute(
        f"""
        UPDATE {table} t
        SET {column} = k.keep_id
        FROM (SELECT name, MIN(id) AS keep_id FROM federations GROUP BY name) k
        JOIN federations f ON f.name = k.name
        WHERE t.{column} = f.id AND f.id <> k.keep_id;
        """
    )


def upgrade() -> None:
    """Merge duplicate federations and enforce unique name."""
    for table, column in _REFERENCING:
        _repoint(table, column)
    op.execute(
        """
        DELETE FROM federations f
        USING (SELECT name, MIN(id) AS keep_id FROM federations GROUP BY name) k
        WHERE f.name = k.name AND f.id <> k.keep_id;
        """
    )
    op.create_unique_constraint("uq_federations_name", "federations", ["name"])


def downgrade() -> None:
    """Drop the unique constraint (merged rows cannot be un-merged)."""
    op.drop_constraint("uq_federations_name", "federations", type_="unique")
