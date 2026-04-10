from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.services.auth_service import ensure_auth_seed_data
from app.services.discover_service import ensure_discover_seed_data


@pytest.fixture()
def client() -> TestClient:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        ensure_auth_seed_data(session)
        ensure_discover_seed_data(session)

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)


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
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["platform"] == "weixin"
    assert item["field"] == "科技"
    assert item["views"] >= 100000
    assert "AI" in item["title"]


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
    assert len(payload["items"]) == 5
    assert payload["items"][0]["rank"] == 6
    assert payload["items"][-1]["rank"] == 10
