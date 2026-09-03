"""Training session log — provides session-duration data for portfolios."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    session_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_unit_id: Mapped[int] = mapped_column(
        ForeignKey("training_units.training_unit_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("skater_profiles.skater_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    session_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
