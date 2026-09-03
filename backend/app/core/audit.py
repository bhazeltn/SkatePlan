"""SafeSport audit trail: record changes to critical text columns.

A SQLAlchemy ``before_flush`` listener inspects tracked models for changes to
designated critical text columns and appends an immutable ledger row capturing
the PREVIOUS value, the acting user id, source IP and a timestamp. Deterministic
— no LLM, no external calls.
"""
import contextlib
import contextvars

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.models.audit import SafeSportTextHistoryLedger

_actor_id: contextvars.ContextVar[int | None] = contextvars.ContextVar(
    "audit_actor_id", default=None
)
_actor_ip: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "audit_actor_ip", default=None
)

# model -> {tracked_column_name: primary_key_attr_name}
_TRACKED: dict[type, dict[str, str]] = {}


@contextlib.contextmanager
def audit_actor(actor_id: int | None = None, ip: str | None = None):
    """Bind the acting user id / IP for any audited changes in this context."""
    tok_id = _actor_id.set(actor_id)
    tok_ip = _actor_ip.set(ip)
    try:
        yield
    finally:
        _actor_id.reset(tok_id)
        _actor_ip.reset(tok_ip)


def _ledger_for(obj, column: str, pk_attr: str):
    """Build a ledger row for a changed column, or None if unchanged."""
    history = inspect(obj).attrs[column].history
    if not history.has_changes() or not history.deleted:
        return None
    return SafeSportTextHistoryLedger(
        target_table_name=obj.__tablename__,
        target_record_id=str(getattr(obj, pk_attr)),
        target_column_name=column,
        historical_text_value=history.deleted[0],
        revised_by_actor_id=_actor_id.get(),
        source_ip_address=_actor_ip.get(),
    )


def _before_flush(session: Session, _flush_context, _instances) -> None:
    new_rows = []
    for obj in session.dirty:
        tracked = _TRACKED.get(type(obj))
        if not tracked:
            continue
        for column, pk_attr in tracked.items():
            ledger = _ledger_for(obj, column, pk_attr)
            if ledger is not None:
                new_rows.append(ledger)
    for row in new_rows:
        session.add(row)


def configure_audit_listeners() -> None:
    """Register the audit listener and declare tracked critical columns."""
    from app.models.user import SkaterProfile

    _TRACKED[SkaterProfile] = {"medical_notes": "skater_id"}
    if not event.contains(Session, "before_flush", _before_flush):
        event.listen(Session, "before_flush", _before_flush)
