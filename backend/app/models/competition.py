"""Competition, entry, segment-result and executed-element models (Sprint 3).

PK types follow established conventions: competitions/entries/results/executed
rows are native UUID PKs; skater_id/federation_id/level_id are INTEGER FKs;
program ids are UUID FKs -> programs.id.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
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


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    city: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    federation_id: Mapped[int | None] = mapped_column(
        ForeignKey("federations.id", ondelete="SET NULL")
    )
    season: Mapped[str | None] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    entries: Mapped[list["CompetitionEntry"]] = relationship(
        back_populates="competition", cascade="all, delete-orphan"
    )


class CompetitionEntry(Base):
    __tablename__ = "competition_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    competition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    level_id: Mapped[int | None] = mapped_column(
        ForeignKey("competition_levels.level_id", ondelete="SET NULL")
    )
    sp_program_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("programs.id", ondelete="SET NULL")
    )
    fs_program_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("programs.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(30), default="registered", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    competition: Mapped["Competition"] = relationship(back_populates="entries")
    results: Mapped[list["CompetitionSegmentResult"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan"
    )


class CompetitionSegmentResult(Base):
    __tablename__ = "competition_segment_results"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("competition_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    segment: Mapped[str] = mapped_column(String(4), nullable=False)  # 'SP' | 'FS'
    tes: Mapped[float | None] = mapped_column(Numeric(5, 2))
    pcs: Mapped[float | None] = mapped_column(Numeric(5, 2))
    deductions: Mapped[float | None] = mapped_column(Numeric(4, 2))
    segment_bonus: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    tss: Mapped[float | None] = mapped_column(Numeric(5, 2))
    segment_rank: Mapped[int | None] = mapped_column(Integer)
    overall_rank: Mapped[int | None] = mapped_column(Integer)
    protocol_notes: Mapped[str | None] = mapped_column(Text)

    entry: Mapped["CompetitionEntry"] = relationship(back_populates="results")
    executed_elements: Mapped[list["CompetitionExecutedElement"]] = relationship(
        back_populates="result",
        cascade="all, delete-orphan",
        order_by="CompetitionExecutedElement.segment_order",
    )


class CompetitionExecutedElement(Base):
    __tablename__ = "competition_executed_elements"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    result_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("competition_segment_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    segment_order: Mapped[int] = mapped_column(Integer, nullable=False)
    called_code: Mapped[str] = mapped_column(String(50), nullable=False)
    base_value: Mapped[float | None] = mapped_column(Numeric(5, 2))
    earned_goe: Mapped[float | None] = mapped_column(Numeric(4, 2))
    info_flags: Mapped[str | None] = mapped_column(String(20))

    result: Mapped["CompetitionSegmentResult"] = relationship(
        back_populates="executed_elements"
    )
