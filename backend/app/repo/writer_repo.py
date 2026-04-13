from __future__ import annotations

from typing import Any

from sqlalchemy import Select, func, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.db.models.writer import GenerateTask, WriterArticle, WriterGroup
from app.schemas.writer import WriterArticleQuery


def count_writer_groups_for_user(db: Session, user_id: str) -> int:
    statement = select(func.count()).select_from(WriterGroup).where(WriterGroup.user_id == user_id)
    return int(db.scalar(statement) or 0)


def count_writer_articles_for_user(db: Session, user_id: str) -> int:
    statement = select(func.count()).select_from(WriterArticle).where(WriterArticle.user_id == user_id)
    return int(db.scalar(statement) or 0)


def list_writer_groups_with_counts(db: Session, user_id: str) -> list[tuple[WriterGroup, int]]:
    statement = (
        select(WriterGroup, func.count(WriterArticle.id))
        .outerjoin(WriterArticle, (WriterArticle.group_id == WriterGroup.id) & (WriterArticle.user_id == user_id))
        .where(WriterGroup.user_id == user_id)
        .group_by(WriterGroup.id)
        .order_by(WriterGroup.sort_order.asc(), WriterGroup.created_at.asc())
    )
    return [(group, int(article_count or 0)) for group, article_count in db.execute(statement).all()]


def get_writer_group_by_id(db: Session, user_id: str, group_id: str) -> WriterGroup | None:
    statement = select(WriterGroup).where(WriterGroup.user_id == user_id).where(WriterGroup.id == group_id)
    return db.scalar(statement)


def get_writer_group_by_name(db: Session, user_id: str, name: str) -> WriterGroup | None:
    statement = select(WriterGroup).where(WriterGroup.user_id == user_id).where(WriterGroup.name == name)
    return db.scalar(statement)


def get_max_writer_group_sort_order(db: Session, user_id: str) -> int:
    statement = select(func.max(WriterGroup.sort_order)).where(WriterGroup.user_id == user_id)
    return int(db.scalar(statement) or 0)


def create_writer_group(db: Session, **payload: Any) -> WriterGroup:
    group = WriterGroup(**payload)
    db.add(group)
    db.flush()
    return group


def remove_writer_group(db: Session, group: WriterGroup) -> None:
    db.delete(group)
    db.flush()


def detach_articles_from_group(db: Session, user_id: str, group_id: str) -> None:
    db.execute(
        update(WriterArticle)
        .where(WriterArticle.user_id == user_id)
        .where(WriterArticle.group_id == group_id)
        .values(group_id=None)
    )
    db.flush()


def get_writer_article_by_id(db: Session, user_id: str, article_id: str) -> WriterArticle | None:
    statement = (
        select(WriterArticle)
        .options(selectinload(WriterArticle.group), selectinload(WriterArticle.prompt))
        .where(WriterArticle.user_id == user_id)
        .where(WriterArticle.id == article_id)
    )
    return db.scalar(statement)


def create_writer_article(db: Session, **payload: Any) -> WriterArticle:
    article = WriterArticle(**payload)
    db.add(article)
    db.flush()
    return article


def delete_writer_article(db: Session, article: WriterArticle) -> None:
    db.delete(article)
    db.flush()


def query_writer_articles(db: Session, user_id: str, filters: WriterArticleQuery) -> tuple[list[WriterArticle], int]:
    statement = (
        select(WriterArticle)
        .options(selectinload(WriterArticle.group), selectinload(WriterArticle.prompt))
        .where(WriterArticle.user_id == user_id)
    )
    count_statement = select(func.count()).select_from(WriterArticle).where(WriterArticle.user_id == user_id)

    statement = _apply_writer_article_filters(statement, filters)
    count_statement = _apply_writer_article_filters(count_statement, filters)

    total = int(db.scalar(count_statement) or 0)
    paged_statement = (
        statement
        .order_by(WriterArticle.updated_at.desc(), WriterArticle.created_at.desc())
        .offset((filters.page - 1) * filters.page_size)
        .limit(filters.page_size)
    )
    return list(db.scalars(paged_statement).all()), total


def create_generate_task(db: Session, **payload: Any) -> GenerateTask:
    task = GenerateTask(**payload)
    db.add(task)
    db.flush()
    return task


def get_generate_task_by_id(db: Session, user_id: str, task_id: str) -> GenerateTask | None:
    statement = (
        select(GenerateTask)
        .options(selectinload(GenerateTask.article))
        .where(GenerateTask.user_id == user_id)
        .where(GenerateTask.id == task_id)
    )
    return db.scalar(statement)


def get_generate_task_for_worker(db: Session, task_id: str) -> GenerateTask | None:
    statement = (
        select(GenerateTask)
        .options(selectinload(GenerateTask.article))
        .where(GenerateTask.id == task_id)
    )
    return db.scalar(statement)


def _apply_writer_article_filters(statement: Select[Any], filters: WriterArticleQuery) -> Select[Any]:
    if filters.group_id:
        statement = statement.where(WriterArticle.group_id == filters.group_id)
    if filters.status is not None:
        statement = statement.where(WriterArticle.status == filters.status.value)
    if filters.keyword:
        keyword = f"%{filters.keyword.strip()}%"
        statement = statement.where(
            or_(
                WriterArticle.title.ilike(keyword),
                WriterArticle.content_md.ilike(keyword),
            )
        )
    return statement
