from __future__ import annotations

from datetime import UTC, datetime, timedelta
import re
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.models.auth import Plan, PlanCode, SubscriptionStatus, User
from app.repo.auth_repo import (
    create_plan,
    create_subscription,
    create_usage_counter,
    create_user,
    get_active_subscription_for_user,
    get_plan_by_code,
    get_usage_counter,
    get_user_by_username,
    list_usage_counters_for_period,
)
from app.schemas.auth import CurrentUser, DevLoginResponse, DevLoginUser, UsageSummary


PLAN_SEEDS: dict[str, dict[str, object]] = {
    "free": {
        "name": "Free",
        "description": "Starter plan for development and evaluation.",
        "price_amount": 0,
        "billing_cycle": "month",
        "limits_json": {
            "generate_daily": 5,
            "discover_export_monthly": 20,
            "prompt_limit": 50,
            "channel_limit": 1,
        },
    },
    "basic": {
        "name": "Basic",
        "description": "Entry paid plan.",
        "price_amount": 4900,
        "billing_cycle": "month",
        "limits_json": {
            "generate_daily": 20,
            "discover_export_monthly": 100,
            "prompt_limit": 200,
            "channel_limit": 1,
        },
    },
    "pro": {
        "name": "Pro",
        "description": "Plan for active creators.",
        "price_amount": 9900,
        "billing_cycle": "month",
        "limits_json": {
            "generate_daily": 50,
            "discover_export_monthly": 999,
            "prompt_limit": -1,
            "channel_limit": 3,
        },
    },
    "enterprise": {
        "name": "Enterprise",
        "description": "Plan for teams and agencies.",
        "price_amount": 19900,
        "billing_cycle": "month",
        "limits_json": {
            "generate_daily": 200,
            "discover_export_monthly": -1,
            "prompt_limit": -1,
            "channel_limit": 10,
        },
    },
}

DEFAULT_USAGE_METRICS = (
    "generate_daily",
    "discover_export_monthly",
    "prompt_count",
    "channel_count",
)
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def ensure_auth_seed_data(db: Session) -> None:
    for code, payload in PLAN_SEEDS.items():
        if get_plan_by_code(db, code) is None:
            create_plan(
                db,
                plan_id=_prefixed_id("plan"),
                code=code,
                name=str(payload["name"]),
                description=str(payload["description"]),
                price_amount=int(payload["price_amount"]),
                billing_cycle=str(payload["billing_cycle"]),
                limits_json=dict(payload["limits_json"]),
            )
    db.commit()

    settings = get_settings()
    user = get_user_by_username(db, settings.seed_demo_username)
    if user is None:
        user = create_user(
            db,
            user_id=_prefixed_id("usr"),
            username=settings.seed_demo_username,
            display_name=_display_name_from_username(settings.seed_demo_username),
        )

    _ensure_free_subscription(db, user)
    _ensure_usage_counters(db, user.id)
    db.commit()


def dev_login(db: Session, username: str) -> DevLoginResponse:
    normalized_username = _normalize_username(username)
    user = get_user_by_username(db, normalized_username)
    if user is None:
        user = create_user(
            db,
            user_id=_prefixed_id("usr"),
            username=normalized_username,
            display_name=_display_name_from_username(normalized_username),
        )

    _ensure_free_subscription(db, user)
    _ensure_usage_counters(db, user.id)
    db.commit()
    db.refresh(user)

    current_user = build_current_user_response(db, user)
    token = create_access_token(user_id=user.id, username=user.username)
    return DevLoginResponse(
        token=token,
        user=DevLoginUser(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
            plan_code=current_user.plan_code,
        ),
    )


def build_current_user_response(db: Session, user: User) -> CurrentUser:
    plan = _resolve_current_plan(db, user.id)
    usage = _build_usage_summary(db, user.id, plan)
    return CurrentUser(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        plan_code=plan.code,  # type: ignore[arg-type]
        usage=usage,
    )


def _resolve_current_plan(db: Session, user_id: str) -> Plan:
    subscription = get_active_subscription_for_user(db, user_id)
    if subscription is not None:
        return subscription.plan

    free_plan = get_plan_by_code(db, PlanCode.FREE.value)
    if free_plan is None:
        raise RuntimeError("free plan seed is missing")
    return free_plan


def _build_usage_summary(db: Session, user_id: str, plan: Plan) -> UsageSummary:
    period_key = _current_period_key()
    counters = {
        counter.metric_code: counter.used_count
        for counter in list_usage_counters_for_period(db, user_id, period_key)
    }
    limits = plan.limits_json or {}
    export_used = counters.get("discover_export_monthly")
    if export_used is None:
        export_used = counters.get("export_monthly", 0)

    return UsageSummary(
        generate_daily_used=counters.get("generate_daily", 0),
        generate_daily_limit=int(limits.get("generate_daily", 0)),
        prompt_count=counters.get("prompt_count", 0),
        channel_count=counters.get("channel_count", 0),
        export_monthly_used=export_used,
        export_monthly_limit=int(limits.get("discover_export_monthly", 0)),
    )


def _ensure_free_subscription(db: Session, user: User) -> None:
    if get_active_subscription_for_user(db, user.id) is not None:
        return

    free_plan = get_plan_by_code(db, PlanCode.FREE.value)
    if free_plan is None:
        raise RuntimeError("free plan seed is missing")

    create_subscription(
        db,
        subscription_id=_prefixed_id("sub"),
        user_id=user.id,
        plan_id=free_plan.id,
        status=SubscriptionStatus.ACTIVE.value,
        started_at=datetime.now(UTC),
        expired_at=datetime.now(UTC) + timedelta(days=3650),
    )


def _ensure_usage_counters(db: Session, user_id: str) -> None:
    period_key = _current_period_key()
    for metric_code in DEFAULT_USAGE_METRICS:
        if get_usage_counter(db, user_id, period_key, metric_code) is None:
            create_usage_counter(
                db,
                counter_id=_prefixed_id("uc"),
                user_id=user_id,
                period_key=period_key,
                metric_code=metric_code,
                used_count=0,
            )


def _normalize_username(username: str) -> str:
    normalized = username.strip().lower()
    if not normalized:
        raise ValueError("username must not be empty")
    if not USERNAME_RE.fullmatch(normalized):
        raise ValueError(
            "username may only contain letters, numbers, underscores, and hyphens"
        )
    return normalized


def _display_name_from_username(username: str) -> str:
    label = username.replace("_", " ").replace("-", " ").strip()
    return label.title() or "Creator"


def _prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


def _current_period_key() -> str:
    return datetime.now(UTC).strftime("%Y-%m")
