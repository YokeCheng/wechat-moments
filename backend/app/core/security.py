from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from fastapi.security import HTTPBearer
import jwt
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings


bearer_scheme = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    sub: str
    username: str


def create_access_token(*, user_id: str, username: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "username": username, "exp": expires_at}
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return TokenPayload.model_validate(payload)
    except (jwt.PyJWTError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
        ) from exc
