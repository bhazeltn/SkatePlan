"""decouple skater from auth user: add is_account_active + contact_email

Revision ID: fbdf285aa51d
Revises: a889e1e5cdea
Create Date: 2026-09-04 03:20:17.195305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbdf285aa51d'
down_revision: Union[str, Sequence[str], None] = 'a889e1e5cdea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "is_account_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "skater_profiles",
        sa.Column("contact_email", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("skater_profiles", "contact_email")
    op.drop_column("users", "is_account_active")
