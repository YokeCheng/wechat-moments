from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.discover import router as discover_router
from app.api.v1.endpoints.layout import router as layout_router
from app.api.v1.endpoints.prompts import router as prompts_router
from app.api.v1.endpoints.writer import router as writer_router


router = APIRouter()
router.include_router(auth_router, tags=["auth"])
router.include_router(discover_router, tags=["discover"])
router.include_router(prompts_router, tags=["prompt-categories", "prompts"])
router.include_router(writer_router, tags=["writer-groups", "writer-articles", "generate-tasks"])
router.include_router(layout_router, tags=["layout", "assets"])
