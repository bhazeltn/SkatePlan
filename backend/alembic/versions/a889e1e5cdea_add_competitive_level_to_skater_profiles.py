"""add competitive_level to skater_profiles

Revision ID: a889e1e5cdea
Revises: d2fe11906217
Create Date: 2026-09-04 02:59:26.063547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a889e1e5cdea'
down_revision: Union[str, Sequence[str], None] = 'd2fe11906217'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "skater_profiles",
        sa.Column("competitive_level", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("skater_profiles", "competitive_level")
