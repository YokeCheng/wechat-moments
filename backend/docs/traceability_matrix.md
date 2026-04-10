# 追踪矩阵

首批已落地的示范执行包：

- `backend/docs/p0_01_auth_execution_pack.md`
- `backend/docs/p0_02_discover_execution_pack.md`

## 1. 目的

本文档用于把 Slice、页面、接口、数据实体、测试和 Gate 状态串成一张追踪矩阵。
目标是避免“知道做了什么代码，但不知道它落在哪条主链路上”。

## 2. 使用方式

每个 Slice 至少应能追踪到以下对象：

- route
- endpoint
- entity
- test
- gate
- mock retirement status

推荐在每次 Slice 推进后回写本矩阵。

## 3. 治理切片总览矩阵

| 切片 | 路由 | 核心接口 | 核心实体 | 必要验证 | 当前目标 Gate | 关键 mock / 漂移 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `G0-01 Harness Execution Foundation` | 无 | 无 | 无 | 脚本自检 + workflow 运行 + 本机实时预览启动验证 | `G0 完成` | Phase A 检查、根目录项目共识入口和可复用的本机实时预览脚本均已接入 | `done` |
| `G0-02 LAN Infra Foundation` | 无 | 无 | 无 | compose 校验 + 基础设施启动清单 | `G0 完成` | 应用容器仍待后续接入，但 P0 所需基础设施前置条件已经明确 | `done` |

## 4. P0 总览矩阵

| 切片 | 路由 | 核心接口 | 核心实体 | 必要验证 | 当前目标 Gate | 关键 mock / 漂移 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `P0-01 Auth And Current User` | 全局导航 | `POST /api/v1/auth/dev-login`, `GET /api/v1/me` | `users`, `subscriptions`, `usage_counters` | 契约验证 + 认证集成 | `G2 完成，下一步 G3` | 全局导航中的当前用户上下文已改为后端真实来源 | `done` |
| `P0-02 Discover Read` | `/` | `GET /api/v1/discover/articles`, `GET /api/v1/discover/hot-topics` | `discover_articles`, `hot_topics` | 契约验证 + 筛选集成 + 首页冒烟 | `G3 完成，下一步 P0-03` | 首页已改为读取后端 discover 接口 | `done` |
| `P0-03 Prompt Library CRUD` | `/prompts` | 提示词分类 CRUD、提示词 CRUD | `prompt_categories`, `prompts` | 契约验证 + CRUD 集成 + 提示词状态验证 | `G0` | `frontend/src/mocks/prompts.ts` | `planned` |
| `P0-04 Writer Workspace` | `/writer` | 分组 CRUD、文章 CRUD | `writer_groups`, `writer_articles` | 契约验证 + 文章 CRUD 集成 + 交接冒烟 | `G0` | `frontend/src/mocks/writerArticles.ts` | `planned` |
| `P0-05 Generate Task` | `/writer` | `POST /api/v1/writer/generate-tasks`, `GET /api/v1/writer/generate-tasks/{taskId}` | `generate_tasks`, `writer_articles` | 契约验证 + 任务状态集成 + 轮询冒烟 | `G0` | 本地 `setTimeout` 生文模拟 | `planned` |
| `P0-06 Layout Workspace` | `/layout` | `POST /api/v1/layout/render`、排版草稿 CRUD | `layout_drafts` | 契约验证 + 草稿持久化集成 + 排版冒烟 | `G0` | 保存仍然只是本地 toast | `planned` |
| `P0-07 Asset Upload` | `/layout` | `POST /api/v1/assets` | `assets` | 上传契约 + 存储集成 | `G0` | `FileReader` 仍是仅本地流程 | `planned` |

## 5. P0-01 详细矩阵

| 维度 | 参考对象 | 期望状态 | 当前状态 |
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

## 6. P0-02 详细矩阵

| 维度 | 参考对象 | 期望状态 | 当前状态 |
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

## 7. 矩阵模板

可为后续 Slice 复制以下模板：

```text
切片：
路由：
前端页面：
核心接口：
核心实体：
依赖切片：
主要 mock / 漂移点：
必要验证：
当前 Gate：
下一步 Gate：
当前阻塞：
需要同步的文档：
```

## 8. 建议更新时间

以下时点应回写矩阵：

- 新增 Slice
- Slice 从 `planned` 进入 `in_progress`
- 某个 Gate 通过
- 主链路 mock 退休
- 页面从原型切到真实接口

## 9. 底线

追踪矩阵的意义不是列清单，而是让每条平台能力都能回答：

- 它在哪个页面生效
- 它依赖哪些接口
- 它落在哪些实体上
- 它由哪些测试守住
- 它当前卡在哪个 Gate

回答不出来，就说明这条能力还不受 Harness 控制。
