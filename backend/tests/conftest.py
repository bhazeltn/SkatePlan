"""Pytest fixtures. Uses the provisioned DB with per-test cleanup for isolation."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.main import app
from app.models.enums import SystemRole
from app.models.user import User

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


def _truncate():
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE " + ", ".join(_CLEAN_TABLES) + " RESTART IDENTITY CASCADE")
        )


@pytest.fixture(autouse=True)
def clean_db():
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
