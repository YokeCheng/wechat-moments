from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.auth import User
from app.schemas.auth import CurrentUser, DevLoginRequest, DevLoginResponse
from app.services.auth_service import build_current_user_response, dev_login


router = APIRouter()


@router.post("/auth/dev-login", response_model=DevLoginResponse)
def dev_login_endpoint(
    payload: DevLoginRequest,
    db: Session = Depends(get_db),
) -> DevLoginResponse:
    try:
        return dev_login(db, payload.username)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/me", response_model=CurrentUser)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    return build_current_user_response(db, current_user)
