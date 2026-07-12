"""
AssetFlow — Database engine, session factory, and dependency.

Usage in routers:
    from app.db import get_db
    @router.get("/example")
    def example(db: Session = Depends(get_db)): ...
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # reconnect on stale connections
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a session, ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
