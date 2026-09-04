"""Holistic development-standard models (Sprint 5).

Pillars (canonical stored values): 'technical','skating_skills','physical',
'mental' — stored as plain strings so the set stays trivially extensible.
Assessment status stored values: 'not_started','developing','acquired','mastered'.
The deterministic gap service maps these to report statuses (see gap_service).
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DevelopmentStandard(Base):
    __tablename__ = "development_standards"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    framework_type: Mapped[str | None] = mapped_column(String(50))
    coach_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    benchmarks: Mapped[list["StandardBenchmark"]] = relationship(
        back_populates="standard", cascade="all, delete-orphan"
    )


class StandardBenchmark(Base):
    __tablename__ = "standard_benchmarks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    standard_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("development_standards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    pillar: Mapped[str] = mapped_column(String(30), nullable=False)
    evaluation_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    target_metric_code: Mapped[str | None] = mapped_column(String(60))
    target_value: Mapped[float | None] = mapped_column(Numeric(8, 2))
    rubric_criteria: Mapped[str | None] = mapped_column(Text)

    standard: Mapped["DevelopmentStandard"] = relationship(back_populates="benchmarks")


class SkaterBenchmarkAssessment(Base):
    __tablename__ = "skater_benchmark_assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    benchmark_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("standard_benchmarks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), default="not_started", nullable=False)
    score: Mapped[float | None] = mapped_column(Numeric(6, 2))
    assessment_notes: Mapped[str | None] = mapped_column(Text)
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class SkaterBenchmark(Base):
    """A single coach-defined custom benchmark target for a skater (Sprint 6).

    Fully coach-driven: coaches define discrete benchmark items across flexible
    categories. ``status`` uses the canonical enum values
    'NOT_STARTED','DEVELOPING','SOLIDIFYING','MET' (validated in the schema).
    ``skater_id`` FKs ``users.id`` to mirror ``GapAssessment``.
    """

    __tablename__ = "skater_benchmarks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="NOT_STARTED", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    target_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class GapAssessment(Base):
    """A coach's interactive benchmark assessment snapshot for a skater.

    Sprint 4 pillars: 'technical','skating_skills','physical','performance'.
    ``pillar_scores`` maps each pillar to an ordinal level label
    ('Not Introduced'/'Acquiring'/'Meeting Standard'/'Exceeding').
    """

    __tablename__ = "gap_assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    benchmark_framework: Mapped[str] = mapped_column(String(150), nullable=False)
    pillar_scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    coach_notes: Mapped[str | None] = mapped_column(Text)
    evaluation_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
