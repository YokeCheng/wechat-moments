from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.discover import Pagination


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


class WriterGroupItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    article_count: int


class WriterGroupList(BaseModel):
    items: list[WriterGroupItem]


class WriterArticleItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    group_id: str | None = None
    group_name: str | None = None
    prompt_id: str | None = None
    prompt_title: str | None = None
    ref_url: str | None = None
    image_count: int
    word_count: int
    status: WriterArticleStatus
    content_md: str
    created_at: datetime
    updated_at: datetime


class WriterArticleList(BaseModel):
    items: list[WriterArticleItem]
    pagination: Pagination


class WriterGroupCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class WriterArticleCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    group_id: str | None = None
    prompt_id: str | None = None
    ref_url: str | None = Field(default=None, max_length=500)
    image_count: int = Field(default=0, ge=0, le=10)
    content_md: str = ""


class WriterArticleUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    group_id: str | None = None
    prompt_id: str | None = None
    ref_url: str | None = Field(default=None, max_length=500)
    image_count: int | None = Field(default=None, ge=0, le=10)
    status: WriterArticleStatus | None = None
    content_md: str | None = None


class WriterArticleQuery(BaseModel):
    group_id: str | None = None
    keyword: str | None = None
    status: WriterArticleStatus | None = None
    page: int = 1
    page_size: int = 20


class GenerateTaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    group_id: str | None = None
    prompt_id: str | None = None
    ref_url: str | None = Field(default=None, max_length=500)
    image_count: int = Field(default=3, ge=0, le=10)


class GenerateTaskItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    article_id: str
    status: GenerateTaskStatus
    error_message: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
