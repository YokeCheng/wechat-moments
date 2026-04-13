from __future__ import annotations

from html import escape
from pathlib import Path
import re
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models.layout import Asset, LayoutDraft
from app.repo.layout_repo import (
    create_asset,
    create_layout_draft,
    delete_layout_draft,
    get_asset_by_id,
    get_layout_draft_by_id,
    query_layout_drafts,
)
from app.repo.writer_repo import get_writer_article_by_id
from app.schemas.discover import Pagination
from app.schemas.layout import (
    AssetItem,
    LayoutDraftItem,
    LayoutDraftList,
    LayoutDraftUpsertRequest,
    LayoutRenderRequest,
    LayoutRenderResponse,
)


class LayoutDraftNotFoundError(Exception):
    pass


class LayoutValidationError(Exception):
    pass


def render_layout(payload: LayoutRenderRequest) -> LayoutRenderResponse:
    return LayoutRenderResponse(html=render_markdown_to_html(payload))


def list_layout_drafts_for_user(db: Session, user_id: str, *, page: int, page_size: int) -> LayoutDraftList:
    items, total = query_layout_drafts(db, user_id, page=page, page_size=page_size)
    return LayoutDraftList(
        items=[_to_layout_draft_item(item) for item in items],
        pagination=Pagination(page=page, page_size=page_size, total=total, has_more=page * page_size < total),
    )


def create_layout_draft_for_user(db: Session, user_id: str, payload: LayoutDraftUpsertRequest) -> LayoutDraftItem:
    _validate_draft_links(db, user_id, payload)
    html = render_markdown_to_html(payload)
    draft = create_layout_draft(
        db,
        id=_prefixed_id("ld"),
        user_id=user_id,
        article_id=payload.article_id,
        title=payload.title.strip() or "未命名文章",
        cover_asset_id=payload.cover_asset_id,
        content_md=payload.content_md,
        content_html=html,
        theme_id=payload.theme_id,
        theme_color=payload.theme_color,
        font_family=payload.font_family.value,
        font_size=payload.font_size,
        line_height=payload.line_height,
        title_align=payload.title_align.value,
        para_indent=payload.para_indent,
        round_image=payload.round_image,
        status="draft",
    )
    db.commit()
    db.refresh(draft)
    return _to_layout_draft_item(draft)


def get_layout_draft_detail(db: Session, user_id: str, draft_id: str) -> LayoutDraftItem:
    draft = get_layout_draft_by_id(db, user_id, draft_id)
    if draft is None:
        raise LayoutDraftNotFoundError("layout draft is not found")
    return _to_layout_draft_item(draft)


def update_layout_draft_for_user(
    db: Session,
    user_id: str,
    draft_id: str,
    payload: LayoutDraftUpsertRequest,
) -> LayoutDraftItem:
    draft = get_layout_draft_by_id(db, user_id, draft_id)
    if draft is None:
        raise LayoutDraftNotFoundError("layout draft is not found")

    _validate_draft_links(db, user_id, payload)
    draft.article_id = payload.article_id
    draft.title = payload.title.strip() or "未命名文章"
    draft.cover_asset_id = payload.cover_asset_id
    draft.content_md = payload.content_md
    draft.content_html = render_markdown_to_html(payload)
    draft.theme_id = payload.theme_id
    draft.theme_color = payload.theme_color
    draft.font_family = payload.font_family.value
    draft.font_size = payload.font_size
    draft.line_height = payload.line_height
    draft.title_align = payload.title_align.value
    draft.para_indent = payload.para_indent
    draft.round_image = payload.round_image
    db.commit()
    db.refresh(draft)
    return _to_layout_draft_item(draft)


def delete_layout_draft_for_user(db: Session, user_id: str, draft_id: str) -> None:
    draft = get_layout_draft_by_id(db, user_id, draft_id)
    if draft is None:
        raise LayoutDraftNotFoundError("layout draft is not found")
    delete_layout_draft(db, draft)
    db.commit()


def upload_asset_for_user(
    db: Session,
    user_id: str,
    *,
    asset_type: str,
    file_name: str,
    mime_type: str,
    content: bytes,
) -> AssetItem:
    upload_root = get_upload_root()
    upload_root.mkdir(parents=True, exist_ok=True)

    asset_id = _prefixed_id("ast")
    safe_name = _sanitize_file_name(file_name)
    relative_path = Path(asset_id) / safe_name
    absolute_path = upload_root / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(content)

    public_path = "/uploads/" + str(relative_path).replace("\\", "/")
    asset = create_asset(
        db,
        id=asset_id,
        user_id=user_id,
        asset_type=asset_type,
        file_name=safe_name,
        mime_type=mime_type or "application/octet-stream",
        file_size=len(content),
        storage_key=str(relative_path).replace("\\", "/"),
        public_url=public_path,
    )
    db.commit()
    db.refresh(asset)
    return _to_asset_item(asset)


def render_markdown_to_html(payload: LayoutRenderRequest) -> str:
    accent_color = payload.theme_color
    head_color = _theme_head_color(payload.theme_id)
    paragraph_indent = "text-indent:2em;" if payload.para_indent else ""

    html = escape(payload.content_md)
    html = re.sub(
        r"^# (.+)$",
        lambda m: f'<h1 style="font-size:20px;font-weight:bold;margin:0 0 18px;color:{head_color};text-align:{payload.title_align.value};line-height:1.4;letter-spacing:0.5px">{m.group(1)}</h1>',
        html,
        flags=re.MULTILINE,
    )
    html = re.sub(
        r"^## (.+)$",
        lambda m: f'<h2 style="font-size:16px;font-weight:bold;margin:22px 0 10px;color:{accent_color};padding-left:10px;border-left:3px solid {accent_color};line-height:1.4">{m.group(1)}</h2>',
        html,
        flags=re.MULTILINE,
    )
    html = re.sub(
        r"^### (.+)$",
        lambda m: f'<h3 style="font-size:14px;font-weight:bold;margin:16px 0 8px;color:{head_color}">{m.group(1)}</h3>',
        html,
        flags=re.MULTILINE,
    )
    html = re.sub(r"\*\*(.+?)\*\*", lambda m: f'<strong style="font-weight:bold;color:{head_color}">{m.group(1)}</strong>', html)
    html = re.sub(r"\*(.+?)\*", r'<em style="font-style:italic">\1</em>', html)
    html = re.sub(
        r"^> (.+)$",
        lambda m: f'<blockquote style="border-left:3px solid {accent_color};padding:10px 14px;background:#fff8f3;margin:14px 0;border-radius:0 6px 6px 0;color:#666;font-size:13px;line-height:1.7">{m.group(1)}</blockquote>',
        html,
        flags=re.MULTILINE,
    )
    html = re.sub(r"^- (.+)$", r'<li style="margin:5px 0;padding-left:4px;color:#555">\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r"(<li[^>]*>.*?</li>\n?)+", r'<ul style="padding-left:18px;margin:10px 0;list-style:disc">\g<0></ul>', html, flags=re.DOTALL)
    html = html.replace("\n\n", f'</p><p style="margin:0 0 14px;{paragraph_indent}color:#444;line-height:{payload.line_height}">')
    html = re.sub(
        r"^(?!<[hbupl])(.+)$",
        lambda m: f'<p style="margin:0 0 14px;{paragraph_indent}color:#444;line-height:{payload.line_height}">{m.group(1)}</p>',
        html,
        flags=re.MULTILINE,
    )
    return html


def get_upload_root() -> Path:
    return Path(__file__).resolve().parents[3] / ".runtime" / "uploads"


def _validate_draft_links(db: Session, user_id: str, payload: LayoutDraftUpsertRequest) -> None:
    if payload.article_id is not None and get_writer_article_by_id(db, user_id, payload.article_id) is None:
        raise LayoutValidationError("writer article is not found")
    if payload.cover_asset_id is not None and get_asset_by_id(db, user_id, payload.cover_asset_id) is None:
        raise LayoutValidationError("cover asset is not found")


def _theme_head_color(theme_id: str) -> str:
    return {
        "default": "#1a1a1a",
        "elegant": "#3d2b1f",
        "fresh": "#1a3a2a",
        "tech": "#0d1f3c",
    }.get(theme_id, "#1a1a1a")


def _sanitize_file_name(file_name: str) -> str:
    cleaned = Path(file_name).name
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "-", cleaned)
    return cleaned or "upload.bin"


def _to_layout_draft_item(draft: LayoutDraft) -> LayoutDraftItem:
    return LayoutDraftItem(
        id=draft.id,
        article_id=draft.article_id,
        title=draft.title,
        cover_asset_id=draft.cover_asset_id,
        content_md=draft.content_md,
        content_html=draft.content_html,
        theme_id=draft.theme_id,
        theme_color=draft.theme_color,
        font_family=draft.font_family,
        font_size=draft.font_size,
        line_height=draft.line_height,
        title_align=draft.title_align,
        para_indent=draft.para_indent,
        round_image=draft.round_image,
        status=draft.status,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


def _to_asset_item(asset: Asset) -> AssetItem:
    return AssetItem(
        id=asset.id,
        asset_type=asset.asset_type,
        file_name=asset.file_name,
        mime_type=asset.mime_type,
        size=asset.file_size,
        public_url=asset.public_url,
    )


def _prefixed_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}"
