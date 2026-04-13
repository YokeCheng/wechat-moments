from __future__ import annotations

from enum import Enum

from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AssetType(str, Enum):
    COVER_IMAGE = "cover_image"
    CONTENT_IMAGE = "content_image"


class LayoutDraftStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False, default=0)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    public_url: Mapped[str] = mapped_column(String(500), nullable=False)


class LayoutDraft(Base, TimestampMixin):
    __tablename__ = "layout_drafts"
    __table_args__ = (
        Index("idx_layout_drafts_user_id", "user_id"),
        Index("idx_layout_drafts_article_id", "article_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    article_id: Mapped[str | None] = mapped_column(ForeignKey("writer_articles.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    cover_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    content_md: Mapped[str] = mapped_column(nullable=False, default="")
    content_html: Mapped[str] = mapped_column(nullable=False, default="")
    theme_id: Mapped[str] = mapped_column(String(32), nullable=False, default="default")
    theme_color: Mapped[str] = mapped_column(String(16), nullable=False, default="#FF6600")
    font_family: Mapped[str] = mapped_column(String(32), nullable=False, default="sans")
    font_size: Mapped[int] = mapped_column(nullable=False, default=15)
    line_height: Mapped[float] = mapped_column(Float, nullable=False, default=1.8)
    title_align: Mapped[str] = mapped_column(String(16), nullable=False, default="center")
    para_indent: Mapped[bool] = mapped_column(nullable=False, default=True)
    round_image: Mapped[bool] = mapped_column(nullable=False, default=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=LayoutDraftStatus.DRAFT.value)

    article: Mapped["WriterArticle | None"] = relationship(back_populates="layout_drafts")
    cover_asset: Mapped[Asset | None] = relationship()
