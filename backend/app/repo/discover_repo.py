from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from app.db.models.discover import DiscoverArticle, DiscoverPlatform, HotTopic
from app.schemas.discover import DiscoverArticleQuery


def count_discover_articles(db: Session) -> int:
    statement = select(func.count()).select_from(DiscoverArticle)
    return int(db.scalar(statement) or 0)


def count_live_discover_articles(db: Session, *, platform: str | None = None) -> int:
    statement = select(func.count()).select_from(DiscoverArticle).where(
        DiscoverArticle.collected_at.is_not(None)
    )
    if platform is not None:
        statement = statement.where(DiscoverArticle.platform == platform)
    return int(db.scalar(statement) or 0)


def count_hot_topics(db: Session) -> int:
    statement = select(func.count()).select_from(HotTopic)
    return int(db.scalar(statement) or 0)


def create_discover_article(db: Session, **payload: Any) -> DiscoverArticle:
    article = DiscoverArticle(**payload)
    db.add(article)
    db.flush()
    return article


def create_hot_topic(db: Session, **payload: Any) -> HotTopic:
    topic = HotTopic(**payload)
    db.add(topic)
    db.flush()
    return topic


def get_discover_article_by_id(db: Session, article_id: str) -> DiscoverArticle | None:
    return db.get(DiscoverArticle, article_id)


def get_hot_topic_by_id(db: Session, topic_id: str) -> HotTopic | None:
    return db.get(HotTopic, topic_id)


def upsert_discover_article(db: Session, **payload: Any) -> DiscoverArticle:
    article_id = str(payload["id"])
    article = get_discover_article_by_id(db, article_id)
    if article is None:
        return create_discover_article(db, **payload)

    for key, value in payload.items():
        setattr(article, key, value)
    db.flush()
    return article


def upsert_hot_topic(db: Session, **payload: Any) -> HotTopic:
    topic_id = str(payload["id"])
    topic = get_hot_topic_by_id(db, topic_id)
    if topic is None:
        return create_hot_topic(db, **payload)

    for key, value in payload.items():
        setattr(topic, key, value)
    db.flush()
    return topic


def append_hot_topics_snapshot(db: Session, payloads: list[dict[str, Any]]) -> list[HotTopic]:
    topics: list[HotTopic] = []
    for payload in payloads:
        topics.append(create_hot_topic(db, **payload))
    db.flush()
    return topics


def query_latest_hot_topics_by_platform(
    db: Session,
    platform: str,
    *,
    limit: int,
) -> list[HotTopic]:
    latest_snapshot_at = db.scalar(
        select(func.max(HotTopic.snapshot_at)).where(HotTopic.platform == platform)
    )
    if latest_snapshot_at is None:
        return []

    statement = (
        select(HotTopic)
        .where(
            HotTopic.platform == platform,
            HotTopic.snapshot_at == latest_snapshot_at,
        )
        .order_by(HotTopic.rank_no.asc())
        .limit(limit)
    )
    return list(db.scalars(statement).all())


def get_latest_hot_topics_synced_at(db: Session) -> datetime | None:
    statement = select(func.max(HotTopic.snapshot_at))
    value = db.scalar(statement)
    return value if isinstance(value, datetime) else None


def get_latest_discover_articles_synced_at(
    db: Session,
    *,
    platform: str | None = None,
) -> datetime | None:
    statement = select(func.max(DiscoverArticle.collected_at))
    if platform is not None:
        statement = statement.where(DiscoverArticle.platform == platform)
    value = db.scalar(statement)
    return value if isinstance(value, datetime) else None


def query_discover_articles(
    db: Session,
    filters: DiscoverArticleQuery,
    *,
    published_after: datetime | None,
) -> tuple[list[DiscoverArticle], int]:
    live_platforms = _get_live_discover_platforms(db, platform=filters.platform)
    statement = select(DiscoverArticle)
    count_statement = select(func.count()).select_from(DiscoverArticle)

    statement = _apply_article_filters(statement, filters, published_after)
    count_statement = _apply_article_filters(count_statement, filters, published_after)
    statement = _apply_live_visibility(statement, filters.platform, live_platforms)
    count_statement = _apply_live_visibility(count_statement, filters.platform, live_platforms)

    total = int(db.scalar(count_statement) or 0)
    paged_statement = (
        statement
        .order_by(DiscoverArticle.publish_time.desc(), DiscoverArticle.views.desc())
        .offset((filters.page - 1) * filters.page_size)
        .limit(filters.page_size)
    )
    return list(db.scalars(paged_statement).all()), total


def query_hot_topics(
    db: Session,
    *,
    page: int,
    page_size: int,
) -> tuple[list[HotTopic], int]:
    latest_snapshot_at = db.scalar(select(func.max(HotTopic.snapshot_at)))
    if latest_snapshot_at is None:
        return [], 0

    statement = (
        select(HotTopic)
        .where(HotTopic.snapshot_at == latest_snapshot_at)
        .order_by(HotTopic.rank_no.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    count_statement = (
        select(func.count())
        .select_from(HotTopic)
        .where(HotTopic.snapshot_at == latest_snapshot_at)
    )
    total = int(db.scalar(count_statement) or 0)
    return list(db.scalars(statement).all()), total


def _apply_article_filters(
    statement: Select[Any],
    filters: DiscoverArticleQuery,
    published_after: datetime | None,
) -> Select[Any]:
    if filters.platform is not None:
        statement = statement.where(DiscoverArticle.platform == filters.platform)
    if filters.keyword:
        keyword = f"%{filters.keyword.strip()}%"
        statement = statement.where(
            or_(
                DiscoverArticle.title.ilike(keyword),
                DiscoverArticle.author_name.ilike(keyword),
            )
        )
    if filters.field:
        statement = statement.where(DiscoverArticle.field == filters.field)
    if published_after is not None:
        statement = statement.where(DiscoverArticle.publish_time >= published_after)
    if filters.views_min is not None:
        statement = statement.where(DiscoverArticle.views >= filters.views_min)
    return statement


def _get_live_discover_platforms(db: Session, *, platform: str | None = None) -> set[str]:
    statement = select(DiscoverArticle.platform).where(DiscoverArticle.collected_at.is_not(None)).distinct()
    if platform is not None:
        statement = statement.where(DiscoverArticle.platform == platform)
    return {str(value) for value in db.scalars(statement).all() if value}


def _apply_live_visibility(
    statement: Select[Any],
    platform: str | None,
    live_platforms: set[str],
) -> Select[Any]:
    if platform is not None:
        if platform in live_platforms:
            return statement.where(DiscoverArticle.collected_at.is_not(None))
        return statement.where(DiscoverArticle.collected_at.is_(None))

    if not live_platforms:
        return statement

    all_platforms = {item.value for item in DiscoverPlatform}
    fallback_platforms = sorted(all_platforms - live_platforms)
    live_condition = and_(
        DiscoverArticle.platform.in_(sorted(live_platforms)),
        DiscoverArticle.collected_at.is_not(None),
    )

    if not fallback_platforms:
        return statement.where(live_condition)

    fallback_condition = and_(
        DiscoverArticle.platform.in_(fallback_platforms),
        DiscoverArticle.collected_at.is_(None),
    )
    return statement.where(or_(live_condition, fallback_condition))
