from __future__ import annotations

from fastapi.testclient import TestClient


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "layout"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_layout_render_draft_and_asset_upload(client: TestClient) -> None:
    headers = _auth_headers(client)

    create_article = client.post(
        "/api/v1/writer/articles",
        json={
            "title": "准备排版的文章",
            "content_md": "# 准备排版的文章\n\n这里是正文。",
        },
        headers=headers,
    )
    assert create_article.status_code == 201
    article_id = create_article.json()["id"]

    render_response = client.post(
        "/api/v1/layout/render",
        json={
            "article_id": article_id,
            "title": "准备排版的文章",
            "content_md": "# 准备排版的文章\n\n这里是正文。",
            "theme_id": "tech",
            "theme_color": "#1677ff",
            "font_family": "sans",
            "font_size": 15,
            "line_height": 1.8,
            "title_align": "center",
            "para_indent": True,
            "round_image": True,
        },
        headers=headers,
    )
    assert render_response.status_code == 200
    assert "<h1" in render_response.json()["html"]

    upload_response = client.post(
        "/api/v1/assets",
        files={"file": ("cover.png", b"fake-image-bytes", "image/png")},
        data={"asset_type": "cover_image"},
        headers=headers,
    )
    assert upload_response.status_code == 201
    asset_payload = upload_response.json()
    assert asset_payload["asset_type"] == "cover_image"
    assert asset_payload["public_url"].startswith("/uploads/")

    create_draft = client.post(
        "/api/v1/layout/drafts",
        json={
            "article_id": article_id,
            "title": "准备排版的文章",
            "cover_asset_id": asset_payload["id"],
            "content_md": "# 准备排版的文章\n\n这里是正文。",
            "theme_id": "tech",
            "theme_color": "#1677ff",
            "font_family": "sans",
            "font_size": 15,
            "line_height": 1.8,
            "title_align": "center",
            "para_indent": True,
            "round_image": True,
        },
        headers=headers,
    )
    assert create_draft.status_code == 201
    draft_payload = create_draft.json()
    assert draft_payload["article_id"] == article_id
    assert draft_payload["cover_asset_id"] == asset_payload["id"]
    assert "<h1" in draft_payload["content_html"]

    draft_detail = client.get(f"/api/v1/layout/drafts/{draft_payload['id']}", headers=headers)
    assert draft_detail.status_code == 200
    assert draft_detail.json()["title"] == "准备排版的文章"

    update_draft = client.patch(
        f"/api/v1/layout/drafts/{draft_payload['id']}",
        json={
            "article_id": article_id,
            "title": "准备排版的文章（更新）",
            "cover_asset_id": asset_payload["id"],
            "content_md": "# 准备排版的文章（更新）\n\n正文已经补充。",
            "theme_id": "default",
            "theme_color": "#FF6600",
            "font_family": "serif",
            "font_size": 16,
            "line_height": 1.9,
            "title_align": "left",
            "para_indent": False,
            "round_image": True,
        },
        headers=headers,
    )
    assert update_draft.status_code == 200
    assert update_draft.json()["title"] == "准备排版的文章（更新）"
    assert update_draft.json()["font_family"] == "serif"

    delete_draft = client.delete(f"/api/v1/layout/drafts/{draft_payload['id']}", headers=headers)
    assert delete_draft.status_code == 200
    assert delete_draft.json() == {"message": "ok"}
