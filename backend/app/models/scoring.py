"""Scale of Values (SOV) reference table."""
from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ScaleOfValues(Base):
    __tablename__ = "scale_of_values"

    abbreviation: Mapped[str] = mapped_column(String(50), primary_key=True)
    element_name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_value: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)

    goe_minus_5: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_minus_4: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_minus_3: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_minus_2: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_minus_1: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_plus_1: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_plus_2: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_plus_3: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_plus_4: Mapped[float] = mapped_column(Numeric(6, 2))
    goe_plus_5: Mapped[float] = mapped_column(Numeric(6, 2))
