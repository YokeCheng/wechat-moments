from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.auth import Plan, Subscription, UsageCounter, User


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def get_user_by_username(db: Session, username: str) -> User | None:
    statement = select(User).where(User.username == username)
    return db.scalar(statement)


def create_user(db: Session, *, user_id: str, username: str, display_name: str) -> User:
    user = User(
        id=user_id,
        username=username,
        display_name=display_name,
    )
    db.add(user)
    db.flush()
    return user


def get_plan_by_code(db: Session, code: str) -> Plan | None:
    statement = select(Plan).where(Plan.code == code)
    return db.scalar(statement)


def create_plan(
    db: Session,
    *,
    plan_id: str,
    code: str,
    name: str,
    description: str,
    price_amount: int,
    billing_cycle: str,
    limits_json: dict[str, int],
) -> Plan:
    plan = Plan(
        id=plan_id,
        code=code,
        name=name,
        description=description,
        price_amount=price_amount,
        billing_cycle=billing_cycle,
        limits_json=limits_json,
        is_active=True,
    )
    db.add(plan)
    db.flush()
    return plan


def get_active_subscription_for_user(db: Session, user_id: str) -> Subscription | None:
    now = datetime.now(UTC)
    statement = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .where(Subscription.status == "active")
        .where((Subscription.expired_at.is_(None)) | (Subscription.expired_at >= now))
        .order_by(Subscription.started_at.desc())
    )
    return db.scalar(statement)


def create_subscription(
    db: Session,
    *,
    subscription_id: str,
    user_id: str,
    plan_id: str,
    status: str,
    started_at: datetime,
    expired_at: datetime | None,
) -> Subscription:
    subscription = Subscription(
        id=subscription_id,
        user_id=user_id,
        plan_id=plan_id,
        status=status,
        started_at=started_at,
        expired_at=expired_at,
    )
    db.add(subscription)
    db.flush()
    return subscription


def list_usage_counters_for_period(db: Session, user_id: str, period_key: str) -> list[UsageCounter]:
    statement = (
        select(UsageCounter)
        .where(UsageCounter.user_id == user_id)
        .where(UsageCounter.period_key == period_key)
    )
    return list(db.scalars(statement).all())


def get_usage_counter(db: Session, user_id: str, period_key: str, metric_code: str) -> UsageCounter | None:
    statement = (
        select(UsageCounter)
        .where(UsageCounter.user_id == user_id)
        .where(UsageCounter.period_key == period_key)
        .where(UsageCounter.metric_code == metric_code)
    )
    return db.scalar(statement)


def create_usage_counter(
    db: Session,
    *,
    counter_id: str,
    user_id: str,
    period_key: str,
    metric_code: str,
    used_count: int,
) -> UsageCounter:
    counter = UsageCounter(
        id=counter_id,
        user_id=user_id,
        period_key=period_key,
        metric_code=metric_code,
        used_count=used_count,
        updated_at=datetime.now(UTC),
    )
    db.add(counter)
    db.flush()
    return counter
