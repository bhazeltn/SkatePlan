"""Injury record model (Sprint 5) — SafeSport-sensitive medical text.

The ``restrictions`` free-text is treated like other sensitive medical text and
tracked by the SafeSport audit ledger (see app.core.audit). ``active_history``
forces the prior value to load before replacement so the listener can capture it.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InjuryRecord(Base):
    __tablename__ = "injury_records"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body_part: Mapped[str | None] = mapped_column(String(100))
    onset_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    restrictions: Mapped[str | None] = mapped_column(Text, active_history=True)
    clearance_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
