"""Pytest fixtures.

Isolation: the entire suite runs against a dedicated Postgres schema
``skateplan_test`` inside the same hosted database. A ``connect`` listener pins
every pooled connection's ``search_path`` to that schema, so the app sessions,
the seed helpers and the ``db`` fixture all read/write there. The live/dev data
in the ``public`` schema is NEVER read or truncated by the suite.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, text

import app.models  # noqa: F401  ensure every model registers on Base.metadata
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.main import app
from app.models.enums import SystemRole
from app.models.user import User

TEST_SCHEMA = "skateplan_test"


@event.listens_for(engine, "connect", insert=True)
def _pin_search_path(dbapi_conn, _record):
    """Force every connection into the isolated test schema.

    autocommit is toggled so the ``SET`` is non-transactional — otherwise
    SQLAlchemy's reset-on-return rollback would undo it and connections would
    fall back to ``public`` (the live/dev schema).
    """
    prior = dbapi_conn.autocommit
    dbapi_conn.autocommit = True
    cur = dbapi_conn.cursor()
    cur.execute(f"SET SESSION search_path TO {TEST_SCHEMA}")
    cur.close()
    dbapi_conn.autocommit = prior


# Fresh pool so the listener applies to all connections used by the suite.
engine.dispose()

# Tables cleaned between tests (children first for FK order).
_CLEAN_TABLES = [
    "gap_assessments",
    "skater_benchmark_assessments",
    "standard_benchmarks",
    "development_standards",
    "injury_records",
    "coach_meetings",
    "jump_attempt_logs",
    "training_session_logs",
    "competition_executed_elements",
    "competition_segment_results",
    "competition_entries",
    "competitions",
    "program_elements",
    "programs",
    "external_access_grants",
    "training_sessions",
    "coach_assignments",
    "training_unit_roster",
    "training_units",
    "account_proxy_links",
    "skater_profiles",
    "safesport_text_history_ledgers",
    "users",
]


def _qualified(tables):
    return ", ".join(f"{TEST_SCHEMA}.{t}" for t in tables)


@pytest.fixture(scope="session", autouse=True)
def _prepare_schema():
    """Create the isolated test schema and all tables once per session."""
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {TEST_SCHEMA}"))
    Base.metadata.create_all(engine)
    # Seed persistent reference data (SOV, federations, levels) once, mirroring
    # the dev/public schema. These tables are never truncated between tests.
    from app.seeds.run_all import run_all
    run_all()
    yield


def _truncate():
    # Guard: fully-qualified names keep TRUNCATE inside the test schema only.
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE " + _qualified(_CLEAN_TABLES) + " RESTART IDENTITY CASCADE")
        )


@pytest.fixture(autouse=True)
def clean_db(_prepare_schema):
    _truncate()
    yield
    _truncate()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_user(db):
    """Factory to create a user with a known password."""
    def _make(email, password="Secret123!", role=SystemRole.athlete, first="Test", last="User"):
        user = User(
            email=email,
            password_hash=hash_password(password),
            system_role=role,
            first_name=first,
            last_name=last,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return _make
