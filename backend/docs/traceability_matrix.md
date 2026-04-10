# Traceability Matrix

首批已落地的示范执行包：

- `backend/docs/p0_01_auth_execution_pack.md`
- `backend/docs/p0_02_discover_execution_pack.md`

## 1. Purpose

本文档用于把 Slice、页面、接口、数据实体、测试和 Gate 状态串成一张追踪矩阵。
目标是避免“知道做了什么代码，但不知道它落在哪条主链路上”。

## 2. How To Use

每个 Slice 至少应能追踪到以下对象：

- route
- endpoint
- entity
- test
- gate
- mock retirement status

推荐在每次 Slice 推进后回写本矩阵。

## 3. Governance Summary Matrix

| Slice | Route | Core endpoints | Core entities | Required tests | Current gate target | Critical mock / drift | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `G0-01 Harness Execution Foundation` | none | none | none | script self-check + workflow run + local live preview bootstrap | `G0 complete` | Phase A checks, root consensus entry, and reusable local live preview scripts are now wired | done |
| `G0-02 LAN Infra Foundation` | none | none | none | compose validation + infra startup checklist | `G0 complete` | app containers are still pending, but P0 infra prerequisites are now explicit | done |

## 4. P0 Summary Matrix

| Slice | Route | Core endpoints | Core entities | Required tests | Current gate target | Critical mock / drift | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `P0-01 Auth And Current User` | global navigation | `POST /api/v1/auth/dev-login`, `GET /api/v1/me` | `users`, `subscriptions`, `usage_counters` | contract + auth integration | `G2 complete, next G3` | current user is now sourced from backend in global navigation | done |
| `P0-02 Discover Read` | `/` | `GET /api/v1/discover/articles`, `GET /api/v1/discover/hot-topics` | `discover_articles`, `hot_topics` | contract + filter integration + homepage smoke | `G3 complete, next P0-03` | homepage now reads backend discover APIs | done |
| `P0-03 Prompt Library CRUD` | `/prompts` | prompt category CRUD, prompt CRUD | `prompt_categories`, `prompts` | contract + CRUD integration + prompt status test | `G0` | `frontend/src/mocks/prompts.ts` | planned |
| `P0-04 Writer Workspace` | `/writer` | group CRUD, article CRUD | `writer_groups`, `writer_articles` | contract + article CRUD integration + handoff smoke | `G0` | `frontend/src/mocks/writerArticles.ts` | planned |
| `P0-05 Generate Task` | `/writer` | `POST /api/v1/writer/generate-tasks`, `GET /api/v1/writer/generate-tasks/{taskId}` | `generate_tasks`, `writer_articles` | contract + task-state integration + polling smoke | `G0` | local `setTimeout` generation | planned |
| `P0-06 Layout Workspace` | `/layout` | `POST /api/v1/layout/render`, layout draft CRUD | `layout_drafts` | contract + draft persistence integration + layout smoke | `G0` | save still local toast | planned |
| `P0-07 Asset Upload` | `/layout` | `POST /api/v1/assets` | `assets` | upload contract + storage integration | `G0` | `FileReader` local-only flow | planned |

## 5. Detailed Matrix For P0-01

| Dimension | Reference | Expected state | Current state |
| --- | --- | --- | --- |
| slice registry | `backend/docs/slice_registry.md` | registered | yes |
| product scope | `backend/docs/prd.md` | P0 scope covered | yes |
| frontend surface | global navigation | reads real current user context | yes |
| endpoint | `POST /api/v1/auth/dev-login`, `GET /api/v1/me` | implemented and tested | yes |
| entity 1 | `users` | queryable | yes |
| entity 2 | `subscriptions` | queryable | yes |
| entity 3 | `usage_counters` | queryable | yes |
| auth context | bearer identity or equivalent | stable for downstream slices | yes |
| plan summary | derived from current subscription | stable | yes |
| usage summary | derived from usage counters | stable | yes |
| gate | `G2` | pass | yes |
| next gate | `G3` | downstream slices can now reuse stable user context | ready |

## 6. Detailed Matrix For P0-02

| Dimension | Reference | Expected state | Current state |
| --- | --- | --- | --- |
| slice registry | `backend/docs/slice_registry.md` | registered | yes |
| product scope | `backend/docs/prd.md` | P0 scope covered | yes |
| frontend route | `/` | registered and active | yes |
| frontend page | `frontend/src/pages/home/page.tsx` | reads backend data | yes |
| main data source | `frontend/src/mocks/articles.ts` | retired from primary path | yes |
| endpoint 1 | `GET /api/v1/discover/articles` | implemented and tested | yes |
| endpoint 2 | `GET /api/v1/discover/hot-topics` | implemented and tested | yes |
| entity 1 | `discover_articles` | queryable | yes |
| entity 2 | `hot_topics` | queryable | yes |
| page states | loading / empty / error / success | all explicit | yes |
| gate | `G3` | pass | yes |
| next gate | `P0-03` | prompt library can now reuse stable discover entry flow | ready |

## 7. Matrix Template

可为后续 Slice 复制以下模板：

```text
Slice:
Route:
Frontend page:
Core endpoints:
Core entities:
Dependency slices:
Primary mock / drift:
Required tests:
Current gate:
Next gate:
Current blockers:
Documents to sync:
```

## 8. Recommended Update Timing

以下时点应回写矩阵：

- 新增 Slice
- Slice 从 `planned` 进入 `in_progress`
- 某个 Gate 通过
- 主链路 mock 退休
- 页面从原型切到真实接口

## 9. Bottom Line

追踪矩阵的意义不是列清单，而是让每条平台能力都能回答：

- 它在哪个页面生效
- 它依赖哪些接口
- 它落在哪些实体上
- 它由哪些测试守住
- 它当前卡在哪个 Gate

回答不出来，就说明这条能力还不受 Harness 控制。
