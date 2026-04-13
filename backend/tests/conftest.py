from __future__ import annotations

import os
from pathlib import Path
import sys

from fastapi.testclient import TestClient
import pytest


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
RUNTIME_TEST_DIR = ROOT / ".runtime" / "tests"
TEST_DB_PATH = RUNTIME_TEST_DIR / "pytest_auth.sqlite3"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

RUNTIME_TEST_DIR.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-sufficient-length")

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.services.auth_service import ensure_auth_seed_data
from app.services.discover_service import ensure_discover_seed_data


def _reset_test_database() -> None:
    Base.metadata.drop_all(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        ensure_auth_seed_data(session)
        ensure_discover_seed_data(session)


@pytest.fixture()
def client() -> TestClient:
    _reset_test_database()
    with TestClient(app) as test_client:
        yield test_client
