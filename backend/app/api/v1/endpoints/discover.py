from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.auth import User
from app.db.models.discover import DiscoverPlatform
from app.schemas.discover import (
    DiscoverArticleList,
    DiscoverArticleQuery,
    DiscoverArticleRefreshResult,
    DiscoverTimeRange,
    HotTopicList,
    HotTopicRefreshResult,
)
from app.services.discover_service import list_discover_articles, list_hot_topics
from app.services.discover_article_sync_service import refresh_discover_articles_snapshot
from app.services.discover_sync_service import refresh_hot_topics_snapshot


router = APIRouter()


@router.get("/discover/articles", response_model=DiscoverArticleList)
def get_discover_articles(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    platform: DiscoverPlatform | None = Query(default=None),
    keyword: str | None = Query(default=None),
    field: str | None = Query(default=None),
    time_range: DiscoverTimeRange = Query(default=DiscoverTimeRange.ALL),
    views_min: Annotated[int | None, Query(ge=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> DiscoverArticleList:
    return list_discover_articles(
        db,
        DiscoverArticleQuery(
            platform=platform.value if platform is not None else None,
            keyword=keyword,
            field=field,
            time_range=time_range,
            views_min=views_min,
            page=page,
            page_size=page_size,
        ),
    )


@router.post("/discover/articles", response_model=DiscoverArticleRefreshResult)
def refresh_discover_articles(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DiscoverArticleRefreshResult:
    return refresh_discover_articles_snapshot(db)


@router.get("/discover/hot-topics", response_model=HotTopicList)
def get_hot_topics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> HotTopicList:
    return list_hot_topics(db, page=page, page_size=page_size)


@router.post("/discover/hot-topics", response_model=HotTopicRefreshResult)
def refresh_hot_topics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> HotTopicRefreshResult:
    return refresh_hot_topics_snapshot(db)
