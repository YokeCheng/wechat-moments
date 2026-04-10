# CI Checks

## 0. Required Harness Docs

CI 在本项目里应把以下文档视为最小 Harness 基础设施：

- `AGENTS.md`
- `backend/docs/prd.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/platform_harness.md`
- `backend/docs/context_engineering_rules.md`
- `backend/docs/architecture_constraints.md`
- `backend/docs/architecture_lint_plan.md`
- `backend/docs/feedback_entropy_loop.md`
- `backend/docs/doc_gardening_protocol.md`
- `backend/docs/slice_registry.md`
- `backend/docs/release_gates.md`
- `backend/docs/agent_operating_protocol.md`
- `backend/docs/ci_workflow_examples.md`
- `backend/docs/doc_drift_scanner_plan.md`
- `backend/docs/traceability_matrix.md`
- `backend/docs/harness_engines_map.md`

## 1. Purpose

本文件将 Harness Engineering 映射为可自动执行的 CI 检查项。

目标：

- 把“规则”变成“门禁”
- 让 AI 和人工提交都经过同一套检查
- 让错误输出本身成为 Agent 的反馈输入

当前仓库尚未完全具备这些自动化能力，本文件定义的是目标检查矩阵与落地顺序。

当前已落地的首批自动化能力位于 `tools/harness/`，包括：

- required docs check
- OpenAPI parse check
- doc anchor check
- slice endpoint coverage check
- dead route check
- mock critical path check

## 2. CI Check Categories

本项目建议 CI 分为 6 类检查：

- `context checks`
- `spec checks`
- `architecture checks`
- `test checks`
- `flow checks`
- `entropy checks`

## 3. Context Checks

## 3.1 Documentation Presence Check

检查目标：

- `AGENTS.md` 必须存在
- `backend/docs/prd.md` 必须存在
- `backend/docs/backend_spec.yaml` 必须存在
- `backend/docs/backend_design.md` 必须存在
- `backend/docs/feature_inventory.md` 必须存在
- `backend/docs/platform_harness.md` 必须存在
- `backend/docs/architecture_constraints.md` 必须存在
- `backend/docs/feedback_entropy_loop.md` 必须存在
- `backend/docs/slice_registry.md` 必须存在

失败输出建议：

```text
Missing harness document: backend/docs/slice_registry.md
Why: every task must map to a registered slice.
Fix: add or restore the missing harness document.
```

## 3.2 Slice Registration Check

目标：

- 任何新增平台功能，如果涉及新模块或新主路径，应能在 `slice_registry.md` 中定位

当前阶段可先人工执行，后续再自动化。

## 4. Spec Checks

## 4.1 OpenAPI Parse Check

目标：

- `backend/docs/backend_spec.yaml` 必须可解析

当前状态：

- 已验证可被 YAML 解析

## 4.2 Endpoint Contract Drift Check

目标：

- 后端实现的接口必须与 spec 一致
- 前端使用的字段不应超出 spec

检查项：

- 路径
- HTTP 方法
- 请求参数
- 响应字段
- 状态枚举

## 4.3 Required Slice Endpoint Coverage Check

目标：

- `slice_registry.md` 中标记为 `in_progress` 或 `done` 的 Slice，其接口必须都能在 spec 中找到

## 5. Architecture Checks

## 5.1 Layer Dependency Check

目标：

- 强制执行 `Types / Schemas -> Config -> Repo -> Service -> Runtime / Workers -> API`

建议规则：

- `repo` 禁止 import `api`
- `service` 禁止 import UI 层
- `schema` 禁止 import `repo/service/api`

当前阶段：

- 先作为规则文档执行
- 后续在后端代码生成后落地为 import linter

## 5.2 Single Source Of Truth Check

目标：

- 不允许在多个位置复制定义同一组状态值

重点对象：

- 提示词状态
- 文章状态
- 任务状态
- 订单状态
- 发布状态

## 6. Test Checks

## 6.1 Contract Test Check

目标：

- 关键接口至少有一条契约测试

适用范围：

- `discover`
- `prompts`
- `writer`
- `layout`

## 6.2 Integration Test Check

目标：

- 涉及状态流转或持久化的 Slice 至少有一条集成测试

重点：

- 提示词 CRUD
- 文章 CRUD
- 生文任务状态流
- 排版草稿保存

## 6.3 Invalid Test Detection Check

目标：

- 拦截弱测试或伪通过测试

判定信号：

- 只测成功态
- 没有错误断言
- 没有验证状态变化
- 页面仍依赖 mock，测试却标记通过

## 7. Flow Checks

## 7.1 P0 Flow Smoke Check

必须覆盖：

- 首页真实加载
- 提示词库真实加载
- 生文任务创建
- 排版稿保存

## 7.2 Query Handoff Check

目标：

- 上游页面参数是否能正确传递到下游页面

当前项目重点：

- `discover -> writer`
- `writer -> layout`

## 8. Entropy Checks

## 8.1 Dead Route Check

目标：

- 扫描前端跳转目标是否已注册

当前项目已知风险：

- `/editor`
- `/materials`
- `/analytics`
- `/publish`

## 8.2 Mock Critical Path Check

目标：

- 检查主链路页面是否仍依赖关键 mock

当前重点：

- `frontend/src/mocks/articles.ts`
- `frontend/src/mocks/prompts.ts`
- `frontend/src/mocks/writerArticles.ts`

如果对应 Slice 已标记 `done`，但页面仍依赖这些 mock，应直接失败。

## 8.3 Doc Drift Check

目标：

- 如果 spec、slice、feature inventory 没有更新，阻止把功能标记为完成

## 8.4 Encoding Hygiene Check

目标：

- 尽量减少新产生的编码异常文件

当前阶段可先采用人工治理策略，后续再加检测。

## 9. CI Pipeline Proposal

推荐流水线顺序：

### Stage 1: Doc Integrity

- 文档存在性检查
- OpenAPI 解析检查

### Stage 2: Contract Integrity

- spec 漂移检查
- Slice 与 spec 覆盖关系检查

### Stage 3: Architecture Integrity

- 分层依赖检查
- 单一事实来源检查

### Stage 4: Test Execution

- 契约测试
- 集成测试

### Stage 5: Flow And Entropy

- 主链路 smoke test
- 死路由检查
- 关键 mock 检查

## 10. Failure Message Format

CI 输出必须可供 Agent 自修复，建议统一格式：

```text
Check:
Issue:
Why it matters:
How to fix:
Blocking level:
Affected slice:
```

示例：

```text
Check: Mock Critical Path Check
Issue: Writer page still depends on frontend/src/mocks/writerArticles.ts
Why it matters: P0-04 cannot be considered complete while core data still comes from local mock.
How to fix: switch /writer article list to backend endpoint and update feature_inventory.md.
Blocking level: P0-blocking
Affected slice: P0-04 Writer Workspace
```

## 11. Recommended Rollout Order

不要一次性把所有 CI 检查都上满，建议分 3 步：

### Phase A

- OpenAPI parse check
- 文档存在性检查
- 死路由检查

### Phase B

- spec 漂移检查
- mock 关键路径检查
- Slice 与 spec 覆盖检查

### Phase C

- 分层依赖检查
- 契约测试
- 集成测试
- 主链路 smoke test

## 12. Bottom Line

CI 在这个项目里的作用不是“跑一下格式化”，而是成为 Harness Engine 的执行层。

它应该能阻止：

- 无规格开发
- 契约漂移
- 架构越层
- 主链路 mock 假完成
- 文档长期漂移
