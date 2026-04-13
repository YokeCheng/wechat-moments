from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WriterArticleStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerateTaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WriterGroup(Base, TimestampMixin):
    __tablename__ = "writer_groups"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uk_writer_groups_user_name"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)

    articles: Mapped[list["WriterArticle"]] = relationship(back_populates="group")


class WriterArticle(Base, TimestampMixin):
    __tablename__ = "writer_articles"
    __table_args__ = (
        Index("idx_writer_articles_user_group_id", "user_id", "group_id"),
        Index("idx_writer_articles_user_status", "user_id", "status"),
        Index("idx_writer_articles_updated_at", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("writer_groups.id"), nullable=True)
    prompt_id: Mapped[str | None] = mapped_column(ForeignKey("prompts.id"), nullable=True)
    source_article_id: Mapped[str | None] = mapped_column(ForeignKey("discover_articles.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    ref_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_count: Mapped[int] = mapped_column(nullable=False, default=0)
    word_count: Mapped[int] = mapped_column(nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=WriterArticleStatus.DRAFT.value)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    group: Mapped[WriterGroup | None] = relationship(back_populates="articles")
    prompt: Mapped["Prompt | None"] = relationship()
    generate_tasks: Mapped[list["GenerateTask"]] = relationship(back_populates="article")
    layout_drafts: Mapped[list["LayoutDraft"]] = relationship(back_populates="article")


class GenerateTask(Base, TimestampMixin):
    __tablename__ = "generate_tasks"
    __table_args__ = (
        Index("idx_generate_tasks_user_status", "user_id", "status"),
        Index("idx_generate_tasks_article_id", "article_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    article_id: Mapped[str] = mapped_column(ForeignKey("writer_articles.id"), nullable=False)
    task_type: Mapped[str] = mapped_column(String(32), nullable=False, default="generate_article")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=GenerateTaskStatus.QUEUED.value)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_snapshot: Mapped[str] = mapped_column(Text, nullable=False, default="")
    input_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    output_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    article: Mapped[WriterArticle] = relationship(back_populates="generate_tasks")
