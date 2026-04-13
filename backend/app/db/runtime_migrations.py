from __future__ import annotations

from sqlalchemy import Connection, Engine, inspect, text


def run_runtime_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    dialect_name = engine.dialect.name
    with engine.begin() as connection:
        table_names = set(inspector.get_table_names())
        if "hot_topics" in table_names:
            _migrate_hot_topics(
                columns={column["name"] for column in inspector.get_columns("hot_topics")},
                dialect_name=dialect_name,
                connection=connection,
            )
        if "discover_articles" in table_names:
            _migrate_discover_articles(
                columns={
                    column["name"]: column
                    for column in inspector.get_columns("discover_articles")
                },
                dialect_name=dialect_name,
                connection=connection,
            )


def _migrate_hot_topics(*, columns: set[str], dialect_name: str, connection: Connection) -> None:
    if "snapshot_at" in columns:
        return

    if dialect_name == "postgresql":
        connection.execute(text("ALTER TABLE hot_topics ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ"))
        connection.execute(
            text(
                """
                UPDATE hot_topics
                SET snapshot_at = COALESCE(
                    updated_at,
                    created_at,
                    (snapshot_date::timestamp AT TIME ZONE 'UTC')
                )
                WHERE snapshot_at IS NULL
                """
            )
        )
        connection.execute(text("ALTER TABLE hot_topics ALTER COLUMN snapshot_at SET NOT NULL"))
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_hot_topics_snapshot_at_rank
                ON hot_topics (snapshot_at, rank_no)
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_hot_topics_platform_snapshot_at
                ON hot_topics (platform, snapshot_at)
                """
            )
        )
        return

    if dialect_name == "sqlite":
        connection.execute(text("ALTER TABLE hot_topics ADD COLUMN snapshot_at DATETIME"))
        connection.execute(
            text(
                """
                UPDATE hot_topics
                SET snapshot_at = COALESCE(updated_at, created_at, snapshot_date)
                WHERE snapshot_at IS NULL
                """
            )
        )


def _migrate_discover_articles(
    *,
    columns: dict[str, dict[str, object]],
    dialect_name: str,
    connection: Connection,
) -> None:
    if "collected_at" not in columns:
        if dialect_name == "postgresql":
            connection.execute(
                text(
                    "ALTER TABLE discover_articles ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ"
                )
            )
        elif dialect_name == "sqlite":
            connection.execute(text("ALTER TABLE discover_articles ADD COLUMN collected_at DATETIME"))

    source_url = columns.get("source_url")
    if source_url is None:
        return

    is_nullable = bool(source_url.get("nullable"))
    if is_nullable:
        return

    if dialect_name == "postgresql":
        connection.execute(text("ALTER TABLE discover_articles ALTER COLUMN source_url DROP NOT NULL"))
