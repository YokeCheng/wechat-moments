from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import JSON, Boolean, Date, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class DiscoverPlatform(str, Enum):
    WEIXIN = "weixin"
    TOUTIAO = "toutiao"


class HotTopicTrend(str, Enum):
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class DiscoverArticle(Base, TimestampMixin):
    __tablename__ = "discover_articles"
    __table_args__ = (
        Index(
            "idx_discover_articles_platform_publish_time",
            "platform",
            "publish_time",
        ),
        Index("idx_discover_articles_field", "field"),
        Index("idx_discover_articles_views", "views"),
        Index("idx_discover_articles_title", "title"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    field: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author_name: Mapped[str] = mapped_column(String(128), nullable=False)
    publish_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    views: Mapped[int] = mapped_column(nullable=False, default=0)
    likes: Mapped[int] = mapped_column(nullable=False, default=0)
    shares: Mapped[int] = mapped_column(nullable=False, default=0)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_hot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)


class HotTopic(Base, TimestampMixin):
    __tablename__ = "hot_topics"
    __table_args__ = (
        Index("idx_hot_topics_snapshot_rank", "snapshot_date", "rank_no"),
        Index("idx_hot_topics_snapshot_at_rank", "snapshot_at", "rank_no"),
        Index("idx_hot_topics_platform_snapshot_at", "platform", "snapshot_at"),
        Index("idx_hot_topics_field", "field"),
        Index("idx_hot_topics_heat", "heat"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, default="global")
    rank_no: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    heat: Mapped[int] = mapped_column(nullable=False, default=0)
    trend: Mapped[str] = mapped_column(String(16), nullable=False, default=HotTopicTrend.STABLE.value)
    field: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
