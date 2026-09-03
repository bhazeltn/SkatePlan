"""User and skater-profile / proxy-link models."""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AccessState, SystemRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    system_role: Mapped[SystemRole] = mapped_column(
        SAEnum(SystemRole, name="system_role_enum"), nullable=False
    )
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    skater_profile: Mapped["SkaterProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class SkaterProfile(Base):
    __tablename__ = "skater_profiles"

    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    home_club: Mapped[str | None] = mapped_column(String(255))
    # Sprint 0 free-text federation registration number (renamed from federation_id).
    federation_registration_id: Mapped[str | None] = mapped_column(String(120))
    # Sprint 1 normalized FKs.
    federation_id: Mapped[int | None] = mapped_column(
        ForeignKey("federations.id", ondelete="SET NULL")
    )
    current_level_id: Mapped[int | None] = mapped_column(
        ForeignKey("competition_levels.level_id", ondelete="SET NULL")
    )
    # Critical, audited, redactable medical/injury free-text.
    # active_history=True forces the prior value to load before replacement so
    # the audit listener can capture it in the history ledger.
    medical_notes: Mapped[str | None] = mapped_column(Text, active_history=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="skater_profile")


class AccountProxyLink(Base):
    __tablename__ = "account_proxy_links"

    link_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("skater_profiles.skater_id", ondelete="CASCADE"), nullable=False
    )
    parent_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_active_observer: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    access_state: Mapped[AccessState] = mapped_column(
        SAEnum(AccessState, name="access_state_enum"),
        default=AccessState.active,
        nullable=False,
    )
