"""
AssetFlow — Shared test fixtures.

Provides a test database session and a FastAPI test client wired to use it.
All integration tests run inside a transaction that is rolled back after each test,
so they never leave residue and can run in parallel.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# ── Ensure test config is loaded before anything imports app ──────────────────
os.environ.setdefault("DATABASE_URL", "postgresql://assetflow:assetflow@localhost:5432/assetflow_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("JWT_EXPIRE_HOURS", "8")

from app.db import Base, get_db
from app.main import app

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ── Session-scoped: create/drop tables once per test run ─────────────────────
@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    """Create all tables at start, drop at end."""
    with engine.begin() as conn:
        from sqlalchemy import text

        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext;"))
        conn.execute(text("CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1000;"))
    Base.metadata.create_all(bind=engine)
    yield
    # Base.metadata.drop_all(bind=engine)
    with engine.begin() as conn:
        from sqlalchemy import text

        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO assetflow;"))


# ── Function-scoped: each test gets a rolled-back transaction ────────────────
@pytest.fixture()
def db_session():
    """Yield a DB session wrapped in a transaction that rolls back after the test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session: Session):
    """FastAPI TestClient that uses the rolled-back test session."""

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
