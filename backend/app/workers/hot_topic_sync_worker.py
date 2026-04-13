from __future__ import annotations

import asyncio
import logging

from app.core.config import get_settings
from app.services.discover_sync_service import sync_hot_topics_snapshot_with_new_session


logger = logging.getLogger(__name__)


async def sync_hot_topics_once_async() -> None:
    try:
        total = await asyncio.to_thread(sync_hot_topics_snapshot_with_new_session)
        logger.info("hot topic sync completed with %s items", total)
    except Exception as exc:
        logger.warning("hot topic sync failed: %s", exc)


async def run_hot_topic_sync_loop(stop_event: asyncio.Event) -> None:
    settings = get_settings()

    while not stop_event.is_set():
        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=settings.discover_hot_sync_interval_seconds,
            )
            break
        except asyncio.TimeoutError:
            await sync_hot_topics_once_async()
