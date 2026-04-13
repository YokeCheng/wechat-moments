from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from hashlib import md5
from html import unescape
import json
import logging
import re
from urllib.parse import urljoin

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.repo.discover_repo import get_latest_discover_articles_synced_at, upsert_discover_article
from app.schemas.discover import DiscoverArticleRefreshResult
from app.services.discover_service import HOT_THRESHOLD, build_discover_article_refresh_result


logger = logging.getLogger(__name__)

CHINA_TZ = timezone(timedelta(hours=8))
DISCOVER_ARTICLE_SEARCH_QUERIES: dict[str, dict[str, tuple[str, ...]]] = {
    "weixin": {
        "情感": ("情感",),
        "健康": ("健康",),
        "财经": ("财经",),
        "教育": ("教育",),
        "科技": ("科技",),
        "旅游": ("旅游",),
    },
    "toutiao": {
        "国际": ("俄乌", "特朗普"),
        "体育": ("CBA", "足球"),
        "财经": ("基金", "A股"),
        "科技": ("AI", "OpenAI"),
        "健康": ("减肥", "医院"),
        "汽车": ("新能源车", "汽车"),
    },
}
TOUTIAO_SEARCH_URL = "https://so.toutiao.com/search"
WEIXIN_SEARCH_URL = "https://weixin.sogou.com/weixin"
TOUTIAO_BASE_URL = "https://www.toutiao.com"
SCRIPT_CARD_PATTERN = re.compile(
    r'<script[^>]*data-druid-card-data-id="[^"]+"[^>]*type="application/json"[^>]*>(.*?)</script>',
    re.S,
)
WEIXIN_RESULT_BLOCK_PATTERN = re.compile(
    r'(<li[^>]+id="sogou_vr_11002601_box_\d+"[^>]*>.*?)(?=<li[^>]+id="sogou_vr_11002601_box_\d+"|<div id="pagebar_container"|</ul>)',
    re.S,
)
WEIXIN_TITLE_PATTERN = re.compile(r"<h3[^>]*>\s*<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", re.S)
WEIXIN_AUTHOR_PATTERN = re.compile(r'<span class="all-time-y2">([^<]+)</span>')
WEIXIN_TIME_PATTERN = re.compile(r"timeConvert\('(\d+)'\)")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")


class DiscoverArticleSyncError(Exception):
    pass


@dataclass(slots=True)
class NormalizedDiscoverArticle:
    id: str
    platform: str
    field: str
    title: str
    author_name: str
    publish_time: datetime
    views: int
    likes: int
    shares: int
    source_url: str | None
    is_hot: bool
    is_new: bool
    collected_at: datetime
    raw_json: dict[str, object]


def sync_discover_articles_snapshot(
    db: Session,
    *,
    client: httpx.Client | None = None,
    limit_per_field: int | None = None,
) -> int:
    synced_at = datetime.now(UTC)
    articles = collect_discover_articles_from_sources(
        client=client,
        synced_at=synced_at,
        limit_per_field=limit_per_field,
    )
    if not articles:
        raise DiscoverArticleSyncError("all discover article upstreams failed")
    return persist_discover_articles(db, articles)


def persist_discover_articles(db: Session, articles: list[NormalizedDiscoverArticle]) -> int:
    for article in articles:
        upsert_discover_article(
            db,
            id=article.id,
            platform=article.platform,
            field=article.field,
            title=article.title,
            author_name=article.author_name,
            publish_time=article.publish_time,
            views=article.views,
            likes=article.likes,
            shares=article.shares,
            source_url=article.source_url,
            is_hot=article.is_hot,
            is_new=article.is_new,
            collected_at=article.collected_at,
            raw_json=article.raw_json,
        )
    db.commit()
    return len(articles)


def sync_discover_articles_snapshot_with_new_session() -> int:
    with SessionLocal() as db:
        return sync_discover_articles_snapshot(db)


def refresh_discover_articles_snapshot(
    db: Session,
    *,
    client: httpx.Client | None = None,
    limit_per_field: int | None = None,
) -> DiscoverArticleRefreshResult:
    total = sync_discover_articles_snapshot(db, client=client, limit_per_field=limit_per_field)
    return build_discover_article_refresh_result(db, total=total)


def get_discover_article_sync_status(db: Session) -> DiscoverArticleRefreshResult:
    return DiscoverArticleRefreshResult(total=0, synced_at=get_latest_discover_articles_synced_at(db))


def collect_discover_articles_from_sources(
    *,
    client: httpx.Client | None = None,
    synced_at: datetime,
    limit_per_field: int | None = None,
) -> list[NormalizedDiscoverArticle]:
    settings = get_settings()
    effective_limit = limit_per_field or settings.discover_article_sync_limit_per_field

    if client is not None:
        return _collect_discover_articles(
            client=client,
            synced_at=synced_at,
            limit_per_field=effective_limit,
        )

    return _collect_discover_articles_with_fresh_clients(
        synced_at=synced_at,
        limit_per_field=effective_limit,
    )


def _collect_discover_articles(
    *,
    client: httpx.Client,
    synced_at: datetime,
    limit_per_field: int,
) -> list[NormalizedDiscoverArticle]:
    articles_by_id: dict[str, NormalizedDiscoverArticle] = {}

    for platform, field_queries in DISCOVER_ARTICLE_SEARCH_QUERIES.items():
        fetcher = _fetch_weixin_articles if platform == "weixin" else _fetch_toutiao_articles
        for field, search_keywords in field_queries.items():
            for search_keyword in search_keywords:
                try:
                    articles = fetcher(
                        client,
                        field=field,
                        search_keyword=search_keyword,
                        synced_at=synced_at,
                        limit=limit_per_field,
                    )
                except Exception as exc:
                    logger.warning(
                        "discover article sync skipped %s/%s upstream %s: %s",
                        platform,
                        field,
                        search_keyword,
                        exc,
                    )
                    continue

                _merge_articles(articles_by_id, articles)
                if _count_field_articles(articles_by_id, platform=platform, field=field) >= limit_per_field:
                    break

    return _sort_articles(articles_by_id)


def _collect_discover_articles_with_fresh_clients(
    *,
    synced_at: datetime,
    limit_per_field: int,
) -> list[NormalizedDiscoverArticle]:
    articles_by_id: dict[str, NormalizedDiscoverArticle] = {}

    for platform, field_queries in DISCOVER_ARTICLE_SEARCH_QUERIES.items():
        fetcher = _fetch_weixin_articles if platform == "weixin" else _fetch_toutiao_articles
        for field, search_keywords in field_queries.items():
            for search_keyword in search_keywords:
                try:
                    with _build_http_client() as client:
                        articles = fetcher(
                            client,
                            field=field,
                            search_keyword=search_keyword,
                            synced_at=synced_at,
                            limit=limit_per_field,
                        )
                except Exception as exc:
                    logger.warning(
                        "discover article sync skipped %s/%s upstream %s: %s",
                        platform,
                        field,
                        search_keyword,
                        exc,
                    )
                    continue

                _merge_articles(articles_by_id, articles)
                if _count_field_articles(articles_by_id, platform=platform, field=field) >= limit_per_field:
                    break

    return _sort_articles(articles_by_id)


def _should_replace_article(
    current: NormalizedDiscoverArticle,
    candidate: NormalizedDiscoverArticle,
) -> bool:
    if bool(candidate.source_url) and not bool(current.source_url):
        return True
    if candidate.views != current.views:
        return candidate.views > current.views
    if candidate.likes != current.likes:
        return candidate.likes > current.likes
    return candidate.publish_time > current.publish_time


def _merge_articles(
    articles_by_id: dict[str, NormalizedDiscoverArticle],
    articles: list[NormalizedDiscoverArticle],
) -> None:
    for article in articles:
        existing = articles_by_id.get(article.id)
        if existing is None or _should_replace_article(existing, article):
            articles_by_id[article.id] = article


def _sort_articles(
    articles_by_id: dict[str, NormalizedDiscoverArticle],
) -> list[NormalizedDiscoverArticle]:
    return sorted(
        articles_by_id.values(),
        key=lambda item: (item.publish_time, item.views, item.likes),
        reverse=True,
    )


def _count_field_articles(
    articles_by_id: dict[str, NormalizedDiscoverArticle],
    *,
    platform: str,
    field: str,
) -> int:
    return sum(
        1
        for article in articles_by_id.values()
        if article.platform == platform and article.field == field
    )


def _build_http_client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        follow_redirects=True,
        timeout=settings.discover_article_sync_timeout_seconds,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
    )


def _fetch_toutiao_articles(
    client: httpx.Client,
    *,
    field: str,
    search_keyword: str,
    synced_at: datetime,
    limit: int,
) -> list[NormalizedDiscoverArticle]:
    response = client.get(
        TOUTIAO_SEARCH_URL,
        params={
            "dvpf": "pc",
            "keyword": search_keyword,
            "source": "input",
            "pd": "synthesis",
        },
    )
    response.raise_for_status()

    articles: list[NormalizedDiscoverArticle] = []
    for raw_payload in SCRIPT_CARD_PATTERN.findall(response.text):
        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            continue

        data = payload.get("data")
        if not isinstance(data, dict):
            continue

        title = _normalize_html_text(data.get("title"))
        author_name = _normalize_html_text(data.get("source"))
        publish_time = _parse_toutiao_publish_time(data)
        if not title or not author_name or publish_time is None:
            continue

        source_url = _resolve_toutiao_article_source_url(data)
        source_key = (
            f"{field}|"
            + (
            str(data.get("group_id") or "").strip()
            or str(data.get("id") or "").strip()
            or source_url
            or f"{title}|{author_name}|{publish_time.isoformat()}"
            )
        )
        views = _to_int(data.get("read_count"))
        likes = _to_int(data.get("digg_count"))
        shares = _to_int(data.get("forward_count"))
        article = NormalizedDiscoverArticle(
            id=_build_article_id("toutiao", source_key),
            platform="toutiao",
            field=field,
            title=title[:255],
            author_name=author_name[:128],
            publish_time=publish_time,
            views=views,
            likes=likes,
            shares=shares,
            source_url=source_url,
            is_hot=views >= HOT_THRESHOLD,
            is_new=publish_time >= synced_at - timedelta(days=3),
            collected_at=synced_at,
            raw_json={
                "source": "toutiao_search",
                "search_keyword": search_keyword,
                "article_url": data.get("article_url"),
                "share_url": data.get("share_url"),
                "source_url": data.get("source_url"),
                "read_count": views,
                "digg_count": likes,
                "forward_count": shares,
                "comment_count": _to_int(data.get("comment_count")),
                "group_id": str(data.get("group_id") or ""),
            },
        )
        articles.append(article)
        if len(articles) >= limit:
            break

    return articles


def _fetch_weixin_articles(
    client: httpx.Client,
    *,
    field: str,
    search_keyword: str,
    synced_at: datetime,
    limit: int,
) -> list[NormalizedDiscoverArticle]:
    response = client.get(
        WEIXIN_SEARCH_URL,
        params={
            "type": 2,
            "query": search_keyword,
        },
        headers={"Referer": "https://weixin.sogou.com/"},
    )
    response.raise_for_status()

    articles: list[NormalizedDiscoverArticle] = []
    for block in WEIXIN_RESULT_BLOCK_PATTERN.findall(response.text):
        title_match = WEIXIN_TITLE_PATTERN.search(block)
        author_match = WEIXIN_AUTHOR_PATTERN.search(block)
        time_match = WEIXIN_TIME_PATTERN.search(block)
        if title_match is None or author_match is None or time_match is None:
            continue

        title = _normalize_html_text(title_match.group(2))
        author_name = _normalize_html_text(author_match.group(1))
        publish_timestamp = _to_int(time_match.group(1))
        if not title or not author_name or publish_timestamp <= 0:
            continue

        publish_time = datetime.fromtimestamp(publish_timestamp, tz=UTC)
        result_path = title_match.group(1).replace("&amp;", "&")
        article = NormalizedDiscoverArticle(
            id=_build_article_id(
                "weixin",
                f"{field}|{title}|{author_name}|{publish_timestamp}",
            ),
            platform="weixin",
            field=field,
            title=title[:255],
            author_name=author_name[:128],
            publish_time=publish_time,
            views=0,
            likes=0,
            shares=0,
            source_url=None,
            is_hot=False,
            is_new=publish_time >= synced_at - timedelta(days=3),
            collected_at=synced_at,
            raw_json={
                "source": "weixin_search",
                "search_keyword": search_keyword,
                "result_url": urljoin("https://weixin.sogou.com", result_path),
                "source_url": None,
            },
        )
        articles.append(article)
        if len(articles) >= limit:
            break

    return articles


def _parse_toutiao_publish_time(data: dict[str, object]) -> datetime | None:
    text = str(data.get("datetime") or "").strip()
    if text:
        try:
            local_dt = datetime.strptime(text, "%Y-%m-%d %H:%M:%S").replace(tzinfo=CHINA_TZ)
            return local_dt.astimezone(UTC)
        except ValueError:
            pass

    for key in ("display_time", "behot_time", "create_time"):
        timestamp = _to_int(data.get(key))
        if timestamp > 0:
            return datetime.fromtimestamp(timestamp, tz=UTC)
    return None


def _resolve_toutiao_article_source_url(data: dict[str, object]) -> str | None:
    for key in ("article_url", "share_url", "source_url"):
        candidate = _normalize_url(data.get(key))
        if not candidate:
            continue
        if "so.toutiao.com/search" in candidate:
            continue
        return candidate
    return None


def _normalize_url(value: object) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text.startswith("//"):
        return f"https:{text}"
    if text.startswith("/"):
        return urljoin(TOUTIAO_BASE_URL, text)
    if text.startswith(("https://", "http://")):
        return text
    return None


def _build_article_id(platform: str, source_key: str) -> str:
    digest = md5(f"{platform}|{source_key}".encode("utf-8")).hexdigest()[:16]
    prefix = "wx" if platform == "weixin" else "tt"
    return f"dca_{prefix}_{digest}"


def _normalize_html_text(value: object) -> str:
    text = unescape(str(value or ""))
    text = text.replace("<!--red_beg-->", "").replace("<!--red_end-->", "")
    text = HTML_TAG_PATTERN.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def _to_int(value: object, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    text = str(value).replace(",", "").strip()
    if not text:
        return default
    match = re.search(r"-?\d+", text)
    if match is None:
        return default
    return int(match.group(0))
