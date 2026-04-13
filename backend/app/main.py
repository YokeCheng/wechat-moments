from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.runtime_migrations import run_runtime_migrations
from app.db.models import auth as auth_models  # noqa: F401
from app.db.models import discover as discover_models  # noqa: F401
from app.db.models import layout as layout_models  # noqa: F401
from app.db.models import prompts as prompt_models  # noqa: F401
from app.db.models import writer as writer_models  # noqa: F401
from app.db.session import SessionLocal, engine
from app.repo.auth_repo import get_user_by_username
from app.services.auth_service import ensure_auth_seed_data
from app.services.discover_service import ensure_discover_seed_data
from app.services.layout_service import get_upload_root
from app.services.prompt_service import ensure_prompt_seed_data
from app.services.writer_service import ensure_writer_seed_data
from app.workers.discover_article_sync_worker import (
    run_discover_article_sync_loop,
    sync_discover_articles_once_async,
)
from app.workers.hot_topic_sync_worker import run_hot_topic_sync_loop, sync_hot_topics_once_async


settings = get_settings()
UPLOAD_ROOT = get_upload_root()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.app_env == "test":
        yield
        return

    discover_article_stop_event = asyncio.Event()
    hot_topic_stop_event = asyncio.Event()
    discover_article_sync_task: asyncio.Task[None] | None = None
    hot_topic_sync_task: asyncio.Task[None] | None = None

    Base.metadata.create_all(bind=engine)
    run_runtime_migrations(engine)
    with SessionLocal() as session:
        ensure_auth_seed_data(session)
        ensure_discover_seed_data(session)
        demo_user = get_user_by_username(session, settings.seed_demo_username)
        if demo_user is not None:
            ensure_prompt_seed_data(session, demo_user.id)
            ensure_writer_seed_data(session, demo_user.id)

    if settings.discover_hot_sync_enabled:
        await sync_hot_topics_once_async()
        hot_topic_sync_task = asyncio.create_task(run_hot_topic_sync_loop(hot_topic_stop_event))
    if settings.discover_article_sync_enabled:
        await sync_discover_articles_once_async()
        discover_article_sync_task = asyncio.create_task(
            run_discover_article_sync_loop(discover_article_stop_event)
        )

    yield

    if discover_article_sync_task is not None:
        discover_article_stop_event.set()
        await discover_article_sync_task
    if hot_topic_sync_task is not None:
        hot_topic_stop_event.set()
        await hot_topic_sync_task


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=Path(UPLOAD_ROOT)), name="uploads")
app.include_router(api_router)
