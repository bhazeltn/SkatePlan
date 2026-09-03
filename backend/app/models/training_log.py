"""Per-skater training-session log + jump/element attempt log (Sprint 4).

NOTE (reconciliation): a legacy ``training_sessions`` table already exists
(``app.models.session.TrainingSession``) — a minimal, training-unit-scoped
record used only to expose session durations in external portfolios. Sprint 4
introduces a richer, per-skater training LOG (RPE, session type, attempts), a
distinct concept. To avoid a clashing redefinition of ``training_sessions``,
these new tables are named ``training_session_logs`` / ``jump_attempt_logs``
while satisfying the spec's column schema.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TrainingSessionLog(Base):
    __tablename__ = "training_session_logs"
    __table_args__ = (
        CheckConstraint("rpe >= 1 AND rpe <= 10", name="ck_training_session_logs_rpe_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_date: Mapped[date | None] = mapped_column(Date, index=True)
    session_type: Mapped[str] = mapped_column(String(30), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    attempts: Mapped[list["JumpAttemptLog"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class JumpAttemptLog(Base):
    __tablename__ = "jump_attempt_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_session_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    element_code: Mapped[str] = mapped_column(String(50), nullable=False)
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    attempts_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session: Mapped["TrainingSessionLog"] = relationship(back_populates="attempts")
