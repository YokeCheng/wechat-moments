from __future__ import annotations

import asyncio
import logging

from app.core.config import get_settings
from app.services.discover_article_sync_service import sync_discover_articles_snapshot_with_new_session


logger = logging.getLogger(__name__)


async def sync_discover_articles_once_async() -> None:
    try:
        total = await asyncio.to_thread(sync_discover_articles_snapshot_with_new_session)
        logger.info("discover article sync completed with %s items", total)
    except Exception as exc:
        logger.warning("discover article sync failed: %s", exc)


async def run_discover_article_sync_loop(stop_event: asyncio.Event) -> None:
    settings = get_settings()

    while not stop_event.is_set():
        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=settings.discover_article_sync_interval_seconds,
            )
            break
        except asyncio.TimeoutError:
            await sync_discover_articles_once_async()
