from __future__ import annotations

from fastapi.testclient import TestClient


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/dev-login", json={"username": "prompter"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_prompt_categories_and_prompts_support_seed_filters_and_pagination(client: TestClient) -> None:
    headers = _auth_headers(client)

    categories_response = client.get("/api/v1/prompt-categories", headers=headers)
    assert categories_response.status_code == 200
    categories_payload = categories_response.json()
    assert len(categories_payload["items"]) == 6
    assert {item["name"] for item in categories_payload["items"]} >= {"情感", "教育", "科技"}

    prompts_response = client.get(
        "/api/v1/prompts",
        params={"category_id": categories_payload["items"][3]["id"], "keyword": "AI", "page": 1, "page_size": 5},
        headers=headers,
    )
    assert prompts_response.status_code == 200
    prompts_payload = prompts_response.json()
    assert prompts_payload["pagination"] == {
        "page": 1,
        "page_size": 5,
        "total": 1,
        "has_more": False,
    }
    assert len(prompts_payload["items"]) == 1
    assert prompts_payload["items"][0]["status"] == "generating"
    assert prompts_payload["items"][0]["category_name"] == "科技"
    assert "AI" in prompts_payload["items"][0]["title"]


def test_prompt_category_crud_and_delete_guard(client: TestClient) -> None:
    headers = _auth_headers(client)
    categories_response = client.get("/api/v1/prompt-categories", headers=headers)
    categories_payload = categories_response.json()
    seeded_category_id = next(item["id"] for item in categories_payload["items"] if item["name"] == "情感")

    conflict_response = client.delete(f"/api/v1/prompt-categories/{seeded_category_id}", headers=headers)
    assert conflict_response.status_code == 409
    assert conflict_response.json()["detail"] == "category still contains prompts"

    create_response = client.post("/api/v1/prompt-categories", json={"name": "职场"}, headers=headers)
    assert create_response.status_code == 201
    created_category = create_response.json()
    assert created_category["name"] == "职场"
    assert created_category["count"] == 0

    update_response = client.patch(
        f"/api/v1/prompt-categories/{created_category['id']}",
        json={"name": "职场成长"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "职场成长"

    delete_response = client.delete(f"/api/v1/prompt-categories/{created_category['id']}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"message": "ok"}


def test_prompt_crud_updates_usage_summary(client: TestClient) -> None:
    headers = _auth_headers(client)
    categories_payload = client.get("/api/v1/prompt-categories", headers=headers).json()
    health_category_id = next(item["id"] for item in categories_payload["items"] if item["name"] == "健康")

    create_response = client.post(
        "/api/v1/prompts",
        json={
            "title": "新的健康选题框架",
            "category_id": health_category_id,
            "content": "围绕{主题}生成一篇结构清晰的健康文章。",
            "tags": ["健康", "结构化", "实用"],
            "status": "draft",
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    created_prompt = create_response.json()
    assert created_prompt["category_name"] == "健康"
    assert created_prompt["status"] == "draft"

    usage_after_create = client.get("/api/v1/me", headers=headers)
    assert usage_after_create.status_code == 200
    assert usage_after_create.json()["usage"]["prompt_count"] == 9

    detail_response = client.get(f"/api/v1/prompts/{created_prompt['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["title"] == "新的健康选题框架"

    update_response = client.patch(
        f"/api/v1/prompts/{created_prompt['id']}",
        json={
            "title": "更新后的健康选题框架",
            "content": "围绕{主题}生成一篇可信、可执行、带建议的健康文章。",
            "tags": ["健康", "权威"],
            "status": "active",
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    updated_prompt = update_response.json()
    assert updated_prompt["title"] == "更新后的健康选题框架"
    assert updated_prompt["tags"] == ["健康", "权威"]
    assert updated_prompt["status"] == "active"

    delete_response = client.delete(f"/api/v1/prompts/{created_prompt['id']}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"message": "ok"}

    usage_after_delete = client.get("/api/v1/me", headers=headers)
    assert usage_after_delete.status_code == 200
    assert usage_after_delete.json()["usage"]["prompt_count"] == 8


def test_prompt_endpoints_require_auth(client: TestClient) -> None:
    assert client.get("/api/v1/prompt-categories").status_code == 401
    assert client.get("/api/v1/prompts").status_code == 401
