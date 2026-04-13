from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from sqlalchemy.orm import Session

from app.repo.discover_repo import (
    count_hot_topics,
    get_latest_discover_articles_synced_at,
    get_latest_hot_topics_synced_at,
    query_discover_articles,
    query_hot_topics,
    upsert_discover_article,
    upsert_hot_topic,
)
from app.schemas.discover import (
    DiscoverArticleItem,
    DiscoverArticleList,
    DiscoverArticleQuery,
    DiscoverArticleRefreshResult,
    DiscoverTimeRange,
    HotTopicItem,
    HotTopicList,
    HotTopicRefreshResult,
    Pagination,
)

HOT_THRESHOLD = 10_000
LEGACY_SAMPLE_SOURCE_PATTERNS: tuple[str, ...] = (
    "https://example.com/",
    "http://example.com/",
    "https://weixin.sogou.com/weixin",
    "http://weixin.sogou.com/weixin",
    "https://so.toutiao.com/search",
    "http://so.toutiao.com/search",
)


DISCOVER_ARTICLE_SEEDS: tuple[dict[str, object], ...] = (
    {"id": "dca_wx_001", "platform": "weixin", "field": "情感", "title": "那些让你痛苦的关系，往往不是被安排，而是被自己反复选择", "author_name": "十点读书", "days_ago": 0, "hours_ago": 6, "views": 238000, "likes": 12400, "shares": 8900, "is_hot": True, "is_new": True, "source_url": None},
    {"id": "dca_wx_002", "platform": "weixin", "field": "健康", "title": "每天到底走多少步才算够？医生给出了更实用的答案", "author_name": "健康笔记", "days_ago": 1, "hours_ago": 3, "views": 185000, "likes": 9800, "shares": 6700, "is_hot": True, "is_new": True, "source_url": None},
    {"id": "dca_wx_003", "platform": "weixin", "field": "财经", "title": "关税风向突变后，率先异动的三个板块到底说明了什么", "author_name": "财经格子", "days_ago": 2, "hours_ago": 5, "views": 320000, "likes": 18200, "shares": 24100, "is_hot": True, "is_new": False, "source_url": None},
    {"id": "dca_wx_004", "platform": "weixin", "field": "教育", "title": "顶尖学校最先筛选的十种能力，很多家长仍然没有重视", "author_name": "少年学院", "days_ago": 4, "hours_ago": 2, "views": 97000, "likes": 5600, "shares": 4200, "is_hot": False, "is_new": False, "source_url": None},
    {"id": "dca_wx_005", "platform": "weixin", "field": "科技", "title": "让最新 AI 发布真正变得重要的 10 个产品变化", "author_name": "AI 前线", "days_ago": 7, "hours_ago": 4, "views": 412000, "likes": 23100, "shares": 31200, "is_hot": True, "is_new": False, "source_url": None},
    {"id": "dca_wx_006", "platform": "weixin", "field": "旅游", "title": "下个假期值得去的六个低拥挤目的地，省心也更出片", "author_name": "在路上", "days_ago": 18, "hours_ago": 0, "views": 176000, "likes": 11200, "shares": 9800, "is_hot": False, "is_new": False, "source_url": None},
    {"id": "dca_tt_001", "platform": "toutiao", "field": "国际", "title": "关税升级继续主导跨境舆论，这条线索为什么越滚越大", "author_name": "环球连线", "days_ago": 0, "hours_ago": 2, "views": 892000, "likes": 45600, "shares": 67800, "is_hot": True, "is_new": True, "source_url": None},
    {"id": "dca_tt_002", "platform": "toutiao", "field": "体育", "title": "季后赛对阵一出，球迷一上午都在刷新这张赛程图", "author_name": "体坛周报", "days_ago": 1, "hours_ago": 5, "views": 345000, "likes": 23400, "shares": 18900, "is_hot": True, "is_new": True, "source_url": None},
    {"id": "dca_tt_003", "platform": "toutiao", "field": "财经", "title": "市场回撤之下，为什么仍有一批个股走出了突破行情", "author_name": "市场快讯", "days_ago": 2, "hours_ago": 8, "views": 567000, "likes": 31200, "shares": 28900, "is_hot": True, "is_new": False, "source_url": None},
    {"id": "dca_tt_004", "platform": "toutiao", "field": "科技", "title": "这场折叠屏发布会，重新改写了高端手机的讨论方式", "author_name": "科技日报", "days_ago": 5, "hours_ago": 5, "views": 678000, "likes": 39800, "shares": 42100, "is_hot": True, "is_new": False, "source_url": None},
    {"id": "dca_tt_005", "platform": "toutiao", "field": "健康", "title": "医生提醒：这五类食物依然不建议空腹吃", "author_name": "健康时报", "days_ago": 15, "hours_ago": 3, "views": 234000, "likes": 15600, "shares": 9800, "is_hot": False, "is_new": False, "source_url": None},
    {"id": "dca_tt_006", "platform": "toutiao", "field": "汽车", "title": "这款 SUV 上市后，把十万元级家用车的性价比又拉高了", "author_name": "汽车之家", "days_ago": 50, "hours_ago": 1, "views": 345000, "likes": 19800, "shares": 15600, "is_hot": False, "is_new": False, "source_url": None},
)

HOT_TOPIC_SEEDS: tuple[dict[str, object], ...] = (
    {"id": "htt_001", "platform": "weibo", "rank_no": 1, "title": "关税政策进入新阶段", "heat": 9823400, "trend": "up", "field": "国际"},
    {"id": "htt_002", "platform": "baidu", "rank_no": 2, "title": "本周股市为何出现剧烈波动", "heat": 8765200, "trend": "up", "field": "财经"},
    {"id": "htt_003", "platform": "toutiao", "rank_no": 3, "title": "这场新品发布会为什么全网都在看直播", "heat": 7654300, "trend": "stable", "field": "科技"},
    {"id": "htt_004", "platform": "weibo", "rank_no": 4, "title": "假期出境攻略重新冲上热榜", "heat": 6543200, "trend": "up", "field": "旅游"},
    {"id": "htt_005", "platform": "baidu", "rank_no": 5, "title": "某明星分手事件为何还能持续霸榜", "heat": 5987600, "trend": "down", "field": "娱乐"},
    {"id": "htt_006", "platform": "toutiao", "rank_no": 6, "title": "AI 新版本更新说明意外成了大众话题", "heat": 5432100, "trend": "up", "field": "科技"},
    {"id": "htt_007", "platform": "weibo", "rank_no": 7, "title": "教育政策的新变化仍在持续发酵", "heat": 4876500, "trend": "stable", "field": "教育"},
    {"id": "htt_008", "platform": "baidu", "rank_no": 8, "title": "季后赛赛程官宣后，体育热度再次抬升", "heat": 4321000, "trend": "up", "field": "体育"},
    {"id": "htt_009", "platform": "toutiao", "rank_no": 9, "title": "春季养生清单热度回落但讨论仍在持续", "heat": 3987600, "trend": "down", "field": "健康"},
    {"id": "htt_010", "platform": "weibo", "rank_no": 10, "title": "汽车补贴政策讨论稳定留在前十", "heat": 3654300, "trend": "stable", "field": "汽车"},
    {"id": "htt_011", "platform": "baidu", "rank_no": 11, "title": "楼市走向解读仍然吸引着一批稳定关注者", "heat": 3210900, "trend": "down", "field": "房产"},
    {"id": "htt_012", "platform": "toutiao", "rank_no": 12, "title": "新装备亮相复盘又把军迷拉回讨论区", "heat": 2987600, "trend": "up", "field": "军事"},
)


def ensure_discover_seed_data(db: Session) -> None:
    should_seed_topics = count_hot_topics(db) == 0

    # Always normalize known seed rows so legacy placeholder/search URLs do not survive runtime upgrades.
    _seed_discover_articles(db)
    if should_seed_topics:
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
                source_url=_resolve_article_source_url(
                    source_url=item.source_url,
                    collected_at=item.collected_at,
                    raw_json=item.raw_json,
                ),
                is_sample=_is_sample_article(
                    source_url=item.source_url,
                    collected_at=item.collected_at,
                    raw_json=item.raw_json,
                ),
                is_hot=bool(item.views >= HOT_THRESHOLD),
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
        synced_at=get_latest_discover_articles_synced_at(db, platform=filters.platform),
    )


def list_hot_topics(db: Session, *, page: int, page_size: int) -> HotTopicList:
    items, total = query_hot_topics(db, page=page, page_size=page_size)
    return HotTopicList(
        items=[
            HotTopicItem(
                id=item.id,
                rank=item.rank_no,
                platform=item.platform,
                title=item.title,
                heat=item.heat,
                trend=item.trend,
                field=item.field,
                source_url=_extract_hot_topic_source_url(item.raw_json),
            )
            for item in items
        ],
        pagination=Pagination(
            page=page,
            page_size=page_size,
            total=total,
            has_more=page * page_size < total,
        ),
        synced_at=get_latest_hot_topics_synced_at(db),
    )


def build_hot_topic_refresh_result(db: Session, *, total: int) -> HotTopicRefreshResult:
    return HotTopicRefreshResult(
        total=total,
        synced_at=get_latest_hot_topics_synced_at(db),
    )


def build_discover_article_refresh_result(
    db: Session,
    *,
    total: int,
    platform: str | None = None,
) -> DiscoverArticleRefreshResult:
    return DiscoverArticleRefreshResult(
        total=total,
        synced_at=get_latest_discover_articles_synced_at(db, platform=platform),
    )


def _seed_discover_articles(db: Session) -> None:
    now = datetime.now(UTC)
    for item in DISCOVER_ARTICLE_SEEDS:
        upsert_discover_article(
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
            source_url=item.get("source_url"),
            is_hot=bool(item["is_hot"]),
            is_new=bool(item["is_new"]),
            collected_at=None,
            raw_json={"sample": True},
        )


def _seed_hot_topics(db: Session) -> None:
    snapshot_at = datetime.now(UTC)
    snapshot_date = snapshot_at.date()
    for item in HOT_TOPIC_SEEDS:
        upsert_hot_topic(
            db,
            id=str(item["id"]),
            platform=str(item.get("platform", "global")),
            rank_no=int(item["rank_no"]),
            title=str(item["title"]),
            heat=int(item["heat"]),
            trend=str(item["trend"]),
            field=str(item["field"]),
            snapshot_date=snapshot_date,
            snapshot_at=snapshot_at,
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


def _extract_hot_topic_source_url(raw_json: object) -> str | None:
    if not isinstance(raw_json, dict):
        return None
    value = raw_json.get("source_url")
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _resolve_article_source_url(
    *,
    source_url: str | None,
    collected_at: datetime | None,
    raw_json: object,
) -> str | None:
    if _is_sample_article(source_url=source_url, collected_at=collected_at, raw_json=raw_json):
        return None
    text = str(source_url or "").strip()
    return text or None


def _is_sample_article(
    *,
    source_url: str | None,
    collected_at: datetime | None,
    raw_json: object,
) -> bool:
    if collected_at is not None:
        return False
    if isinstance(raw_json, dict) and bool(raw_json.get("sample")):
        return True
    return _is_sample_source_url(source_url)


def _is_sample_source_url(source_url: str | None) -> bool:
    text = str(source_url or "").strip().lower()
    if not text:
        return False
    return any(text.startswith(pattern) for pattern in LEGACY_SAMPLE_SOURCE_PATTERNS)
