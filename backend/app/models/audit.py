"""SafeSport text history / audit ledger."""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SafeSportTextHistoryLedger(Base):
    __tablename__ = "safesport_text_history_ledgers"

    audit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_table_name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_record_id: Mapped[str] = mapped_column(String(255), nullable=False)
    target_column_name: Mapped[str] = mapped_column(String(255), nullable=False)
    historical_text_value: Mapped[str | None] = mapped_column(Text)
    revised_by_actor_id: Mapped[int | None] = mapped_column(Integer)
    source_ip_address: Mapped[str | None] = mapped_column(String(64))
    revision_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
