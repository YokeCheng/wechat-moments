from __future__ import annotations

import time

from fastapi.testclient import TestClient


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "writer"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_writer_group_and_article_crud(client: TestClient) -> None:
    headers = _auth_headers(client)

    groups_response = client.get("/api/v1/writer/groups", headers=headers)
    assert groups_response.status_code == 200
    assert groups_response.json()["items"] == []

    create_group = client.post("/api/v1/writer/groups", json={"name": "科技专题"}, headers=headers)
    assert create_group.status_code == 201
    created_group = create_group.json()
    assert created_group["name"] == "科技专题"
    assert created_group["article_count"] == 0

    create_article = client.post(
        "/api/v1/writer/articles",
        json={
            "title": "AI 选题清单",
            "group_id": created_group["id"],
            "image_count": 2,
            "content_md": "# AI 选题清单\n\n先搭框架，再补案例。",
        },
        headers=headers,
    )
    assert create_article.status_code == 201
    created_article = create_article.json()
    assert created_article["group_name"] == "科技专题"
    assert created_article["status"] == "draft"
    assert created_article["word_count"] > 0

    list_articles = client.get("/api/v1/writer/articles", params={"page": 1, "page_size": 10}, headers=headers)
    assert list_articles.status_code == 200
    article_payload = list_articles.json()
    assert article_payload["pagination"] == {
        "page": 1,
        "page_size": 10,
        "total": 1,
        "has_more": False,
    }
    assert article_payload["items"][0]["id"] == created_article["id"]

    update_article = client.patch(
        f"/api/v1/writer/articles/{created_article['id']}",
        json={
            "title": "AI 选题清单（更新）",
            "status": "completed",
            "content_md": "# AI 选题清单（更新）\n\n现在可以直接进入排版。",
        },
        headers=headers,
    )
    assert update_article.status_code == 200
    updated_article = update_article.json()
    assert updated_article["title"] == "AI 选题清单（更新）"
    assert updated_article["status"] == "completed"

    delete_group = client.delete(f"/api/v1/writer/groups/{created_group['id']}", headers=headers)
    assert delete_group.status_code == 200
    assert delete_group.json() == {"message": "ok"}

    article_detail = client.get(f"/api/v1/writer/articles/{created_article['id']}", headers=headers)
    assert article_detail.status_code == 200
    assert article_detail.json()["group_id"] is None

    delete_article = client.delete(f"/api/v1/writer/articles/{created_article['id']}", headers=headers)
    assert delete_article.status_code == 200
    assert delete_article.json() == {"message": "ok"}


def test_generate_task_completes_and_updates_usage(client: TestClient) -> None:
    headers = _auth_headers(client)

    prompt_list = client.get("/api/v1/prompts", params={"page": 1, "page_size": 10}, headers=headers)
    assert prompt_list.status_code == 200
    prompt_id = prompt_list.json()["items"][0]["id"]

    usage_before = client.get("/api/v1/me", headers=headers)
    assert usage_before.status_code == 200
    assert usage_before.json()["usage"]["generate_daily_used"] == 0

    create_task = client.post(
        "/api/v1/writer/generate-tasks",
        json={
            "title": "GPT-5 对内容工作流的影响",
            "prompt_id": prompt_id,
            "ref_url": "https://example.com/reference",
            "image_count": 3,
        },
        headers=headers,
    )
    assert create_task.status_code == 202
    task_payload = create_task.json()
    assert task_payload["article_id"]
    assert task_payload["status"] in {"queued", "running", "succeeded"}

    final_task = task_payload
    for _ in range(20):
        task_detail = client.get(f"/api/v1/writer/generate-tasks/{task_payload['id']}", headers=headers)
        assert task_detail.status_code == 200
        final_task = task_detail.json()
        if final_task["status"] in {"succeeded", "failed"}:
            break
        time.sleep(0.05)

    assert final_task["status"] == "succeeded"

    article_detail = client.get(f"/api/v1/writer/articles/{task_payload['article_id']}", headers=headers)
    assert article_detail.status_code == 200
    article_payload = article_detail.json()
    assert article_payload["status"] == "completed"
    assert "GPT-5 对内容工作流的影响" in article_payload["content_md"]
    assert article_payload["word_count"] > 0

    usage_after = client.get("/api/v1/me", headers=headers)
    assert usage_after.status_code == 200
    assert usage_after.json()["usage"]["generate_daily_used"] == 1
