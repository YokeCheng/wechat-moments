from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.services.discover_article_sync_service import sync_discover_articles_snapshot
from app.workers import discover_article_sync_worker


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "discover-article-sync"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def _build_transport(
    *,
    fail_weixin: bool = False,
    fail_toutiao: bool = False,
) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if request.url.host == "so.toutiao.com":
            if fail_toutiao:
                return httpx.Response(500, text="toutiao upstream error")
            keyword = request.url.params.get("keyword", "未知")
            return httpx.Response(
                200,
                text=_build_toutiao_html(keyword),
                headers={"content-type": "text/html; charset=utf-8"},
            )
        if request.url.host == "weixin.sogou.com":
            if fail_weixin:
                return httpx.Response(500, text="weixin upstream error")
            keyword = request.url.params.get("query", "未知")
            return httpx.Response(
                200,
                text=_build_weixin_html(keyword),
                headers={"content-type": "text/html; charset=utf-8"},
            )
        return httpx.Response(404, text=url)

    return httpx.MockTransport(handler)


def _build_toutiao_html(keyword: str) -> str:
    payload = {
        "data": {
            "title": f"{keyword}头条爆文",
            "source": f"{keyword}号",
            "article_url": f"https://example.com/articles/{keyword}",
            "share_url": f"https://share.example.com/articles/{keyword}",
            "source_url": f"https://www.toutiao.com/article/{keyword}",
            "read_count": 23000,
            "digg_count": 310,
            "forward_count": 88,
            "comment_count": 12,
            "datetime": "2026-04-10 11:40:39",
            "group_id": f"group-{keyword}",
        }
    }
    return (
        '<script data-druid-card-data-id="search-bar" type="application/json">'
        '{"data":{"template_key":"SearchBar"}}</script>'
        f'<script data-druid-card-data-id="article-{keyword}" type="application/json">'
        f"{json.dumps(payload, ensure_ascii=False)}</script>"
    )


def _build_weixin_html(keyword: str) -> str:
    return f"""
<!doctype html>
<html>
  <body>
    <ul class="news-list">
      <li id="sogou_vr_11002601_box_0">
        <div class="txt-box">
          <h3>
            <a target="_blank" href="/link?url={keyword}&amp;type=2&amp;query={keyword}">
              <em><!--red_beg-->{keyword}<!--red_end--></em>公众号爆文
            </a>
          </h3>
          <div class="s-p">
            <span class="all-time-y2">{keyword}日报</span>
            <span class="s2"><script>document.write(timeConvert('1776072321'))</script></span>
          </div>
        </div>
      </li>
    </ul>
    <div id="pagebar_container"></div>
  </body>
</html>
"""


def test_discover_article_sync_persists_live_articles_and_exposes_synced_at(
    client: TestClient,
) -> None:
    with httpx.Client(transport=_build_transport()) as sync_client:
        with SessionLocal() as session:
            total = sync_discover_articles_snapshot(session, client=sync_client, limit_per_field=1)

    assert total == 12

    toutiao_response = client.get(
        "/api/v1/discover/articles",
        params={"platform": "toutiao", "page": 1, "page_size": 10},
        headers=_auth_headers(client),
    )
    assert toutiao_response.status_code == 200
    toutiao_payload = toutiao_response.json()
    assert toutiao_payload["pagination"]["total"] == 6
    assert toutiao_payload["synced_at"] is not None
    assert all(item["is_sample"] is False for item in toutiao_payload["items"])
    assert all(item["platform"] == "toutiao" for item in toutiao_payload["items"])
    assert all(item["source_url"] for item in toutiao_payload["items"])

    weixin_response = client.get(
        "/api/v1/discover/articles",
        params={"platform": "weixin", "page": 1, "page_size": 10},
        headers=_auth_headers(client),
    )
    assert weixin_response.status_code == 200
    weixin_payload = weixin_response.json()
    assert weixin_payload["pagination"]["total"] == 6
    assert weixin_payload["synced_at"] is not None
    assert all(item["is_sample"] is False for item in weixin_payload["items"])
    assert all(item["platform"] == "weixin" for item in weixin_payload["items"])
    assert all(item["source_url"] is None for item in weixin_payload["items"])


def test_discover_article_sync_tolerates_single_platform_failure(client: TestClient) -> None:
    with httpx.Client(transport=_build_transport(fail_weixin=True)) as sync_client:
        with SessionLocal() as session:
            total = sync_discover_articles_snapshot(session, client=sync_client, limit_per_field=1)

    assert total == 6

    toutiao_response = client.get(
        "/api/v1/discover/articles",
        params={"platform": "toutiao", "page": 1, "page_size": 10},
        headers=_auth_headers(client),
    )
    assert toutiao_response.status_code == 200
    toutiao_payload = toutiao_response.json()
    assert toutiao_payload["pagination"]["total"] == 6
    assert all(item["is_sample"] is False for item in toutiao_payload["items"])

    weixin_response = client.get(
        "/api/v1/discover/articles",
        params={"platform": "weixin", "page": 1, "page_size": 10},
        headers=_auth_headers(client),
    )
    assert weixin_response.status_code == 200
    weixin_payload = weixin_response.json()
    assert weixin_payload["pagination"]["total"] == 6
    assert weixin_payload["synced_at"] is None
    assert all(item["is_sample"] is True for item in weixin_payload["items"])


def test_discover_article_sync_loop_runs_on_interval(monkeypatch: object) -> None:
    call_count = 0
    stop_event = asyncio.Event()

    async def fake_sync() -> None:
        nonlocal call_count
        call_count += 1
        stop_event.set()

    monkeypatch.setattr(
        discover_article_sync_worker,
        "get_settings",
        lambda: SimpleNamespace(discover_article_sync_interval_seconds=0.01),
    )
    monkeypatch.setattr(
        discover_article_sync_worker,
        "sync_discover_articles_once_async",
        fake_sync,
    )

    asyncio.run(discover_article_sync_worker.run_discover_article_sync_loop(stop_event))

    assert call_count == 1
