from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.auth import User
from app.schemas.system import SimpleMessage
from app.schemas.writer import (
    GenerateTaskCreateRequest,
    GenerateTaskItem,
    WriterArticleCreateRequest,
    WriterArticleItem,
    WriterArticleList,
    WriterArticleQuery,
    WriterArticleStatus,
    WriterArticleUpdateRequest,
    WriterGroupCreateRequest,
    WriterGroupItem,
    WriterGroupList,
)
from app.services.writer_service import (
    GenerateTaskNotFoundError,
    WriterArticleNotFoundError,
    WriterConflictError,
    WriterGroupNotFoundError,
    WriterValidationError,
    create_generate_task_for_user,
    create_writer_article_for_user,
    create_writer_group_for_user,
    delete_writer_article_for_user,
    delete_writer_group_for_user,
    execute_generate_task,
    get_generate_task_detail,
    get_writer_article_detail,
    list_writer_articles_for_user,
    list_writer_groups,
    update_writer_article_for_user,
)


router = APIRouter()


@router.get("/writer/groups", response_model=WriterGroupList)
def get_writer_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WriterGroupList:
    return list_writer_groups(db, current_user.id)


@router.post("/writer/groups", response_model=WriterGroupItem, status_code=status.HTTP_201_CREATED)
def post_writer_group(
    payload: WriterGroupCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WriterGroupItem:
    try:
        return create_writer_group_for_user(db, current_user.id, payload)
    except WriterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except WriterConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/writer/groups/{groupId}", response_model=SimpleMessage)
def remove_writer_group(
    groupId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimpleMessage:
    try:
        delete_writer_group_for_user(db, current_user.id, groupId)
    except WriterGroupNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return SimpleMessage(message="ok")


@router.get("/writer/articles", response_model=WriterArticleList)
def get_writer_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    group_id: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    status_value: Annotated[WriterArticleStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> WriterArticleList:
    return list_writer_articles_for_user(
        db,
        current_user.id,
        WriterArticleQuery(
            group_id=group_id,
            keyword=keyword,
            status=status_value,
            page=page,
            page_size=page_size,
        ),
    )


@router.post("/writer/articles", response_model=WriterArticleItem, status_code=status.HTTP_201_CREATED)
def post_writer_article(
    payload: WriterArticleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WriterArticleItem:
    try:
        return create_writer_article_for_user(db, current_user.id, payload)
    except WriterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except WriterGroupNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/writer/articles/{articleId}", response_model=WriterArticleItem)
def get_writer_article(
    articleId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WriterArticleItem:
    try:
        return get_writer_article_detail(db, current_user.id, articleId)
    except WriterArticleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/writer/articles/{articleId}", response_model=WriterArticleItem)
def patch_writer_article(
    articleId: str,
    payload: WriterArticleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WriterArticleItem:
    try:
        return update_writer_article_for_user(db, current_user.id, articleId, payload)
    except WriterArticleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except WriterGroupNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except WriterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/writer/articles/{articleId}", response_model=SimpleMessage)
def remove_writer_article(
    articleId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimpleMessage:
    try:
        delete_writer_article_for_user(db, current_user.id, articleId)
    except WriterArticleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return SimpleMessage(message="ok")


@router.post("/writer/generate-tasks", response_model=GenerateTaskItem, status_code=status.HTTP_202_ACCEPTED)
def post_generate_task(
    payload: GenerateTaskCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateTaskItem:
    try:
        task = create_generate_task_for_user(db, current_user.id, payload)
    except WriterGroupNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except WriterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    background_tasks.add_task(execute_generate_task, task.id)
    return task


@router.get("/writer/generate-tasks/{taskId}", response_model=GenerateTaskItem)
def get_generate_task(
    taskId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateTaskItem:
    try:
        return get_generate_task_detail(db, current_user.id, taskId)
    except GenerateTaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
