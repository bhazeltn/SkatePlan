"""Federation, stream and competition-level reference models."""
from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Federation(Base):
    __tablename__ = "federations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    iso_code: Mapped[str | None] = mapped_column(String(5))

    streams: Mapped[list["FederationStream"]] = relationship(
        back_populates="federation", cascade="all, delete-orphan"
    )


class FederationStream(Base):
    __tablename__ = "federation_streams"

    stream_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    federation_code: Mapped[str] = mapped_column(
        ForeignKey("federations.code", ondelete="CASCADE"), nullable=False, index=True
    )
    stream_name: Mapped[str] = mapped_column(String(120), nullable=False)
    stream_display: Mapped[str | None] = mapped_column(String(160))
    discipline: Mapped[str | None] = mapped_column(String(80))

    federation: Mapped["Federation"] = relationship(back_populates="streams")
    levels: Mapped[list["CompetitionLevel"]] = relationship(
        back_populates="stream", cascade="all, delete-orphan"
    )


class CompetitionLevel(Base):
    __tablename__ = "competition_levels"

    level_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stream_id: Mapped[int] = mapped_column(
        ForeignKey("federation_streams.stream_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    level_name: Mapped[str] = mapped_column(String(160), nullable=False)
    sort_order: Mapped[int | None] = mapped_column(Integer)
    is_adult: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    isu_anchor: Mapped[str | None] = mapped_column(String(80))

    stream: Mapped["FederationStream"] = relationship(back_populates="levels")
