from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.discover import router as discover_router


router = APIRouter()
router.include_router(auth_router, tags=["auth"])
router.include_router(discover_router, tags=["discover"])
