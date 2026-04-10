from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.db.models.discover import DiscoverArticle, HotTopic
from app.schemas.discover import DiscoverArticleQuery


def count_discover_articles(db: Session) -> int:
    statement = select(func.count()).select_from(DiscoverArticle)
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


def query_discover_articles(
    db: Session,
    filters: DiscoverArticleQuery,
    *,
    published_after: datetime | None,
) -> tuple[list[DiscoverArticle], int]:
    statement = select(DiscoverArticle)
    count_statement = select(func.count()).select_from(DiscoverArticle)

    statement = _apply_article_filters(statement, filters, published_after)
    count_statement = _apply_article_filters(count_statement, filters, published_after)

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
    latest_snapshot_date = db.scalar(select(func.max(HotTopic.snapshot_date)))
    if latest_snapshot_date is None:
        return [], 0

    statement = (
        select(HotTopic)
        .where(HotTopic.snapshot_date == latest_snapshot_date)
        .order_by(HotTopic.rank_no.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    count_statement = (
        select(func.count())
        .select_from(HotTopic)
        .where(HotTopic.snapshot_date == latest_snapshot_date)
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
