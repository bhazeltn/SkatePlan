"""SQLAlchemy engine, session factory and DeclarativeBase."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# Small pool: hosted DB allows max 25 concurrent connections.
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Shared declarative base for all models."""
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
