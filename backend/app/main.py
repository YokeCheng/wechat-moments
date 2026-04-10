from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.models import auth as auth_models  # noqa: F401
from app.db.models import discover as discover_models  # noqa: F401
from app.db.session import SessionLocal, engine
from app.services.auth_service import ensure_auth_seed_data
from app.services.discover_service import ensure_discover_seed_data


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        ensure_auth_seed_data(session)
        ensure_discover_seed_data(session)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
