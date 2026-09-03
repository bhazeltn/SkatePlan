"""Program and ordered program-element models (Sprint 2).

programs.id / program_elements.id are native UUID PKs. programs.skater_id is an
INTEGER FK -> users.id to match the existing integer users PK (Sprint 0).
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    program_type: Mapped[str] = mapped_column(String(4), nullable=False)  # 'SP' | 'FS'
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    season: Mapped[str | None] = mapped_column(String(20))
    music_duration_seconds: Mapped[int | None] = mapped_column(Integer)
    segment_bonus: Mapped[float] = mapped_column(
        Numeric(4, 2), default=0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    elements: Mapped[list["ProgramElement"]] = relationship(
        back_populates="program",
        cascade="all, delete-orphan",
        order_by="ProgramElement.segment_order",
    )


class ProgramElement(Base):
    __tablename__ = "program_elements"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    segment_order: Mapped[int] = mapped_column(Integer, nullable=False)
    element_code: Mapped[str] = mapped_column(String(50), nullable=False)
    is_second_half_bonus: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    element_bonus: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    transition_notes: Mapped[str | None] = mapped_column(Text)

    program: Mapped["Program"] = relationship(back_populates="elements")
