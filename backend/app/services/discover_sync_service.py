from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import json
import logging
import re
from urllib.parse import urljoin

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.repo.discover_repo import (
    get_latest_hot_topics_synced_at,
    append_hot_topics_snapshot,
    query_latest_hot_topics_by_platform,
)
from app.schemas.discover import HotTopicRefreshResult
from app.services.discover_service import HOT_THRESHOLD, HOT_TOPIC_SEEDS, build_hot_topic_refresh_result


logger = logging.getLogger(__name__)

PLATFORM_ORDER: tuple[str, ...] = ("weibo", "baidu", "toutiao")
WEIBO_HOT_URL = "https://weibo.com/ajax/statuses/hot_band"
BAIDU_HOT_URL = "https://top.baidu.com/board?tab=realtime"
TOUTIAO_HOT_URL = "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc"
DEFAULT_FIELD = "综合"
TOUTIAO_BASE_URL = "https://www.toutiao.com"


class HotTopicSyncError(Exception):
    pass


@dataclass(slots=True)
class NormalizedHotTopic:
    platform: str
    source_rank: int
    title: str
    heat: int
    trend: str
    field: str
    source_url: str | None
    raw_json: dict[str, object]


def sync_hot_topics_snapshot(
    db: Session,
    *,
    client: httpx.Client | None = None,
    limit_per_source: int = 20,
) -> int:
    grouped_topics = collect_hot_topics_from_sources(client=client, limit_per_source=limit_per_source)
    topics = _merge_hot_topics(
        _hydrate_grouped_hot_topics(
            db,
            grouped_topics,
            limit_per_source=limit_per_source,
        )
    )
    if not topics:
        raise HotTopicSyncError("all hot topic upstreams and fallbacks are unavailable")
    return persist_hot_topics_snapshot(db, topics)


def persist_hot_topics_snapshot(db: Session, topics: list[NormalizedHotTopic]) -> int:
    snapshot_at = datetime.now(UTC)
    snapshot_date = snapshot_at.date()
    payloads = [
        {
            "id": _build_topic_id(snapshot_at=snapshot_at, rank=rank),
            "platform": topic.platform,
            "rank_no": rank,
            "title": topic.title[:255],
            "heat": topic.heat,
            "trend": topic.trend,
            "field": topic.field[:32],
            "snapshot_date": snapshot_date,
            "snapshot_at": snapshot_at,
            "raw_json": {
                **topic.raw_json,
                "source_rank": topic.source_rank,
                "source_url": topic.source_url,
            },
        }
        for rank, topic in enumerate(topics, start=1)
    ]
    append_hot_topics_snapshot(db, payloads)
    db.commit()
    return len(payloads)


def sync_hot_topics_snapshot_with_new_session() -> int:
    with SessionLocal() as db:
        return sync_hot_topics_snapshot(db)


def refresh_hot_topics_snapshot(
    db: Session,
    *,
    client: httpx.Client | None = None,
    limit_per_source: int = 20,
) -> HotTopicRefreshResult:
    total = sync_hot_topics_snapshot(db, client=client, limit_per_source=limit_per_source)
    return build_hot_topic_refresh_result(db, total=total)


def get_hot_topic_sync_status(db: Session) -> HotTopicRefreshResult:
    return HotTopicRefreshResult(total=0, synced_at=get_latest_hot_topics_synced_at(db))


def fetch_hot_topics_from_sources(
    *,
    client: httpx.Client | None = None,
    limit_per_source: int = 20,
) -> list[NormalizedHotTopic]:
    merged_topics = _merge_hot_topics(
        collect_hot_topics_from_sources(client=client, limit_per_source=limit_per_source)
    )
    if not merged_topics:
        raise HotTopicSyncError("all hot topic upstreams failed")
    return merged_topics


def collect_hot_topics_from_sources(
    *,
    client: httpx.Client | None = None,
    limit_per_source: int = 20,
) -> dict[str, list[NormalizedHotTopic]]:
    grouped_topics: dict[str, list[NormalizedHotTopic]] = {}

    for platform, fetcher in (
        ("weibo", _fetch_weibo_hot_topics),
        ("baidu", _fetch_baidu_hot_topics),
        ("toutiao", _fetch_toutiao_hot_topics),
    ):
        topics: list[NormalizedHotTopic] | None = None
        last_error: Exception | None = None
        for _ in range(2):
            current_client = client or _build_http_client()
            try:
                topics = fetcher(current_client, limit=limit_per_source)
                last_error = None
                break
            except Exception as exc:
                last_error = exc
            finally:
                if client is None:
                    current_client.close()

        if last_error is not None:
            logger.warning("hot topic sync skipped %s upstream: %s", platform, last_error)
            continue

        if topics:
            grouped_topics[platform] = topics

    return grouped_topics


def _hydrate_grouped_hot_topics(
    db: Session,
    grouped_topics: dict[str, list[NormalizedHotTopic]],
    *,
    limit_per_source: int,
) -> dict[str, list[NormalizedHotTopic]]:
    hydrated_topics: dict[str, list[NormalizedHotTopic]] = {}

    for platform in PLATFORM_ORDER:
        platform_topics = list(grouped_topics.get(platform, []))[:limit_per_source]
        original_count = len(platform_topics)
        source_labels: list[str] = []

        if len(platform_topics) < limit_per_source:
            added_count, used_sources = _backfill_platform_topics(
                db,
                platform_topics,
                platform=platform,
                limit=limit_per_source,
            )
            source_labels.extend(used_sources)
            if added_count > 0:
                logger.info(
                    "hot topic sync backfilled %s with %s items via %s",
                    platform,
                    added_count,
                    ",".join(source_labels),
                )

        if platform_topics:
            hydrated_topics[platform] = platform_topics
        elif original_count == 0:
            logger.warning("hot topic sync has no live or fallback items for %s", platform)

    return hydrated_topics


def _backfill_platform_topics(
    db: Session,
    target_topics: list[NormalizedHotTopic],
    *,
    platform: str,
    limit: int,
) -> tuple[int, list[str]]:
    total_added = 0
    used_sources: list[str] = []

    snapshot_topics = [
        _normalized_hot_topic_from_snapshot(item)
        for item in query_latest_hot_topics_by_platform(db, platform, limit=limit)
    ]
    added_from_snapshot = _append_unique_hot_topics(
        target_topics,
        snapshot_topics,
        limit=limit,
    )
    if added_from_snapshot > 0:
        total_added += added_from_snapshot
        used_sources.append("snapshot")

    if len(target_topics) < limit:
        added_from_seed = _append_unique_hot_topics(
            target_topics,
            _seed_hot_topics_for_platform(platform, limit=limit),
            limit=limit,
        )
        if added_from_seed > 0:
            total_added += added_from_seed
            used_sources.append("seed")

    return total_added, used_sources


def _append_unique_hot_topics(
    target_topics: list[NormalizedHotTopic],
    fallback_topics: list[NormalizedHotTopic],
    *,
    limit: int,
) -> int:
    seen_keys = {(item.platform, item.title) for item in target_topics}
    added_count = 0

    for topic in fallback_topics:
        if len(target_topics) >= limit:
            break

        topic_key = (topic.platform, topic.title)
        if topic_key in seen_keys:
            continue

        target_topics.append(topic)
        seen_keys.add(topic_key)
        added_count += 1

    return added_count


def _normalized_hot_topic_from_snapshot(topic: object) -> NormalizedHotTopic:
    raw_json = dict(getattr(topic, "raw_json", {}) or {})
    source_url = raw_json.get("source_url")
    return NormalizedHotTopic(
        platform=str(getattr(topic, "platform")),
        source_rank=_to_int(raw_json.get("source_rank"), int(getattr(topic, "rank_no"))),
        title=str(getattr(topic, "title")),
        heat=int(getattr(topic, "heat")),
        trend=str(getattr(topic, "trend")),
        field=str(getattr(topic, "field") or DEFAULT_FIELD),
        source_url=str(source_url) if source_url else None,
        raw_json=raw_json,
    )


def _seed_hot_topics_for_platform(platform: str, *, limit: int) -> list[NormalizedHotTopic]:
    topics: list[NormalizedHotTopic] = []
    for item in HOT_TOPIC_SEEDS:
        if str(item.get("platform", "global")) != platform:
            continue

        title = _clean_title(item.get("title"))
        if not title:
            continue

        topics.append(
            NormalizedHotTopic(
                platform=platform,
                source_rank=_to_int(item.get("rank_no"), len(topics) + 1),
                title=title,
                heat=_to_int(item.get("heat")),
                trend=str(item.get("trend") or "stable"),
                field=_clean_title(item.get("field")) or DEFAULT_FIELD,
                source_url=None,
                raw_json={"seed": True},
            )
        )
        if len(topics) >= limit:
            break

    return topics


def _build_http_client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        follow_redirects=True,
        timeout=settings.discover_hot_sync_timeout_seconds,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
    )


def _fetch_weibo_hot_topics(client: httpx.Client, *, limit: int) -> list[NormalizedHotTopic]:
    response = client.get(
        WEIBO_HOT_URL,
        headers={
            "Referer": "https://weibo.com/",
            "Accept": "application/json, text/plain, */*",
        },
    )
    response.raise_for_status()
    payload = response.json()
    items = payload.get("data", {}).get("band_list", [])

    topics: list[NormalizedHotTopic] = []
    for index, item in enumerate(items[:limit], start=1):
        if not isinstance(item, dict):
            continue
        title = _clean_title(item.get("note") or item.get("word"))
        if not title:
            continue
        heat = _to_int(item.get("raw_hot") or item.get("num"))
        if heat < HOT_THRESHOLD:
            continue
        source_rank = _to_int(item.get("realpos") or item.get("rank"), index)
        topics.append(
            NormalizedHotTopic(
                platform="weibo",
                source_rank=source_rank,
                title=title,
                heat=heat,
                trend="stable",
                field=_normalize_weibo_field(str(item.get("field_tag") or DEFAULT_FIELD)),
                source_url=_resolve_weibo_source_url(item),
                raw_json=dict(item),
            )
        )
    return topics


def _fetch_baidu_hot_topics(client: httpx.Client, *, limit: int) -> list[NormalizedHotTopic]:
    response = client.get(BAIDU_HOT_URL)
    response.raise_for_status()
    items = _extract_baidu_hot_list(response.text)

    topics: list[NormalizedHotTopic] = []
    for index, item in enumerate(items[:limit], start=1):
        if not isinstance(item, dict):
            continue
        title = _clean_title(item.get("word"))
        if not title:
            continue
        heat = _to_int(item.get("hotScore"))
        if heat < HOT_THRESHOLD:
            continue
        topics.append(
            NormalizedHotTopic(
                platform="baidu",
                source_rank=index,
                title=title,
                heat=heat,
                trend=_normalize_baidu_trend(str(item.get("hotChange") or "")),
                field=DEFAULT_FIELD,
                source_url=_resolve_baidu_source_url(item),
                raw_json=dict(item),
            )
        )
    return topics


def _fetch_toutiao_hot_topics(client: httpx.Client, *, limit: int) -> list[NormalizedHotTopic]:
    response = client.get(
        TOUTIAO_HOT_URL,
        headers={"Accept": "application/json, text/plain, */*"},
    )
    response.raise_for_status()
    items = response.json().get("data", [])

    topics: list[NormalizedHotTopic] = []
    for index, item in enumerate(items[:limit], start=1):
        if not isinstance(item, dict):
            continue
        title = _clean_title(item.get("Title") or item.get("QueryWord"))
        if not title:
            continue
        heat = _to_int(item.get("HotValue"))
        if heat < HOT_THRESHOLD:
            continue
        topics.append(
            NormalizedHotTopic(
                platform="toutiao",
                source_rank=index,
                title=title,
                heat=heat,
                trend="stable",
                field=DEFAULT_FIELD,
                source_url=_resolve_toutiao_source_url(item),
                raw_json=dict(item),
            )
        )
    return topics


def _merge_hot_topics(grouped_topics: dict[str, list[NormalizedHotTopic]]) -> list[NormalizedHotTopic]:
    if not grouped_topics:
        return []

    merged: list[NormalizedHotTopic] = []
    max_length = max(len(topics) for topics in grouped_topics.values())
    for offset in range(max_length):
        for platform in PLATFORM_ORDER:
            topics = grouped_topics.get(platform, [])
            if offset < len(topics):
                merged.append(topics[offset])
    return merged


def _extract_baidu_hot_list(html: str) -> list[dict[str, object]]:
    key = 'hotList","content":'
    start = html.find(key)
    if start < 0:
        raise HotTopicSyncError("baidu hot list payload is missing")

    decoder = json.JSONDecoder()
    payload, _ = decoder.raw_decode(html[start + len(key):])
    if not isinstance(payload, list):
        raise HotTopicSyncError("baidu hot list payload is invalid")
    return payload


def _normalize_weibo_field(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        return DEFAULT_FIELD
    cleaned = re.sub(r"领域热度.*$", "", cleaned)
    cleaned = re.sub(r"TOP\d+$", "", cleaned)
    return cleaned.strip() or DEFAULT_FIELD


def _normalize_baidu_trend(value: str) -> str:
    normalized = value.lower().strip()
    if normalized in {"rise", "up"}:
        return "up"
    if normalized in {"fall", "down"}:
        return "down"
    return "stable"


def _build_topic_id(*, snapshot_at: datetime, rank: int) -> str:
    return f"htt_{snapshot_at.strftime('%Y%m%d%H%M%S%f')}_{rank:03d}"


def _resolve_weibo_source_url(item: dict[str, object]) -> str | None:
    mblog = item.get("mblog")
    if isinstance(mblog, dict):
        mblog_id = str(mblog.get("id") or "").strip()
        if mblog_id:
            return f"https://m.weibo.cn/detail/{mblog_id}"

    scheme = str(item.get("scheme") or "").strip()
    if scheme.startswith(("https://", "http://")):
        return scheme
    return None


def _resolve_baidu_source_url(item: dict[str, object]) -> str | None:
    index_url = str(item.get("indexUrl") or "").strip()
    if index_url.startswith(("https://", "http://")) and "/s?" not in index_url:
        return index_url

    show_payload = item.get("show")
    if isinstance(show_payload, list):
        for card in show_payload:
            if not isinstance(card, dict):
                continue
            candidate = str(card.get("url") or card.get("link") or "").strip()
            if candidate.startswith(("https://", "http://")) and "baidu.com/s?" not in candidate:
                return candidate
    return None


def _resolve_toutiao_source_url(item: dict[str, object]) -> str | None:
    text = str(item.get("Url") or "").strip()
    if text.startswith(("https://", "http://")):
        return text
    if text.startswith("/"):
        return urljoin(TOUTIAO_BASE_URL, text)
    return None


def _clean_title(value: object) -> str:
    return str(value or "").strip()


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
