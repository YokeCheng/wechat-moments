from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.auth import User
from app.schemas.layout import AssetItem, LayoutDraftItem, LayoutDraftList, LayoutDraftUpsertRequest, LayoutRenderResponse
from app.schemas.system import SimpleMessage
from app.services.layout_service import (
    LayoutDraftNotFoundError,
    LayoutValidationError,
    create_layout_draft_for_user,
    delete_layout_draft_for_user,
    get_layout_draft_detail,
    list_layout_drafts_for_user,
    render_layout,
    update_layout_draft_for_user,
    upload_asset_for_user,
)


router = APIRouter()


@router.post("/layout/render", response_model=LayoutRenderResponse)
def post_layout_render(
    payload: LayoutDraftUpsertRequest,
    current_user: User = Depends(get_current_user),
) -> LayoutRenderResponse:
    _ = current_user
    return render_layout(payload)


@router.get("/layout/drafts", response_model=LayoutDraftList)
def get_layout_drafts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LayoutDraftList:
    return list_layout_drafts_for_user(db, current_user.id, page=page, page_size=page_size)


@router.post("/layout/drafts", response_model=LayoutDraftItem, status_code=status.HTTP_201_CREATED)
def post_layout_draft(
    payload: LayoutDraftUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LayoutDraftItem:
    try:
        return create_layout_draft_for_user(db, current_user.id, payload)
    except LayoutValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/layout/drafts/{draftId}", response_model=LayoutDraftItem)
def get_layout_draft(
    draftId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LayoutDraftItem:
    try:
        return get_layout_draft_detail(db, current_user.id, draftId)
    except LayoutDraftNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/layout/drafts/{draftId}", response_model=LayoutDraftItem)
def patch_layout_draft(
    draftId: str,
    payload: LayoutDraftUpsertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LayoutDraftItem:
    try:
        return update_layout_draft_for_user(db, current_user.id, draftId, payload)
    except LayoutDraftNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except LayoutValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/layout/drafts/{draftId}", response_model=SimpleMessage)
def remove_layout_draft(
    draftId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimpleMessage:
    try:
        delete_layout_draft_for_user(db, current_user.id, draftId)
    except LayoutDraftNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return SimpleMessage(message="ok")


@router.post("/assets", response_model=AssetItem, status_code=status.HTTP_201_CREATED)
async def post_asset(
    file: UploadFile = File(...),
    asset_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssetItem:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="uploaded file is empty")

    try:
        return upload_asset_for_user(
            db,
            current_user.id,
            asset_type=asset_type,
            file_name=file.filename or "upload.bin",
            mime_type=file.content_type or "application/octet-stream",
            content=content,
        )
    except LayoutValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
