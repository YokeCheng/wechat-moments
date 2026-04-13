from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.models.auth import Subscription, SubscriptionStatus
from app.db.session import SessionLocal
from app.repo.auth_repo import get_user_by_username


def test_dev_login_and_me_flow(client: TestClient) -> None:
    login_response = client.post("/api/v1/auth/dev-login", json={"username": "creator"})
    assert login_response.status_code == 200

    payload = login_response.json()
    token = payload["token"]
    assert payload["user"]["username"] == "creator"

    me_response = client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    data = me_response.json()
    assert data["username"] == "creator"
    assert data["plan_code"] == "free"
    assert set(data["usage"].keys()) == {
        "generate_daily_used",
        "generate_daily_limit",
        "prompt_count",
        "channel_count",
        "export_monthly_used",
        "export_monthly_limit",
    }


def test_me_requires_valid_token(client: TestClient) -> None:
    response = client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_me_falls_back_to_free_plan_without_active_subscription(client: TestClient) -> None:
    login_response = client.post("/api/v1/auth/dev-login", json={"username": "fallback"})
    token = login_response.json()["token"]

    with SessionLocal() as session:
        user = get_user_by_username(session, "fallback")
        assert user is not None
        subscriptions = session.scalars(
            select(Subscription).where(Subscription.user_id == user.id)
        ).all()
        for subscription in subscriptions:
            subscription.status = SubscriptionStatus.CANCELLED.value
        session.commit()

    me_response = client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["plan_code"] == "free"
