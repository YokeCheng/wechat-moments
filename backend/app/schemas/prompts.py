from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.discover import Pagination


class PromptStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    GENERATING = "generating"


class PromptCategoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    count: int


class PromptCategoryList(BaseModel):
    items: list[PromptCategoryItem]


class PromptItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    category_id: str | None = None
    category_name: str | None = None
    content: str
    tags: list[str]
    usage_count: int
    status: PromptStatus
    created_at: datetime


class PromptList(BaseModel):
    items: list[PromptItem]
    pagination: Pagination


class PromptCategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class PromptCategoryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class PromptCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    category_id: str | None = None
    content: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    status: PromptStatus = PromptStatus.DRAFT


class PromptUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=128)
    category_id: str | None = None
    content: str | None = Field(default=None, min_length=1)
    tags: list[str] | None = None
    status: PromptStatus | None = None


class PromptQuery(BaseModel):
    category_id: str | None = None
    keyword: str | None = None
    status: PromptStatus | None = None
    page: int = 1
    page_size: int = 20
