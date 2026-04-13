from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.repo.auth_repo import create_usage_counter, get_usage_counter
from app.repo.prompt_repo import (
    count_prompt_categories_for_user,
    count_prompts_for_user,
    count_prompts_in_category,
    create_prompt,
    create_prompt_category,
    delete_prompt,
    delete_prompt_category,
    get_max_prompt_category_sort_order,
    get_prompt_by_id,
    get_prompt_category_by_id,
    get_prompt_category_by_name,
    list_prompt_categories_with_counts,
    query_prompts,
)
from app.schemas.discover import Pagination
from app.schemas.prompts import (
    PromptCategoryCreateRequest,
    PromptCategoryItem,
    PromptCategoryList,
    PromptCategoryUpdateRequest,
    PromptCreateRequest,
    PromptItem,
    PromptList,
    PromptQuery,
    PromptUpdateRequest,
)


PROMPT_CATEGORY_SEEDS: tuple[str, ...] = ("情感", "教育", "财经", "科技", "健康", "生活")
PROMPT_SEEDS: tuple[dict[str, object], ...] = (
    {
        "title": "爆款情感文章生成",
        "category_name": "情感",
        "tags": ["情感共鸣", "治愈系", "故事性"],
        "content": "请以第一人称写一篇关于{主题}的情感文章，要求：1. 开头用一个引人入胜的故事切入；2. 中间穿插3个真实案例；3. 结尾给出积极的人生感悟。字数800-1200字，语言温暖治愈。",
        "usage_count": 2341,
        "status": "active",
        "created_at": "2026-03-15T08:00:00+00:00",
    },
    {
        "title": "干货教程类标题生成",
        "category_name": "教育",
        "tags": ["干货", "实用", "标题党"],
        "content": "为以下主题生成10个高点击率的文章标题：{主题}。要求：包含数字、疑问句、对比等技巧，每个标题不超过25字。",
        "usage_count": 1876,
        "status": "active",
        "created_at": "2026-03-18T08:00:00+00:00",
    },
    {
        "title": "财经热点深度分析",
        "category_name": "财经",
        "tags": ["深度分析", "数据驱动", "专业"],
        "content": "请分析{财经事件}的影响，结构如下：1. 事件背景（200字）；2. 核心影响分析（500字，含数据）；3. 普通人应对策略（300字）；4. 未来展望（200字）。",
        "usage_count": 1543,
        "status": "active",
        "created_at": "2026-03-20T08:00:00+00:00",
    },
    {
        "title": "AI科技热点解读",
        "category_name": "科技",
        "tags": ["AI", "科普", "前沿"],
        "content": "用通俗易懂的语言解读{科技事件}，面向普通读者。要求：避免专业术语，多用类比，重点说明对普通人生活的影响，字数600-900字。",
        "usage_count": 2109,
        "status": "generating",
        "created_at": "2026-03-22T08:00:00+00:00",
    },
    {
        "title": "健康养生科普文",
        "category_name": "健康",
        "tags": ["科普", "实用", "权威"],
        "content": "以医学科普的角度写一篇关于{健康话题}的文章。要求：引用权威数据，破除常见误区，给出3-5个实用建议，语言专业但易懂。",
        "usage_count": 1234,
        "status": "draft",
        "created_at": "2026-03-25T08:00:00+00:00",
    },
    {
        "title": "生活方式种草文",
        "category_name": "生活",
        "tags": ["种草", "生活方式", "消费"],
        "content": "写一篇关于{产品/生活方式}的种草文章，要求：真实体验感强，突出3个核心卖点，配合使用场景描述，结尾自然引导读者行动。",
        "usage_count": 1678,
        "status": "active",
        "created_at": "2026-04-01T08:00:00+00:00",
    },
    {
        "title": "职场晋升干货框架",
        "category_name": "教育",
        "tags": ["职场", "干货", "晋升"],
        "content": "以职场老鸟视角写一篇关于{主题}的干货文章。要求：开头用真实职场案例切入，给出3-5个可立即执行的方法，结尾引发读者共鸣。字数800-1200字。",
        "usage_count": 987,
        "status": "draft",
        "created_at": "2026-04-03T08:00:00+00:00",
    },
    {
        "title": "治愈系短文生成",
        "category_name": "情感",
        "tags": ["治愈", "短文", "温暖"],
        "content": "写一篇500字以内的治愈系短文，主题是{主题}。要求：语言简洁有力，每句话都有画面感，结尾留有余韵。",
        "usage_count": 756,
        "status": "active",
        "created_at": "2026-04-05T08:00:00+00:00",
    },
)


class PromptCategoryNotFoundError(Exception):
    pass


class PromptNotFoundError(Exception):
    pass


class PromptConflictError(Exception):
    pass


class PromptValidationError(Exception):
    pass


def ensure_prompt_seed_data(db: Session, user_id: str) -> None:
    if count_prompt_categories_for_user(db, user_id) > 0 or count_prompts_for_user(db, user_id) > 0:
        _sync_prompt_count_counter(db, user_id)
        db.commit()
        return

    category_id_map: dict[str, str] = {}
    for index, name in enumerate(PROMPT_CATEGORY_SEEDS, start=1):
        category = create_prompt_category(
            db,
            id=_prefixed_id("pc"),
            user_id=user_id,
            name=name,
            sort_order=index,
        )
        category_id_map[name] = category.id

    for payload in PROMPT_SEEDS:
        create_prompt(
            db,
            id=_prefixed_id("pr"),
            user_id=user_id,
            category_id=category_id_map[str(payload["category_name"])],
            title=str(payload["title"]),
            content=str(payload["content"]),
            tags_json=list(payload["tags"]),
            usage_count=int(payload["usage_count"]),
            status=str(payload["status"]),
            created_at=_parse_seed_datetime(str(payload["created_at"])),
            updated_at=_parse_seed_datetime(str(payload["created_at"])),
        )

    _sync_prompt_count_counter(db, user_id)
    db.commit()


def list_prompt_categories(db: Session, user_id: str) -> PromptCategoryList:
    ensure_prompt_seed_data(db, user_id)
    return PromptCategoryList(
        items=[
            PromptCategoryItem(
                id=category.id,
                name=category.name,
                count=prompt_count,
            )
            for category, prompt_count in list_prompt_categories_with_counts(db, user_id)
        ]
    )


def create_prompt_category_for_user(
    db: Session,
    user_id: str,
    payload: PromptCategoryCreateRequest,
) -> PromptCategoryItem:
    name = payload.name.strip()
    if not name:
        raise PromptValidationError("category name must not be empty")
    if get_prompt_category_by_name(db, user_id, name) is not None:
        raise PromptConflictError("category name already exists")

    category = create_prompt_category(
        db,
        id=_prefixed_id("pc"),
        user_id=user_id,
        name=name,
        sort_order=get_max_prompt_category_sort_order(db, user_id) + 1,
    )
    db.commit()
    return PromptCategoryItem(id=category.id, name=category.name, count=0)


def update_prompt_category_for_user(
    db: Session,
    user_id: str,
    category_id: str,
    payload: PromptCategoryUpdateRequest,
) -> PromptCategoryItem:
    category = get_prompt_category_by_id(db, user_id, category_id)
    if category is None:
        raise PromptCategoryNotFoundError("prompt category is not found")

    name = payload.name.strip()
    if not name:
        raise PromptValidationError("category name must not be empty")

    duplicate = get_prompt_category_by_name(db, user_id, name)
    if duplicate is not None and duplicate.id != category.id:
        raise PromptConflictError("category name already exists")

    category.name = name
    db.commit()
    return PromptCategoryItem(
        id=category.id,
        name=category.name,
        count=count_prompts_in_category(db, user_id, category.id),
    )


def delete_prompt_category_for_user(db: Session, user_id: str, category_id: str) -> None:
    category = get_prompt_category_by_id(db, user_id, category_id)
    if category is None:
        raise PromptCategoryNotFoundError("prompt category is not found")
    if count_prompts_in_category(db, user_id, category_id) > 0:
        raise PromptConflictError("category still contains prompts")

    delete_prompt_category(db, category)
    db.commit()


def list_prompts(db: Session, user_id: str, filters: PromptQuery) -> PromptList:
    ensure_prompt_seed_data(db, user_id)
    items, total = query_prompts(db, user_id, filters)
    return PromptList(
        items=[_to_prompt_item(item) for item in items],
        pagination=Pagination(
            page=filters.page,
            page_size=filters.page_size,
            total=total,
            has_more=filters.page * filters.page_size < total,
        ),
    )


def get_prompt_detail(db: Session, user_id: str, prompt_id: str) -> PromptItem:
    ensure_prompt_seed_data(db, user_id)
    prompt = get_prompt_by_id(db, user_id, prompt_id)
    if prompt is None:
        raise PromptNotFoundError("prompt is not found")
    return _to_prompt_item(prompt)


def create_prompt_for_user(db: Session, user_id: str, payload: PromptCreateRequest) -> PromptItem:
    title = payload.title.strip()
    content = payload.content.strip()
    if not title:
        raise PromptValidationError("prompt title must not be empty")
    if not content:
        raise PromptValidationError("prompt content must not be empty")

    category = _resolve_prompt_category(db, user_id, payload.category_id)
    prompt = create_prompt(
        db,
        id=_prefixed_id("pr"),
        user_id=user_id,
        category_id=category.id if category is not None else None,
        title=title,
        content=content,
        tags_json=_normalize_tags(payload.tags),
        usage_count=0,
        status=payload.status.value,
    )
    _sync_prompt_count_counter(db, user_id)
    db.commit()
    db.refresh(prompt)
    return _to_prompt_item(prompt)


def update_prompt_for_user(
    db: Session,
    user_id: str,
    prompt_id: str,
    payload: PromptUpdateRequest,
) -> PromptItem:
    prompt = get_prompt_by_id(db, user_id, prompt_id)
    if prompt is None:
        raise PromptNotFoundError("prompt is not found")

    changes = payload.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (payload.title or "").strip()
        if not title:
            raise PromptValidationError("prompt title must not be empty")
        prompt.title = title
    if "content" in changes:
        content = (payload.content or "").strip()
        if not content:
            raise PromptValidationError("prompt content must not be empty")
        prompt.content = content
    if "category_id" in changes:
        category = _resolve_prompt_category(db, user_id, payload.category_id)
        prompt.category_id = category.id if category is not None else None
    if "tags" in changes:
        prompt.tags_json = _normalize_tags(payload.tags or [])
    if "status" in changes and payload.status is not None:
        prompt.status = payload.status.value

    db.commit()
    db.refresh(prompt)
    return _to_prompt_item(prompt)


def delete_prompt_for_user(db: Session, user_id: str, prompt_id: str) -> None:
    prompt = get_prompt_by_id(db, user_id, prompt_id)
    if prompt is None:
        raise PromptNotFoundError("prompt is not found")

    delete_prompt(db, prompt)
    _sync_prompt_count_counter(db, user_id)
    db.commit()


def _resolve_prompt_category(db: Session, user_id: str, category_id: str | None):
    if category_id is None:
        return None

    category = get_prompt_category_by_id(db, user_id, category_id)
    if category is None:
        raise PromptCategoryNotFoundError("prompt category is not found")
    return category


def _normalize_tags(tags: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        label = tag.strip()
        if not label or label in seen:
            continue
        normalized.append(label)
        seen.add(label)
    return normalized


def _to_prompt_item(prompt) -> PromptItem:
    return PromptItem(
        id=prompt.id,
        title=prompt.title,
        category_id=prompt.category_id,
        category_name=prompt.category.name if prompt.category is not None else None,
        content=prompt.content,
        tags=list(prompt.tags_json or []),
        usage_count=prompt.usage_count,
        status=prompt.status,
        created_at=prompt.created_at,
    )


def _sync_prompt_count_counter(db: Session, user_id: str) -> None:
    period_key = _current_period_key()
    used_count = count_prompts_for_user(db, user_id)
    counter = get_usage_counter(db, user_id, period_key, "prompt_count")
    if counter is None:
        create_usage_counter(
            db,
            counter_id=_prefixed_id("uc"),
            user_id=user_id,
            period_key=period_key,
            metric_code="prompt_count",
            used_count=used_count,
        )
        return

    counter.used_count = used_count
    counter.updated_at = datetime.now(UTC)
    db.flush()


def _parse_seed_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


def _current_period_key() -> str:
    return datetime.now(UTC).strftime("%Y-%m")
