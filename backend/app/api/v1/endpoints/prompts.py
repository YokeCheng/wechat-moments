from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.auth import User
from app.schemas.prompts import (
    PromptCategoryCreateRequest,
    PromptCategoryItem,
    PromptCategoryList,
    PromptCategoryUpdateRequest,
    PromptCreateRequest,
    PromptItem,
    PromptList,
    PromptQuery,
    PromptStatus,
    PromptUpdateRequest,
)
from app.schemas.system import SimpleMessage
from app.services.prompt_service import (
    PromptCategoryNotFoundError,
    PromptConflictError,
    PromptNotFoundError,
    PromptValidationError,
    create_prompt_category_for_user,
    create_prompt_for_user,
    delete_prompt_category_for_user,
    delete_prompt_for_user,
    get_prompt_detail,
    list_prompt_categories,
    list_prompts,
    update_prompt_category_for_user,
    update_prompt_for_user,
)


router = APIRouter()


@router.get("/prompt-categories", response_model=PromptCategoryList)
def get_prompt_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptCategoryList:
    return list_prompt_categories(db, current_user.id)


@router.post("/prompt-categories", response_model=PromptCategoryItem, status_code=status.HTTP_201_CREATED)
def post_prompt_category(
    payload: PromptCategoryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptCategoryItem:
    try:
        return create_prompt_category_for_user(db, current_user.id, payload)
    except PromptValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except PromptConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/prompt-categories/{categoryId}", response_model=PromptCategoryItem)
def patch_prompt_category(
    categoryId: str,
    payload: PromptCategoryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptCategoryItem:
    try:
        return update_prompt_category_for_user(db, current_user.id, categoryId, payload)
    except PromptCategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PromptValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except PromptConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/prompt-categories/{categoryId}", response_model=SimpleMessage)
def remove_prompt_category(
    categoryId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimpleMessage:
    try:
        delete_prompt_category_for_user(db, current_user.id, categoryId)
    except PromptCategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PromptConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return SimpleMessage(message="ok")


@router.get("/prompts", response_model=PromptList)
def get_prompts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category_id: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    status_value: Annotated[PromptStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PromptList:
    return list_prompts(
        db,
        current_user.id,
        PromptQuery(
            category_id=category_id,
            keyword=keyword,
            status=status_value,
            page=page,
            page_size=page_size,
        ),
    )


@router.post("/prompts", response_model=PromptItem, status_code=status.HTTP_201_CREATED)
def post_prompt(
    payload: PromptCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptItem:
    try:
        return create_prompt_for_user(db, current_user.id, payload)
    except PromptCategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PromptValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/prompts/{promptId}", response_model=PromptItem)
def get_prompt(
    promptId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptItem:
    try:
        return get_prompt_detail(db, current_user.id, promptId)
    except PromptNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/prompts/{promptId}", response_model=PromptItem)
def patch_prompt(
    promptId: str,
    payload: PromptUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptItem:
    try:
        return update_prompt_for_user(db, current_user.id, promptId, payload)
    except PromptNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PromptCategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PromptValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/prompts/{promptId}", response_model=SimpleMessage)
def remove_prompt(
    promptId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimpleMessage:
    try:
        delete_prompt_for_user(db, current_user.id, promptId)
    except PromptNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return SimpleMessage(message="ok")
