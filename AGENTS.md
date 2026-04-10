# AGENTS.md

## 0. Harness Reference

如果任务需要继续往 Harness 执行层下钻，优先查看：

- `backend/docs/platform_harness.md`
- `backend/docs/context_engineering_rules.md`
- `backend/docs/architecture_constraints.md`
- `backend/docs/architecture_lint_plan.md`
- `backend/docs/feedback_entropy_loop.md`
- `backend/docs/doc_gardening_protocol.md`
- `backend/docs/release_gates.md`
- `backend/docs/ci_checks.md`
- `backend/docs/ci_workflow_examples.md`
- `backend/docs/agent_operating_protocol.md`
- `backend/docs/doc_drift_scanner_plan.md`
- `backend/docs/traceability_matrix.md`
- `backend/docs/harness_engines_map.md`

## 1. Repo Mission

本仓库的目标不是分别完成若干前端页面或若干后端接口，而是把“爆了么”平台按主链路开发成可运行系统：

`发现 -> 提示词 -> 生文 -> 排版 -> 发布 / 商业化`

任何 Agent 在开始工作前，都必须把任务映射到这条主链路上的某个能力切片，而不是直接进入零散编码。

## 2. Minimal Entry Point

不要一次性读取整个仓库。先从这里开始，再按任务拉取最小必要上下文。

### 2.1 Single Sources Of Truth

- 产品范围：`backend/docs/prd.md`
- 前端现状：`backend/docs/feature_inventory.md`
- 后端契约：`backend/docs/backend_spec.yaml`
- 后端结构与数据设计：`backend/docs/backend_design.md`
- 平台 Harness 总规则：`backend/docs/platform_harness.md`
- 架构边界：`backend/docs/architecture_constraints.md`
- 反馈与熵管理：`backend/docs/feedback_entropy_loop.md`
- 开发切片注册表：`backend/docs/slice_registry.md`

### 2.2 Task Routing

根据任务类型，优先加载这些文件：

- 做需求或范围判断：
  - `backend/docs/prd.md`
  - `backend/docs/slice_registry.md`
- 做前后端联调或识别缺口：
  - `backend/docs/feature_inventory.md`
  - `backend/docs/backend_spec.yaml`
- 做后端接口或模型设计：
  - `backend/docs/backend_spec.yaml`
  - `backend/docs/backend_design.md`
  - `backend/docs/architecture_constraints.md`
- 做开发流程、阶段门禁、验收：
  - `backend/docs/platform_harness.md`
  - `backend/docs/feedback_entropy_loop.md`

## 3. Working Model

本仓库采用 Harness Engineering 思路。Agent 不是自由写代码，而是在四类护栏内工作：

- Context Engineering：只加载当前任务所需上下文
- Architecture Constraints：遵守层级依赖和模块边界
- Feedback Loop：通过 spec、测试、审查和验收循环自修复
- Entropy Management：主动发现 mock、漂移、死路由、过期文档和重复逻辑

## 4. Hard Rules

### Rule 1

先定 Slice，再编码。

任何任务开始前，必须先定位到 `backend/docs/slice_registry.md` 中的一个切片；若不存在，先补切片定义。

### Rule 2

先定契约，再实现。

任何后端接口、字段、状态枚举的新增或修改，必须先更新 `backend/docs/backend_spec.yaml`。

### Rule 3

先定数据，再落库。

任何实体、关系、状态流的新增或修改，必须先更新 `backend/docs/backend_design.md`。

### Rule 4

前端 mock 不能算完成。

页面仅有本地状态、内嵌 mock、静态弹窗时，只能标记为“原型存在”，不能标记为“能力完成”。

### Rule 5

阶段优先级不能跳。

P0 主链路未闭环前，不优先开发 P1/P2 的扩展功能。

### Rule 6

改动后必须回写文档。

任何切片完成后，至少要检查是否需要同步更新：

- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/slice_registry.md`

### Rule 7

不得制造隐式约定。

任何页面依赖的字段、状态或错误语义，必须可在文档中定位，不允许只存在于代码里。

## 5. Architecture Summary

未来后端默认遵循以下分层方向：

`Types / Schemas -> Config -> Repo -> Service -> Runtime / Workers -> API`

前端不应直接依赖后端实现细节，只应依赖公开契约。

详细规则见：

- `backend/docs/architecture_constraints.md`

## 6. Definition Of Done

默认完成标准不是“文件改完”，而是以下条件同时满足：

- 范围在 PRD 内
- 切片已定义
- 契约已定义
- 数据设计已覆盖
- 代码实现已完成
- 测试或至少可验证检查已运行
- 文档已同步
- 前端不再依赖对应关键 mock

## 7. Current Priority

当前优先级按主链路推进：

### P0

- 当前用户与权限摘要
- 爆款文章与热搜查询
- 提示词分类与提示词 CRUD
- 文章分组、文章管理、生文任务
- 排版渲染、排版草稿、资源上传

### P1

- 收藏与导出
- 联系表单后端化
- 公众号授权与发布
- 套餐、订单、订阅、用量控制

### P2

- 教程 CMS 化
- 分析大盘
- `editor/page.tsx` 的保留/合并/下线决策

## 8. Required Checks Before Declaring Completion

至少回答清楚以下问题：

1. 这个任务属于哪个 Slice？
2. 这个 Slice 的接口是否已在 spec 中？
3. 这个 Slice 的实体是否已在设计文档中？
4. 页面或调用方是否已经脱离关键 mock？
5. 是否覆盖了成功、空态、错误、异常路径？
6. 是否更新了功能盘点和切片状态？

## 9. Forbidden Behavior

- 不先读文档就直接大范围改动
- 不更新 spec 就新增接口
- 不更新数据设计就新增实体
- 把未注册页面、死路由或静态原型误记为已交付能力
- 复制粘贴前后端枚举导致双份真相
- 绕开主链路，优先做边缘功能

## 10. If You Are Unsure

优先做这三件事：

1. 查看 `backend/docs/slice_registry.md`，确认当前任务的切片归属
2. 查看 `backend/docs/backend_spec.yaml`，确认契约边界
3. 查看 `backend/docs/feature_inventory.md`，确认当前前端真实状态

如果仍然不确定，先补文档定义，再开始实现。
