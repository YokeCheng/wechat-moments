from __future__ import annotations

from enum import Enum

from sqlalchemy import JSON, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PromptStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    GENERATING = "generating"


class PromptCategory(Base, TimestampMixin):
    __tablename__ = "prompt_categories"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uk_prompt_categories_user_name"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)

    prompts: Mapped[list["Prompt"]] = relationship(back_populates="category")


class Prompt(Base, TimestampMixin):
    __tablename__ = "prompts"
    __table_args__ = (
        Index("idx_prompts_user_category_id", "user_id", "category_id"),
        Index("idx_prompts_user_status", "user_id", "status"),
        Index("idx_prompts_title", "title"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("prompt_categories.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[str] = mapped_column(nullable=False, default="")
    tags_json: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=PromptStatus.DRAFT.value)
    usage_count: Mapped[int] = mapped_column(nullable=False, default=0)

    category: Mapped[PromptCategory | None] = relationship(back_populates="prompts")
