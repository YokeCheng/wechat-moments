from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.repo.discover_repo import get_discover_article_by_id
from app.api.v1.endpoints import discover as discover_endpoint
from app.schemas.discover import DiscoverArticleRefreshResult, HotTopicRefreshResult


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "discoverer"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_discover_articles_support_filters_and_pagination(client: TestClient) -> None:
    response = client.get(
        "/api/v1/discover/articles",
        params={
            "platform": "weixin",
            "field": "科技",
            "time_range": "1m",
            "views_min": 100000,
            "keyword": "AI",
            "page": 1,
            "page_size": 5,
        },
        headers=_auth_headers(client),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["pagination"] == {
        "page": 1,
        "page_size": 5,
        "total": 1,
        "has_more": False,
    }
    assert payload["synced_at"] is None
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["platform"] == "weixin"
    assert item["field"] == "科技"
    assert item["views"] >= 100000
    assert "AI" in item["title"]
    assert item["source_url"] is None
    assert item["is_sample"] is True


def test_discover_articles_require_auth(client: TestClient) -> None:
    response = client.get("/api/v1/discover/articles")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing bearer token"


def test_discover_articles_validate_query_params(client: TestClient) -> None:
    response = client.get(
        "/api/v1/discover/articles",
        params={"page": 0, "page_size": 101},
        headers=_auth_headers(client),
    )
    assert response.status_code == 422


def test_discover_articles_mask_legacy_search_links_as_sample(client: TestClient) -> None:
    with SessionLocal() as session:
        article = get_discover_article_by_id(session, "dca_wx_001")
        assert article is not None
        article.source_url = "https://weixin.sogou.com/weixin?type=2&query=legacy"
        article.raw_json = {}
        session.commit()

    response = client.get(
        "/api/v1/discover/articles",
        params={"platform": "weixin", "page": 1, "page_size": 1},
        headers=_auth_headers(client),
    )

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["id"] == "dca_wx_001"
    assert item["source_url"] is None
    assert item["is_sample"] is True


def test_hot_topics_use_latest_snapshot_and_paginate(client: TestClient) -> None:
    response = client.get(
        "/api/v1/discover/hot-topics",
        params={"page": 2, "page_size": 5},
        headers=_auth_headers(client),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["pagination"] == {
        "page": 2,
        "page_size": 5,
        "total": 12,
        "has_more": True,
    }
    assert payload["synced_at"] is not None
    assert len(payload["items"]) == 5
    assert payload["items"][0]["rank"] == 6
    assert payload["items"][-1]["rank"] == 10
    assert "source_url" in payload["items"][0]


def test_discover_articles_refresh_endpoint_requires_auth(client: TestClient) -> None:
    response = client.post("/api/v1/discover/articles")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing bearer token"


def test_discover_articles_refresh_endpoint_returns_sync_result(
    client: TestClient,
    monkeypatch: object,
) -> None:
    synced_at = datetime.now(UTC)

    def fake_refresh_discover_articles_snapshot(_: object) -> DiscoverArticleRefreshResult:
        return DiscoverArticleRefreshResult(total=12, synced_at=synced_at)

    monkeypatch.setattr(
        discover_endpoint,
        "refresh_discover_articles_snapshot",
        fake_refresh_discover_articles_snapshot,
    )

    response = client.post(
        "/api/v1/discover/articles",
        headers=_auth_headers(client),
    )

    assert response.status_code == 200
    assert response.json() == {
        "total": 12,
        "synced_at": synced_at.isoformat().replace("+00:00", "Z"),
    }


def test_hot_topics_refresh_endpoint_requires_auth(client: TestClient) -> None:
    response = client.post("/api/v1/discover/hot-topics")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing bearer token"


def test_hot_topics_refresh_endpoint_returns_sync_result(client: TestClient, monkeypatch: object) -> None:
    synced_at = datetime.now(UTC)

    def fake_refresh_hot_topics_snapshot(_: object) -> HotTopicRefreshResult:
        return HotTopicRefreshResult(total=60, synced_at=synced_at)

    monkeypatch.setattr(discover_endpoint, "refresh_hot_topics_snapshot", fake_refresh_hot_topics_snapshot)

    response = client.post(
        "/api/v1/discover/hot-topics",
        headers=_auth_headers(client),
    )

    assert response.status_code == 200
    assert response.json() == {
        "total": 60,
        "synced_at": synced_at.isoformat().replace("+00:00", "Z"),
    }
