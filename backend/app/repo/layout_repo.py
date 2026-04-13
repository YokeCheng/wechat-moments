from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.layout import Asset, LayoutDraft


def create_asset(db: Session, **payload: Any) -> Asset:
    asset = Asset(**payload)
    db.add(asset)
    db.flush()
    return asset


def get_asset_by_id(db: Session, user_id: str, asset_id: str) -> Asset | None:
    statement = select(Asset).where(Asset.user_id == user_id).where(Asset.id == asset_id)
    return db.scalar(statement)


def create_layout_draft(db: Session, **payload: Any) -> LayoutDraft:
    draft = LayoutDraft(**payload)
    db.add(draft)
    db.flush()
    return draft


def get_layout_draft_by_id(db: Session, user_id: str, draft_id: str) -> LayoutDraft | None:
    statement = select(LayoutDraft).where(LayoutDraft.user_id == user_id).where(LayoutDraft.id == draft_id)
    return db.scalar(statement)


def delete_layout_draft(db: Session, draft: LayoutDraft) -> None:
    db.delete(draft)
    db.flush()


def query_layout_drafts(db: Session, user_id: str, *, page: int, page_size: int) -> tuple[list[LayoutDraft], int]:
    statement = select(LayoutDraft).where(LayoutDraft.user_id == user_id)
    count_statement = select(func.count()).select_from(LayoutDraft).where(LayoutDraft.user_id == user_id)
    total = int(db.scalar(count_statement) or 0)
    paged_statement = (
        statement
        .order_by(LayoutDraft.updated_at.desc(), LayoutDraft.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(paged_statement).all()), total
