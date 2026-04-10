from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.repo.discover_repo import (
    count_discover_articles,
    count_hot_topics,
    create_discover_article,
    create_hot_topic,
    query_discover_articles,
    query_hot_topics,
)
from app.schemas.discover import (
    DiscoverArticleItem,
    DiscoverArticleList,
    DiscoverArticleQuery,
    DiscoverTimeRange,
    HotTopicItem,
    HotTopicList,
    Pagination,
)


DISCOVER_ARTICLE_SEEDS: tuple[dict[str, object], ...] = (
    {"id": "dca_wx_001", "platform": "weixin", "field": "Emotion", "title": "Why painful relationships are often chosen, not assigned", "author_name": "Ten Readings", "days_ago": 0, "hours_ago": 6, "views": 238000, "likes": 12400, "shares": 8900, "is_hot": True, "is_new": True, "source_url": "https://example.com/weixin/dca_wx_001"},
    {"id": "dca_wx_002", "platform": "weixin", "field": "Health", "title": "How many steps are actually enough each day", "author_name": "Health Notes", "days_ago": 1, "hours_ago": 3, "views": 185000, "likes": 9800, "shares": 6700, "is_hot": True, "is_new": True, "source_url": "https://example.com/weixin/dca_wx_002"},
    {"id": "dca_wx_003", "platform": "weixin", "field": "Finance", "title": "The three sectors that moved first after the tariff headlines", "author_name": "Finance Grid", "days_ago": 2, "hours_ago": 5, "views": 320000, "likes": 18200, "shares": 24100, "is_hot": True, "is_new": False, "source_url": "https://example.com/weixin/dca_wx_003"},
    {"id": "dca_wx_004", "platform": "weixin", "field": "Education", "title": "The ten abilities elite schools still screen for first", "author_name": "Youth Academy", "days_ago": 4, "hours_ago": 2, "views": 97000, "likes": 5600, "shares": 4200, "is_hot": False, "is_new": False, "source_url": "https://example.com/weixin/dca_wx_004"},
    {"id": "dca_wx_005", "platform": "weixin", "field": "Technology", "title": "Ten product changes that made the latest AI release matter", "author_name": "AI Frontline", "days_ago": 7, "hours_ago": 4, "views": 412000, "likes": 23100, "shares": 31200, "is_hot": True, "is_new": False, "source_url": "https://example.com/weixin/dca_wx_005"},
    {"id": "dca_wx_006", "platform": "weixin", "field": "Travel", "title": "Six lower-crowd destinations worth the next holiday window", "author_name": "Road Tripper", "days_ago": 18, "hours_ago": 0, "views": 176000, "likes": 11200, "shares": 9800, "is_hot": False, "is_new": False, "source_url": "https://example.com/weixin/dca_wx_006"},
    {"id": "dca_tt_001", "platform": "toutiao", "field": "World", "title": "The tariff escalation story dominating cross-border coverage", "author_name": "Global Wire", "days_ago": 0, "hours_ago": 2, "views": 892000, "likes": 45600, "shares": 67800, "is_hot": True, "is_new": True, "source_url": "https://example.com/toutiao/dca_tt_001"},
    {"id": "dca_tt_002", "platform": "toutiao", "field": "Sports", "title": "The playoff bracket story fans refreshed all morning", "author_name": "Sports Weekly", "days_ago": 1, "hours_ago": 5, "views": 345000, "likes": 23400, "shares": 18900, "is_hot": True, "is_new": True, "source_url": "https://example.com/toutiao/dca_tt_002"},
    {"id": "dca_tt_003", "platform": "toutiao", "field": "Finance", "title": "Why a market drop still produced pockets of breakout momentum", "author_name": "Market Feed", "days_ago": 2, "hours_ago": 8, "views": 567000, "likes": 31200, "shares": 28900, "is_hot": True, "is_new": False, "source_url": "https://example.com/toutiao/dca_tt_003"},
    {"id": "dca_tt_004", "platform": "toutiao", "field": "Technology", "title": "The foldable launch that reset the premium phone conversation", "author_name": "Tech Daily", "days_ago": 5, "hours_ago": 5, "views": 678000, "likes": 39800, "shares": 42100, "is_hot": True, "is_new": False, "source_url": "https://example.com/toutiao/dca_tt_004"},
    {"id": "dca_tt_005", "platform": "toutiao", "field": "Health", "title": "Five foods people still should not eat on an empty stomach", "author_name": "Health Times", "days_ago": 15, "hours_ago": 3, "views": 234000, "likes": 15600, "shares": 9800, "is_hot": False, "is_new": False, "source_url": "https://example.com/toutiao/dca_tt_005"},
    {"id": "dca_tt_006", "platform": "toutiao", "field": "Auto", "title": "The SUV launch headline that reframed value under one price line", "author_name": "Auto Home", "days_ago": 50, "hours_ago": 1, "views": 345000, "likes": 19800, "shares": 15600, "is_hot": False, "is_new": False, "source_url": "https://example.com/toutiao/dca_tt_006"},
)

HOT_TOPIC_SEEDS: tuple[dict[str, object], ...] = (
    {"id": "htt_001", "rank_no": 1, "title": "Tariff policy moves into a new phase", "heat": 9823400, "trend": "up", "field": "World"},
    {"id": "htt_002", "rank_no": 2, "title": "Why the equity market swung so hard this week", "heat": 8765200, "trend": "up", "field": "Finance"},
    {"id": "htt_003", "rank_no": 3, "title": "The device launch everyone watched live", "heat": 7654300, "trend": "stable", "field": "Technology"},
    {"id": "htt_004", "rank_no": 4, "title": "Holiday outbound guides jumped back up the chart", "heat": 6543200, "trend": "up", "field": "Travel"},
    {"id": "htt_005", "rank_no": 5, "title": "A celebrity separation story still holding attention", "heat": 5987600, "trend": "down", "field": "Entertainment"},
    {"id": "htt_006", "rank_no": 6, "title": "AI release notes became the mainstream story", "heat": 5432100, "trend": "up", "field": "Technology"},
    {"id": "htt_007", "rank_no": 7, "title": "Education policy updates remain in active circulation", "heat": 4876500, "trend": "stable", "field": "Education"},
    {"id": "htt_008", "rank_no": 8, "title": "Playoff schedule announcements pushed sports back up", "heat": 4321000, "trend": "up", "field": "Sports"},
    {"id": "htt_009", "rank_no": 9, "title": "Seasonal wellness checklists trend down but persist", "heat": 3987600, "trend": "down", "field": "Health"},
    {"id": "htt_010", "rank_no": 10, "title": "Auto subsidy talk stays stable in the top ten", "heat": 3654300, "trend": "stable", "field": "Auto"},
    {"id": "htt_011", "rank_no": 11, "title": "Housing direction explainers draw a smaller but steady crowd", "heat": 3210900, "trend": "down", "field": "Housing"},
    {"id": "htt_012", "rank_no": 12, "title": "Equipment reveal recaps pull defense readers back in", "heat": 2987600, "trend": "up", "field": "Military"},
)


def ensure_discover_seed_data(db: Session) -> None:
    if count_discover_articles(db) == 0:
        _seed_discover_articles(db)
    if count_hot_topics(db) == 0:
        _seed_hot_topics(db)
    db.commit()


def list_discover_articles(db: Session, filters: DiscoverArticleQuery) -> DiscoverArticleList:
    published_after = _resolve_published_after(filters.time_range)
    items, total = query_discover_articles(db, filters, published_after=published_after)
    page = filters.page
    page_size = filters.page_size
    return DiscoverArticleList(
        items=[
            DiscoverArticleItem(
                id=item.id,
                platform=item.platform,
                field=item.field,
                title=item.title,
                author=item.author_name,
                publish_time=item.publish_time,
                views=item.views,
                likes=item.likes,
                shares=item.shares,
                source_url=item.source_url,
                is_hot=item.is_hot,
                is_new=item.is_new,
            )
            for item in items
        ],
        pagination=Pagination(
            page=page,
            page_size=page_size,
            total=total,
            has_more=page * page_size < total,
        ),
    )


def list_hot_topics(db: Session, *, page: int, page_size: int) -> HotTopicList:
    items, total = query_hot_topics(db, page=page, page_size=page_size)
    return HotTopicList(
        items=[
            HotTopicItem(
                id=item.id,
                rank=item.rank_no,
                title=item.title,
                heat=item.heat,
                trend=item.trend,
                field=item.field,
            )
            for item in items
        ],
        pagination=Pagination(
            page=page,
            page_size=page_size,
            total=total,
            has_more=page * page_size < total,
        ),
    )


def _seed_discover_articles(db: Session) -> None:
    now = datetime.now(UTC)
    for item in DISCOVER_ARTICLE_SEEDS:
        create_discover_article(
            db,
            id=str(item["id"]),
            platform=str(item["platform"]),
            field=str(item["field"]),
            title=str(item["title"]),
            author_name=str(item["author_name"]),
            publish_time=now - timedelta(days=int(item["days_ago"]), hours=int(item["hours_ago"])),
            views=int(item["views"]),
            likes=int(item["likes"]),
            shares=int(item["shares"]),
            source_url=str(item["source_url"]),
            is_hot=bool(item["is_hot"]),
            is_new=bool(item["is_new"]),
            raw_json={},
        )


def _seed_hot_topics(db: Session) -> None:
    snapshot_date = date.today()
    for item in HOT_TOPIC_SEEDS:
        create_hot_topic(
            db,
            id=str(item["id"]),
            platform="global",
            rank_no=int(item["rank_no"]),
            title=str(item["title"]),
            heat=int(item["heat"]),
            trend=str(item["trend"]),
            field=str(item["field"]),
            snapshot_date=snapshot_date,
            raw_json={},
        )


def _resolve_published_after(time_range: DiscoverTimeRange) -> datetime | None:
    now = datetime.now(UTC)
    if time_range == DiscoverTimeRange.ONE_DAY:
        return now - timedelta(days=1)
    if time_range == DiscoverTimeRange.THREE_DAYS:
        return now - timedelta(days=3)
    if time_range == DiscoverTimeRange.SEVEN_DAYS:
        return now - timedelta(days=7)
    if time_range == DiscoverTimeRange.ONE_MONTH:
        return now - timedelta(days=30)
    if time_range == DiscoverTimeRange.THREE_MONTHS:
        return now - timedelta(days=90)
    return None
