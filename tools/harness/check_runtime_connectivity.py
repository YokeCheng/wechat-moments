from __future__ import annotations

from pathlib import Path
import socket
import sys
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen

import psycopg


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings  # noqa: E402


def main() -> int:
    settings = get_settings()
    failures: list[str] = []

    if settings.database_url.startswith("sqlite"):
        failures.append("postgres: sqlite runtime is forbidden by harness outside APP_ENV=test")
    else:
        try:
            postgres_url = normalize_psycopg_url(settings.database_url)
            with psycopg.connect(postgres_url, connect_timeout=5) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("select 1")
                    cursor.fetchone()
            print(f"postgres: ok ({settings.database_url})")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"postgres: {exc}")

    try:
        redis = urlparse(settings.redis_url)
        port = redis.port or 6379
        host = redis.hostname or "127.0.0.1"
        with socket.create_connection((host, port), timeout=5) as sock:
            sock.sendall(b"*1\r\n$4\r\nPING\r\n")
            payload = sock.recv(128).decode("utf-8", errors="replace").strip()
        if payload != "+PONG":
            raise RuntimeError(f"unexpected redis response: {payload}")
        print(f"redis: ok ({settings.redis_url})")
    except Exception as exc:  # noqa: BLE001
        failures.append(f"redis: {exc}")

    if settings.s3_public_base_url:
        try:
            with urlopen(settings.s3_public_base_url, timeout=5) as response:
                print(f"s3: ok ({settings.s3_public_base_url}) status={response.status}")
        except URLError as exc:
            failures.append(f"s3: {exc}")
    else:
        print("s3: skipped (S3_PUBLIC_BASE_URL is empty)")

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1
    return 0


def normalize_psycopg_url(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return "postgresql://" + database_url.removeprefix("postgresql+psycopg://")
    return database_url


if __name__ == "__main__":
    raise SystemExit(main())
