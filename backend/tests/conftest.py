from __future__ import annotations

import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
TEST_DB_PATH = ROOT / ".pytest_auth.sqlite3"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DB_PATH.as_posix()}")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-sufficient-length")
