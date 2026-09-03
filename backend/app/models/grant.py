"""External access grant model for dual-track portfolio sharing.

FK column types match the EXISTING integer PKs of training_units and users
(Sprint 0 used SERIAL/integer PKs). grant_id itself is a native UUID PK.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import AccessTier


class ExternalAccessGrant(Base):
    __tablename__ = "external_access_grants"

    grant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    training_unit_id: Mapped[int] = mapped_column(
        ForeignKey("training_units.training_unit_id", ondelete="CASCADE"), nullable=False
    )
    grantee_email: Mapped[str] = mapped_column(String(255), nullable=False)
    access_tier: Mapped[AccessTier] = mapped_column(
        SAEnum(AccessTier, name="access_tier_enum"), nullable=False
    )
    token: Mapped[str | None] = mapped_column(String(128), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    granted_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
