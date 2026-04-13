from __future__ import annotations

from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models.prompts import Prompt, PromptCategory
from app.schemas.prompts import PromptQuery


def count_prompt_categories_for_user(db: Session, user_id: str) -> int:
    statement = select(func.count()).select_from(PromptCategory).where(PromptCategory.user_id == user_id)
    return int(db.scalar(statement) or 0)


def count_prompts_for_user(db: Session, user_id: str) -> int:
    statement = select(func.count()).select_from(Prompt).where(Prompt.user_id == user_id)
    return int(db.scalar(statement) or 0)


def list_prompt_categories_with_counts(db: Session, user_id: str) -> list[tuple[PromptCategory, int]]:
    statement = (
        select(PromptCategory, func.count(Prompt.id))
        .outerjoin(Prompt, (Prompt.category_id == PromptCategory.id) & (Prompt.user_id == user_id))
        .where(PromptCategory.user_id == user_id)
        .group_by(PromptCategory.id)
        .order_by(PromptCategory.sort_order.asc(), PromptCategory.created_at.asc())
    )
    return [(category, int(prompt_count or 0)) for category, prompt_count in db.execute(statement).all()]


def get_prompt_category_by_id(db: Session, user_id: str, category_id: str) -> PromptCategory | None:
    statement = (
        select(PromptCategory)
        .where(PromptCategory.user_id == user_id)
        .where(PromptCategory.id == category_id)
    )
    return db.scalar(statement)


def get_prompt_category_by_name(db: Session, user_id: str, name: str) -> PromptCategory | None:
    statement = (
        select(PromptCategory)
        .where(PromptCategory.user_id == user_id)
        .where(PromptCategory.name == name)
    )
    return db.scalar(statement)


def get_max_prompt_category_sort_order(db: Session, user_id: str) -> int:
    statement = select(func.max(PromptCategory.sort_order)).where(PromptCategory.user_id == user_id)
    return int(db.scalar(statement) or 0)


def create_prompt_category(db: Session, **payload: Any) -> PromptCategory:
    category = PromptCategory(**payload)
    db.add(category)
    db.flush()
    return category


def delete_prompt_category(db: Session, category: PromptCategory) -> None:
    db.delete(category)
    db.flush()


def count_prompts_in_category(db: Session, user_id: str, category_id: str) -> int:
    statement = (
        select(func.count())
        .select_from(Prompt)
        .where(Prompt.user_id == user_id)
        .where(Prompt.category_id == category_id)
    )
    return int(db.scalar(statement) or 0)


def get_prompt_by_id(db: Session, user_id: str, prompt_id: str) -> Prompt | None:
    statement = (
        select(Prompt)
        .options(selectinload(Prompt.category))
        .where(Prompt.user_id == user_id)
        .where(Prompt.id == prompt_id)
    )
    return db.scalar(statement)


def create_prompt(db: Session, **payload: Any) -> Prompt:
    prompt = Prompt(**payload)
    db.add(prompt)
    db.flush()
    return prompt


def delete_prompt(db: Session, prompt: Prompt) -> None:
    db.delete(prompt)
    db.flush()


def query_prompts(db: Session, user_id: str, filters: PromptQuery) -> tuple[list[Prompt], int]:
    statement = select(Prompt).options(selectinload(Prompt.category)).where(Prompt.user_id == user_id)
    count_statement = select(func.count()).select_from(Prompt).where(Prompt.user_id == user_id)

    statement = _apply_prompt_filters(statement, filters)
    count_statement = _apply_prompt_filters(count_statement, filters)

    total = int(db.scalar(count_statement) or 0)
    paged_statement = (
        statement
        .order_by(Prompt.created_at.desc(), Prompt.title.asc())
        .offset((filters.page - 1) * filters.page_size)
        .limit(filters.page_size)
    )
    return list(db.scalars(paged_statement).all()), total


def _apply_prompt_filters(statement: Select[Any], filters: PromptQuery) -> Select[Any]:
    if filters.category_id:
        statement = statement.where(Prompt.category_id == filters.category_id)
    if filters.status is not None:
        statement = statement.where(Prompt.status == filters.status.value)
    if filters.keyword:
        keyword = f"%{filters.keyword.strip()}%"
        statement = statement.where(
            or_(
                Prompt.title.ilike(keyword),
                Prompt.content.ilike(keyword),
            )
        )
    return statement
