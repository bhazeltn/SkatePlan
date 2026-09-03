"""Training unit, roster and coach-assignment models."""
from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import DisciplineType, RoleInUnit


class TrainingUnit(Base):
    __tablename__ = "training_units"

    training_unit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    discipline_type: Mapped[DisciplineType] = mapped_column(
        SAEnum(DisciplineType, name="discipline_type_enum"),
        default=DisciplineType.singles,
        nullable=False,
    )
    unit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TrainingUnitRoster(Base):
    __tablename__ = "training_unit_roster"

    roster_entry_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_unit_id: Mapped[int] = mapped_column(
        ForeignKey("training_units.training_unit_id", ondelete="CASCADE"), nullable=False
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("skater_profiles.skater_id", ondelete="CASCADE"), nullable=False
    )


class CoachAssignment(Base):
    __tablename__ = "coach_assignments"

    assignment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    coach_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    training_unit_id: Mapped[int] = mapped_column(
        ForeignKey("training_units.training_unit_id", ondelete="CASCADE"), nullable=False
    )
    role_in_unit: Mapped[RoleInUnit] = mapped_column(
        SAEnum(RoleInUnit, name="role_in_unit_enum"),
        default=RoleInUnit.primary,
        nullable=False,
    )
