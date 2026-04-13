from __future__ import annotations

from datetime import UTC, datetime
import time
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.prompts import Prompt
from app.db.models.writer import GenerateTask, GenerateTaskStatus, WriterArticle, WriterArticleStatus
from app.db.session import SessionLocal
from app.repo.auth_repo import create_usage_counter, get_usage_counter
from app.repo.prompt_repo import get_prompt_by_id
from app.repo.writer_repo import (
    count_writer_articles_for_user,
    count_writer_groups_for_user,
    create_generate_task,
    create_writer_article,
    create_writer_group,
    delete_writer_article,
    detach_articles_from_group,
    get_generate_task_by_id,
    get_generate_task_for_worker,
    get_max_writer_group_sort_order,
    get_writer_article_by_id,
    get_writer_group_by_id,
    get_writer_group_by_name,
    list_writer_groups_with_counts,
    query_writer_articles,
    remove_writer_group,
)
from app.schemas.discover import Pagination
from app.schemas.writer import (
    GenerateTaskCreateRequest,
    GenerateTaskItem,
    WriterArticleCreateRequest,
    WriterArticleItem,
    WriterArticleList,
    WriterArticleQuery,
    WriterArticleUpdateRequest,
    WriterGroupCreateRequest,
    WriterGroupItem,
    WriterGroupList,
)


WRITER_GROUP_SEEDS: tuple[str, ...] = ("情感类", "财经类", "科技类", "健康类", "生活类")
WRITER_ARTICLE_SEEDS: tuple[dict[str, object], ...] = (
    {
        "title": "那些让你痛苦的关系，其实都是你自己选择的",
        "group_name": "情感类",
        "prompt_title": "爆款情感文章生成",
        "status": "completed",
        "image_count": 3,
        "ref_url": "https://example.com/weixin/dca_wx_001",
        "content_md": "# 那些让你痛苦的关系，其实都是你自己选择的\n\n## 一、为什么关系会反复让人受伤\n\n很多痛苦，不是突然发生，而是反复默认的结果。\n\n## 二、真正该修正的是选择机制\n\n当你意识到自己总被同一种关系吸引，问题就不再只是对方，而是你的边界、期待和恐惧。\n\n## 三、把主动权拿回来\n\n先承认不舒服，再决定要不要继续，这才是关系里的主导权。",
    },
    {
        "title": "GPT-5 发布之后，普通创作者最该抓住的三个机会",
        "group_name": "科技类",
        "prompt_title": "AI科技热点解读",
        "status": "completed",
        "image_count": 4,
        "ref_url": "https://example.com/weixin/dca_wx_005",
        "content_md": "# GPT-5 发布之后，普通创作者最该抓住的三个机会\n\n## 一、信息整理效率被重新定义\n\n## 二、内容生产从单点工具变成工作流\n\n## 三、真正稀缺的是选题判断与表达风格",
    },
    {
        "title": "每天到底走多少步才算够，最新研究已经给出答案",
        "group_name": "健康类",
        "prompt_title": "健康养生科普文",
        "status": "draft",
        "image_count": 2,
        "ref_url": "https://example.com/weixin/dca_wx_002",
        "content_md": "# 每天到底走多少步才算够\n\n先别急着盯着一万步，关键是长期、稳定、可执行。",
    },
)


class WriterGroupNotFoundError(Exception):
    pass


class WriterArticleNotFoundError(Exception):
    pass


class GenerateTaskNotFoundError(Exception):
    pass


class WriterConflictError(Exception):
    pass


class WriterValidationError(Exception):
    pass


def ensure_writer_seed_data(db: Session, user_id: str) -> None:
    if count_writer_groups_for_user(db, user_id) > 0 or count_writer_articles_for_user(db, user_id) > 0:
        return

    group_id_map: dict[str, str] = {}
    for index, name in enumerate(WRITER_GROUP_SEEDS, start=1):
        group = create_writer_group(
            db,
            id=_prefixed_id("wg"),
            user_id=user_id,
            name=name,
            sort_order=index,
        )
        group_id_map[name] = group.id

    prompt_by_title: dict[str, Prompt] = {}
    for seed in WRITER_ARTICLE_SEEDS:
        prompt = _get_prompt_by_title(db, user_id, str(seed["prompt_title"]))
        if prompt is not None:
            prompt_by_title[str(seed["prompt_title"])] = prompt

    for seed in WRITER_ARTICLE_SEEDS:
        prompt = prompt_by_title.get(str(seed["prompt_title"]))
        content_md = str(seed["content_md"])
        create_writer_article(
            db,
            id=_prefixed_id("wa"),
            user_id=user_id,
            group_id=group_id_map[str(seed["group_name"])],
            prompt_id=prompt.id if prompt is not None else None,
            title=str(seed["title"]),
            ref_url=str(seed["ref_url"]),
            image_count=int(seed["image_count"]),
            word_count=_count_words(content_md),
            status=str(seed["status"]),
            content_md=content_md,
            error_message=None,
        )

    db.commit()


def list_writer_groups(db: Session, user_id: str) -> WriterGroupList:
    return WriterGroupList(
        items=[
            WriterGroupItem(id=group.id, name=group.name, article_count=article_count)
            for group, article_count in list_writer_groups_with_counts(db, user_id)
        ]
    )


def create_writer_group_for_user(db: Session, user_id: str, payload: WriterGroupCreateRequest) -> WriterGroupItem:
    name = payload.name.strip()
    if not name:
        raise WriterValidationError("group name must not be empty")
    if get_writer_group_by_name(db, user_id, name) is not None:
        raise WriterConflictError("group name already exists")

    group = create_writer_group(
        db,
        id=_prefixed_id("wg"),
        user_id=user_id,
        name=name,
        sort_order=get_max_writer_group_sort_order(db, user_id) + 1,
    )
    db.commit()
    return WriterGroupItem(id=group.id, name=group.name, article_count=0)


def delete_writer_group_for_user(db: Session, user_id: str, group_id: str) -> None:
    group = get_writer_group_by_id(db, user_id, group_id)
    if group is None:
        raise WriterGroupNotFoundError("writer group is not found")

    detach_articles_from_group(db, user_id, group_id)
    remove_writer_group(db, group)
    db.commit()


def list_writer_articles_for_user(db: Session, user_id: str, filters: WriterArticleQuery) -> WriterArticleList:
    items, total = query_writer_articles(db, user_id, filters)
    return WriterArticleList(
        items=[_to_writer_article_item(item) for item in items],
        pagination=Pagination(
            page=filters.page,
            page_size=filters.page_size,
            total=total,
            has_more=filters.page * filters.page_size < total,
        ),
    )


def get_writer_article_detail(db: Session, user_id: str, article_id: str) -> WriterArticleItem:
    article = get_writer_article_by_id(db, user_id, article_id)
    if article is None:
        raise WriterArticleNotFoundError("writer article is not found")
    return _to_writer_article_item(article)


def create_writer_article_for_user(db: Session, user_id: str, payload: WriterArticleCreateRequest) -> WriterArticleItem:
    title = payload.title.strip()
    if not title:
        raise WriterValidationError("article title must not be empty")

    group = _resolve_group(db, user_id, payload.group_id)
    prompt = _resolve_prompt(db, user_id, payload.prompt_id)
    content_md = payload.content_md.strip()

    article = create_writer_article(
        db,
        id=_prefixed_id("wa"),
        user_id=user_id,
        group_id=group.id if group is not None else None,
        prompt_id=prompt.id if prompt is not None else None,
        title=title,
        ref_url=(payload.ref_url or "").strip() or None,
        image_count=payload.image_count,
        word_count=_count_words(content_md),
        status=WriterArticleStatus.DRAFT.value,
        content_md=content_md,
        error_message=None,
    )
    db.commit()
    db.refresh(article)
    return _to_writer_article_item(article)


def update_writer_article_for_user(
    db: Session,
    user_id: str,
    article_id: str,
    payload: WriterArticleUpdateRequest,
) -> WriterArticleItem:
    article = get_writer_article_by_id(db, user_id, article_id)
    if article is None:
        raise WriterArticleNotFoundError("writer article is not found")

    changes = payload.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (payload.title or "").strip()
        if not title:
            raise WriterValidationError("article title must not be empty")
        article.title = title
    if "group_id" in changes:
        group = _resolve_group(db, user_id, payload.group_id)
        article.group_id = group.id if group is not None else None
    if "prompt_id" in changes:
        prompt = _resolve_prompt(db, user_id, payload.prompt_id)
        article.prompt_id = prompt.id if prompt is not None else None
    if "ref_url" in changes:
        article.ref_url = (payload.ref_url or "").strip() or None
    if "image_count" in changes and payload.image_count is not None:
        article.image_count = payload.image_count
    if "content_md" in changes and payload.content_md is not None:
        article.content_md = payload.content_md
        article.word_count = _count_words(payload.content_md)
    if "status" in changes and payload.status is not None:
        article.status = payload.status.value
        if payload.status != WriterArticleStatus.FAILED:
            article.error_message = None

    db.commit()
    db.refresh(article)
    return _to_writer_article_item(article)


def delete_writer_article_for_user(db: Session, user_id: str, article_id: str) -> None:
    article = get_writer_article_by_id(db, user_id, article_id)
    if article is None:
        raise WriterArticleNotFoundError("writer article is not found")
    delete_writer_article(db, article)
    db.commit()


def create_generate_task_for_user(db: Session, user_id: str, payload: GenerateTaskCreateRequest) -> GenerateTaskItem:
    title = payload.title.strip()
    if not title:
        raise WriterValidationError("generate title must not be empty")

    group = _resolve_group(db, user_id, payload.group_id)
    prompt = _resolve_prompt(db, user_id, payload.prompt_id)
    ref_url = (payload.ref_url or "").strip() or None

    article = create_writer_article(
        db,
        id=_prefixed_id("wa"),
        user_id=user_id,
        group_id=group.id if group is not None else None,
        prompt_id=prompt.id if prompt is not None else None,
        title=title,
        ref_url=ref_url,
        image_count=payload.image_count,
        word_count=0,
        status=WriterArticleStatus.GENERATING.value,
        content_md="",
        error_message=None,
    )

    if prompt is not None:
        prompt.usage_count += 1

    task = create_generate_task(
        db,
        id=_prefixed_id("gt"),
        user_id=user_id,
        article_id=article.id,
        task_type="generate_article",
        status=GenerateTaskStatus.QUEUED.value,
        model_name="harness-demo-generator",
        prompt_snapshot=prompt.content if prompt is not None else "",
        input_payload={
            "title": title,
            "group_id": group.id if group is not None else None,
            "prompt_id": prompt.id if prompt is not None else None,
            "prompt_title": prompt.title if prompt is not None else None,
            "ref_url": ref_url,
            "image_count": payload.image_count,
        },
        output_payload={},
        error_message=None,
        started_at=None,
        finished_at=None,
    )
    _increment_generate_usage_counter(db, user_id)
    db.commit()
    db.refresh(task)
    return _to_generate_task_item(task)


def get_generate_task_detail(db: Session, user_id: str, task_id: str) -> GenerateTaskItem:
    task = get_generate_task_by_id(db, user_id, task_id)
    if task is None:
        raise GenerateTaskNotFoundError("generate task is not found")
    return _to_generate_task_item(task)


def execute_generate_task(task_id: str) -> None:
    with SessionLocal() as db:
        task = get_generate_task_for_worker(db, task_id)
        if task is None or task.article is None or task.status != GenerateTaskStatus.QUEUED.value:
            return

        task.status = GenerateTaskStatus.RUNNING.value
        task.started_at = datetime.now(UTC)
        task.article.status = WriterArticleStatus.GENERATING.value
        task.article.error_message = None
        db.commit()

        try:
            time.sleep(0.2)
            generated_content = _build_generated_content(task.article, task.input_payload, task.prompt_snapshot)
            task.article.content_md = generated_content
            task.article.word_count = _count_words(generated_content)
            task.article.status = WriterArticleStatus.COMPLETED.value
            task.article.error_message = None
            task.status = GenerateTaskStatus.SUCCEEDED.value
            task.finished_at = datetime.now(UTC)
            task.output_payload = {
                "word_count": task.article.word_count,
                "preview": generated_content[:120],
            }
            db.commit()
        except Exception as exc:  # pragma: no cover
            db.rollback()
            failed_task = get_generate_task_for_worker(db, task_id)
            if failed_task is None or failed_task.article is None:
                return
            failed_task.status = GenerateTaskStatus.FAILED.value
            failed_task.error_message = str(exc)
            failed_task.finished_at = datetime.now(UTC)
            failed_task.article.status = WriterArticleStatus.FAILED.value
            failed_task.article.error_message = str(exc)
            db.commit()


def _resolve_group(db: Session, user_id: str, group_id: str | None):
    if group_id is None:
        return None

    group = get_writer_group_by_id(db, user_id, group_id)
    if group is None:
        raise WriterGroupNotFoundError("writer group is not found")
    return group


def _resolve_prompt(db: Session, user_id: str, prompt_id: str | None):
    if prompt_id is None:
        return None

    prompt = get_prompt_by_id(db, user_id, prompt_id)
    if prompt is None:
        raise WriterValidationError("prompt is not found")
    return prompt


def _to_writer_article_item(article: WriterArticle) -> WriterArticleItem:
    return WriterArticleItem(
        id=article.id,
        title=article.title,
        group_id=article.group_id,
        group_name=article.group.name if article.group is not None else None,
        prompt_id=article.prompt_id,
        prompt_title=article.prompt.title if article.prompt is not None else None,
        ref_url=article.ref_url,
        image_count=article.image_count,
        word_count=article.word_count,
        status=article.status,
        content_md=article.content_md,
        created_at=article.created_at,
        updated_at=article.updated_at,
    )


def _to_generate_task_item(task: GenerateTask) -> GenerateTaskItem:
    return GenerateTaskItem(
        id=task.id,
        article_id=task.article_id,
        status=task.status,
        error_message=task.error_message,
        started_at=task.started_at,
        finished_at=task.finished_at,
        created_at=task.created_at,
    )


def _count_words(content: str) -> int:
    return len("".join(content.split()))


def _increment_generate_usage_counter(db: Session, user_id: str) -> None:
    period_key = _current_period_key()
    counter = get_usage_counter(db, user_id, period_key, "generate_daily")
    if counter is None:
        create_usage_counter(
            db,
            counter_id=_prefixed_id("uc"),
            user_id=user_id,
            period_key=period_key,
            metric_code="generate_daily",
            used_count=1,
        )
        return

    counter.used_count += 1
    counter.updated_at = datetime.now(UTC)
    db.flush()


def _get_prompt_by_title(db: Session, user_id: str, title: str) -> Prompt | None:
    statement = select(Prompt).where(Prompt.user_id == user_id).where(Prompt.title == title)
    return db.scalar(statement)


def _build_generated_content(
    article: WriterArticle,
    input_payload: dict[str, object],
    prompt_snapshot: str,
) -> str:
    ref_url = str(input_payload.get("ref_url") or "").strip()
    prompt_hint = str(input_payload.get("prompt_title") or "").strip()
    image_count = int(input_payload.get("image_count") or 0)

    parts = [
        f"# {article.title}",
        "## 一、先看结论",
        f"{article.title} 之所以值得写，不是因为它只是一个热点，而是它天然适合被重组为一篇有结构、有观点、可直接发布的内容。",
        "## 二、为什么这个选题现在值得做",
        "当前用户更需要的是被快速理解、被快速带走结论的内容。因此，写作时要先给判断，再给依据，最后给行动建议。",
        "## 三、正文应该怎么展开",
        "可以按“背景变化 -> 核心矛盾 -> 可执行建议”的顺序写，避免堆素材，避免空泛抒情，每一段都服务于一个明确观点。",
    ]
    if prompt_hint:
        parts.extend(
            [
                "## 四、提示词策略",
                f"本次生成参考了提示词《{prompt_hint}》的结构约束，因此成稿会更偏向可复用、可继续改写的工作流文本。",
            ]
        )
    if ref_url:
        parts.extend(
            [
                "## 五、参考素材如何使用",
                f"可把原始素材中的关键事实与案例整理进正文，并在发布前再人工核对一遍引用来源：{ref_url}",
            ]
        )
    parts.extend(
        [
            "## 六、落地建议",
            f"如果准备进入排版阶段，建议保留 {image_count} 张图片位，用于封面、核心观点卡片和案例说明图。",
            "## 结尾",
            "真正高效的内容生产，不是一次写满，而是把选题、结构、生成、编辑和排版串成稳定流程。先让链路跑通，再持续优化质量。",
        ]
    )
    if prompt_snapshot:
        parts.append(f"\n> 提示词快照摘要：{prompt_snapshot[:120]}")
    return "\n\n".join(parts)


def _prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"


def _current_period_key() -> str:
    return datetime.now(UTC).strftime("%Y-%m")
