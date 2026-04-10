# Doc Drift Scanner Plan

## 1. Purpose

本文档定义一个面向 Harness 的文档漂移扫描方案。
目标是自动发现“代码、页面、契约、Slice 状态、文档描述彼此不一致”的位置，并把这些漂移变成可修复任务。

当前仓库已在 `tools/harness/` 中落地首批 Phase A 和部分 Phase B 扫描能力：

- required docs
- OpenAPI parse
- slice to spec drift
- dead navigation targets
- mock critical path drift

## 2. Scanner Goals

扫描器至少要发现以下 6 类问题：

- 缺失关键 Harness 文档
- route 注册与 feature inventory 不一致
- 关键 mock 已不该存在但仍在主链路使用
- spec 与 Slice 注册不一致
- spec 与页面消费字段不一致
- 文档入口仍指向过期规则或缺失文档

## 3. Inputs

扫描器主要读取：

- `AGENTS.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/slice_registry.md`
- `backend/docs/traceability_matrix.md`
- `frontend/src/router/config.tsx`
- `frontend/src/mocks/**`
- 前端页面中的导航目标与字段消费点

## 4. Drift Rules

## 4.1 Required Doc Presence Drift

如果以下文档缺失，应直接报错：

- `AGENTS.md`
- `backend/docs/platform_harness.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/slice_registry.md`
- `backend/docs/traceability_matrix.md`

## 4.2 Route Drift

检查：

- `feature_inventory.md` 记录的注册路由是否仍存在
- 前端跳转目标是否已在路由配置注册

当前已知重点风险：

- `/editor`
- `/materials`
- `/analytics`
- `/publish`

## 4.3 Mock Critical Path Drift

如果某个 Slice 被标为 `done` 或进入高 Gate，但主页面仍依赖关键 mock，应直接失败。

当前重点 mock：

- `frontend/src/mocks/articles.ts`
- `frontend/src/mocks/prompts.ts`
- `frontend/src/mocks/writerArticles.ts`

## 4.4 Slice-To-Spec Drift

检查：

- `slice_registry.md` 中列出的 endpoint 是否都存在于 `backend_spec.yaml`
- `traceability_matrix.md` 中列出的 endpoint 是否与 spec 一致

## 4.5 Page-To-Spec Drift

检查：

- 页面消费的字段是否都能在 schema 中找到
- 页面状态语义是否依赖未定义状态值

## 4.6 Entry-Point Drift

检查：

- `AGENTS.md` 中引用的 Harness 文档是否存在
- `platform_harness.md` 中的 supporting docs 是否存在

## 5. Scanner Output Contract

推荐输出格式：

```text
Issue:
Drift type:
Why it matters:
How to fix:
Affected document:
Affected slice:
Blocking level:
```

示例：

```text
Issue: Home page still depends on frontend/src/mocks/articles.ts while P0-02 is marked done.
Drift type: mock critical path drift
Why it matters: Discover Read cannot be considered closed-loop while primary homepage data remains local mock.
How to fix: switch home article list and hot topics to backend endpoints, then update feature_inventory.md and traceability_matrix.md.
Affected document: backend/docs/feature_inventory.md
Affected slice: P0-02 Discover Read
Blocking level: P0-blocking
```

## 6. Suggested Scanner Modules

建议拆成以下模块：

- `check_required_docs`
- `check_doc_links`
- `check_route_registration_drift`
- `check_dead_navigation_targets`
- `check_mock_critical_path_drift`
- `check_slice_spec_drift`
- `check_page_schema_drift`
- `check_traceability_sync`

## 7. Rollout Plan

## 7.1 Phase A

先落地低成本扫描：

- required docs
- doc links
- dead navigation targets
- OpenAPI parse

## 7.2 Phase B

再落地结构扫描：

- slice to spec drift
- traceability sync
- mock critical path drift

## 7.3 Phase C

最后落地较强语义扫描：

- page to schema drift
- state enum drift
- doc-to-code consistency heuristics

## 8. Scan Frequency

建议频率：

- pull request：Phase A + Phase B
- nightly：Phase A + B + C
- milestone close：全量扫描并生成人工复核清单

## 9. Relation To Doc Gardening

该扫描器是 `backend/docs/doc_gardening_protocol.md` 的自动执行层。
园艺协议定义“何时该修文档”，扫描器负责找到“哪里已经漂移”。

## 10. Bottom Line

文档漂移扫描的价值不在于指出“文档过期了”，而在于阻止 Agent 继续基于过期镜像工作。
如果扫描器不能指出具体问题、修复方向和受影响 Slice，它就还不够用。
