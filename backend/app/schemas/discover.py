from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class DiscoverTimeRange(str, Enum):
    ALL = "all"
    ONE_DAY = "1d"
    THREE_DAYS = "3d"
    SEVEN_DAYS = "7d"
    ONE_MONTH = "1m"
    THREE_MONTHS = "3m"


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    has_more: bool


class DiscoverArticleItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    platform: str
    field: str
    title: str
    author: str
    publish_time: datetime
    views: int
    likes: int
    shares: int
    source_url: str
    is_hot: bool
    is_new: bool


class DiscoverArticleList(BaseModel):
    items: list[DiscoverArticleItem]
    pagination: Pagination


class HotTopicItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rank: int
    title: str
    heat: int
    trend: str
    field: str


class HotTopicList(BaseModel):
    items: list[HotTopicItem]
    pagination: Pagination


class DiscoverArticleQuery(BaseModel):
    platform: str | None = None
    keyword: str | None = None
    field: str | None = None
    time_range: DiscoverTimeRange = DiscoverTimeRange.ALL
    views_min: int | None = None
    page: int = 1
    page_size: int = 20
