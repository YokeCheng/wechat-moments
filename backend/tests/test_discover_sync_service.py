from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.repo.discover_repo import count_hot_topics
from app.services.discover_sync_service import sync_hot_topics_snapshot
from app.workers import hot_topic_sync_worker


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "discover-sync"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def _build_transport(*, fail_baidu: bool = False) -> httpx.MockTransport:
    weibo_payload = {
        "data": {
            "band_list": [
                {"note": "微博热搜A", "realpos": 1, "raw_hot": 1200000, "field_tag": "社会领域热度TOP1"},
                {"note": "微博热搜B", "realpos": 2, "raw_hot": 980000, "field_tag": "科技领域热度TOP1"},
            ]
        }
    }
    baidu_items = [
        {"word": "百度热搜A", "hotScore": "7800000", "hotChange": "rise", "rawUrl": "https://www.baidu.com/s?wd=A"},
        {"word": "百度热搜B", "hotScore": "6500000", "hotChange": "fall", "rawUrl": "https://www.baidu.com/s?wd=B"},
    ]
    baidu_html = f'<script>window.__APP_DATA__={{"hotList","content":{json.dumps(baidu_items, ensure_ascii=False)}}};</script>'
    toutiao_payload = {
        "data": [
            {"Title": "头条热榜A", "HotValue": "87000000", "Url": "https://www.toutiao.com/trending/a"},
            {"Title": "头条热榜B", "HotValue": "76000000", "Url": "https://www.toutiao.com/trending/b"},
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url == "https://weibo.com/ajax/statuses/hot_band":
            return httpx.Response(200, json=weibo_payload)
        if url == "https://top.baidu.com/board?tab=realtime":
            if fail_baidu:
                return httpx.Response(500, text="upstream error")
            return httpx.Response(200, text=baidu_html, headers={"content-type": "text/html; charset=utf-8"})
        if url == "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc":
            return httpx.Response(200, json=toutiao_payload)
        return httpx.Response(404, text=url)

    return httpx.MockTransport(handler)


def test_hot_topic_sync_replaces_seed_snapshot_with_multi_source_data(client: TestClient) -> None:
    with httpx.Client(transport=_build_transport()) as sync_client:
        with SessionLocal() as session:
            total = sync_hot_topics_snapshot(session, client=sync_client, limit_per_source=2)
            stored_total = count_hot_topics(session)

    assert total == 6
    assert stored_total == 18

    response = client.get(
        "/api/v1/discover/hot-topics",
        params={"page": 1, "page_size": 6},
        headers=_auth_headers(client),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["pagination"] == {
        "page": 1,
        "page_size": 6,
        "total": 6,
        "has_more": False,
    }
    assert payload["synced_at"] is not None
    assert [item["rank"] for item in payload["items"]] == [1, 2, 3, 4, 5, 6]
    assert [item["platform"] for item in payload["items"]] == [
        "weibo",
        "baidu",
        "toutiao",
        "weibo",
        "baidu",
        "toutiao",
    ]
    assert payload["items"][0]["title"] == "微博热搜A"
    assert payload["items"][1]["trend"] == "up"
    assert payload["items"][4]["trend"] == "down"
    assert payload["items"][0]["source_url"] is None
    assert payload["items"][1]["source_url"] is None
    assert payload["items"][2]["source_url"] == "https://www.toutiao.com/trending/a"


def test_hot_topic_sync_tolerates_single_source_failure(client: TestClient) -> None:
    with httpx.Client(transport=_build_transport(fail_baidu=True)) as sync_client:
        with SessionLocal() as session:
            total = sync_hot_topics_snapshot(session, client=sync_client, limit_per_source=2)

    assert total == 6

    response = client.get(
        "/api/v1/discover/hot-topics",
        params={"page": 1, "page_size": 10},
        headers=_auth_headers(client),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["pagination"]["total"] == 6
    assert [item["platform"] for item in payload["items"]] == [
        "weibo",
        "baidu",
        "toutiao",
        "weibo",
        "baidu",
        "toutiao",
    ]


def test_hot_topic_sync_reuses_previous_snapshot_when_single_source_temporarily_fails(
    client: TestClient,
) -> None:
    with httpx.Client(transport=_build_transport()) as sync_client:
        with SessionLocal() as session:
            first_total = sync_hot_topics_snapshot(session, client=sync_client, limit_per_source=2)

    first_response = client.get(
        "/api/v1/discover/hot-topics",
        params={"page": 1, "page_size": 6},
        headers=_auth_headers(client),
    )
    assert first_response.status_code == 200
    first_payload = first_response.json()
    first_baidu_titles = [
        item["title"] for item in first_payload["items"] if item["platform"] == "baidu"
    ]

    with httpx.Client(transport=_build_transport(fail_baidu=True)) as sync_client:
        with SessionLocal() as session:
            second_total = sync_hot_topics_snapshot(session, client=sync_client, limit_per_source=2)

    assert first_total == 6
    assert second_total == 6

    response = client.get(
        "/api/v1/discover/hot-topics",
        params={"page": 1, "page_size": 6},
        headers=_auth_headers(client),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["items"][1]["platform"] == "baidu"
    assert payload["items"][4]["platform"] == "baidu"
    assert [item["title"] for item in payload["items"] if item["platform"] == "baidu"] == first_baidu_titles


def test_hot_topic_sync_loop_runs_on_interval(monkeypatch: object) -> None:
    call_count = 0
    stop_event = asyncio.Event()

    async def fake_sync() -> None:
        nonlocal call_count
        call_count += 1
        stop_event.set()

    monkeypatch.setattr(
        hot_topic_sync_worker,
        "get_settings",
        lambda: SimpleNamespace(discover_hot_sync_interval_seconds=0.01),
    )
    monkeypatch.setattr(hot_topic_sync_worker, "sync_hot_topics_once_async", fake_sync)

    asyncio.run(hot_topic_sync_worker.run_hot_topic_sync_loop(stop_event))

    assert call_count == 1
