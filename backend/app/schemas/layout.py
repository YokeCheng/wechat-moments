from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.discover import Pagination


class AssetType(str, Enum):
    COVER_IMAGE = "cover_image"
    CONTENT_IMAGE = "content_image"


class LayoutFontFamily(str, Enum):
    SANS = "sans"
    SERIF = "serif"
    ROUND = "round"


class LayoutTitleAlign(str, Enum):
    LEFT = "left"
    CENTER = "center"


class LayoutDraftStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class LayoutRenderRequest(BaseModel):
    title: str = Field(default="", max_length=255)
    article_id: str | None = None
    cover_asset_id: str | None = None
    content_md: str = Field(min_length=1)
    theme_id: str = Field(default="default", max_length=32)
    theme_color: str = Field(default="#FF6600", max_length=16)
    font_family: LayoutFontFamily = LayoutFontFamily.SANS
    font_size: int = Field(default=15, ge=12, le=20)
    line_height: float = Field(default=1.8, ge=1.0, le=3.0)
    title_align: LayoutTitleAlign = LayoutTitleAlign.CENTER
    para_indent: bool = True
    round_image: bool = True


class LayoutRenderResponse(BaseModel):
    html: str


class LayoutDraftUpsertRequest(LayoutRenderRequest):
    pass


class LayoutDraftItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    article_id: str | None = None
    title: str
    cover_asset_id: str | None = None
    content_md: str
    content_html: str
    theme_id: str
    theme_color: str
    font_family: LayoutFontFamily
    font_size: int
    line_height: float
    title_align: LayoutTitleAlign
    para_indent: bool
    round_image: bool
    status: LayoutDraftStatus
    created_at: datetime
    updated_at: datetime


class LayoutDraftList(BaseModel):
    items: list[LayoutDraftItem]
    pagination: Pagination


class AssetItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_type: AssetType
    file_name: str
    mime_type: str
    size: int
    public_url: str
