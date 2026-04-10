# Platform Development Harness

## 0. Supporting Docs

本文件负责总规则，其它执行层文档分工如下：

- `backend/docs/context_engineering_rules.md`
  - 规定最小上下文加载与入口设计
- `backend/docs/architecture_constraints.md`
  - 规定分层边界
- `backend/docs/architecture_lint_plan.md`
  - 规定如何把架构边界变成 lint 和 CI
- `backend/docs/feedback_entropy_loop.md`
  - 规定反馈回环与减熵机制
- `backend/docs/doc_gardening_protocol.md`
  - 规定文档园艺与漂移治理
- `backend/docs/release_gates.md`
  - 规定 G0 到 G4 的阶段门禁
- `backend/docs/ci_checks.md`
  - 规定 Harness 在 CI 中的执行映射
- `backend/docs/ci_workflow_examples.md`
  - 提供 CI workflow 的落地样例
- `backend/docs/agent_operating_protocol.md`
  - 规定 Agent 的标准操作流程
- `backend/docs/doc_drift_scanner_plan.md`
  - 规定文档漂移扫描的自动化计划
- `backend/docs/traceability_matrix.md`
  - 规定 Slice 到页面、接口、实体、测试和 Gate 的追踪关系
- `backend/docs/harness_engines_map.md`
  - 规定五类 Harness Engine 如何协同

首批示范执行包：

- `backend/docs/p0_01_auth_execution_pack.md`
  - 作为用户上下文与身份基础 Slice 的落地样板
- `backend/docs/p0_02_discover_execution_pack.md`
  - 作为第一条 P0 Slice 的落地样板

## 1. Purpose

本文件定义“爆了么”平台的开发 Harness，用于约束整个平台按统一标准推进，而不是按页面零散堆代码。

这里的 Harness 不是单一测试工具，而是一套开发约束系统，目标是让以下事情同时成立：

- 需求范围稳定，不在实现过程中持续漂移
- 前后端接口有单一契约来源
- 数据模型和状态流是可追踪的
- 每个功能开发都有明确完成定义
- 平台按主链路分阶段交付，而不是按零碎页面交付
- AI 或人工开发都必须落在同一套约束下

当前项目的已有基础文档：

- PRD：`backend/docs/prd.md`
- 后端设计：`backend/docs/backend_design.md`
- API 草稿：`backend/docs/backend_spec.yaml`
- 前端功能盘点：`backend/docs/feature_inventory.md`

Harness 的作用，是把这些文档从“静态资料”升级为“开发门禁”。

## 2. Harness 目标

### 2.1 业务目标

- 按照主链路把平台完整开发出来：`发现 -> 提示词 -> 生文 -> 排版 -> 发布/商业化`
- 确保每个阶段交付的是可运行能力，而不是孤立页面

### 2.2 工程目标

- 限制无规格编码
- 限制接口和页面状态不一致
- 限制数据模型与业务状态漂移
- 限制“看起来做了，实际不可联调”的伪完成

### 2.3 协作目标

- 让任何开发者或 AI agent 在接任务时都知道：
  - 该改哪些文档
  - 该实现哪些接口
  - 该覆盖哪些测试
  - 什么算完成

## 3. Core Principles

### 3.1 Spec Before Code

任何新功能不得直接进入编码，必须先落在以下至少一个约束对象里：

- PRD 范围
- `backend_spec.yaml` 接口契约
- 数据模型设计
- Slice 级验收标准

### 3.2 Vertical Slice First

开发单位不是“页面”或“接口”，而是可交付的纵向能力切片。

示例：

- 正确切片：爆款文章列表查询
- 正确切片：提示词分类管理
- 正确切片：AI 生文任务与文章草稿
- 错误切法：只改一个按钮颜色
- 错误切法：只做一个表，不接页面

### 3.3 Contract Is Authoritative

凡是前后端联调能力，以 `backend/docs/backend_spec.yaml` 为接口单一事实来源。

具体约束：

- 新接口先补到 spec
- 变更请求/响应字段必须先改 spec
- 删除字段必须先更新 spec 和使用方
- 页面不允许依赖 spec 未定义字段

### 3.4 Flow Over Screens

平台不是一组静态页面，而是主链路系统。

每个阶段的完成标准必须至少覆盖一个完整业务流，而不是单页完成。

### 3.5 Done Means Operable

“已完成”必须满足：

- 有规格
- 有实现
- 有测试
- 有异常路径
- 有可验证结果

## 4. Harness Layers

Harness 分 6 层，从上到下逐级收紧。

## 4.1 Product Harness

定义做什么、不做什么。

约束来源：

- `backend/docs/prd.md`

强制规则：

- 功能必须落在 PRD 的 P0/P1/P2 范围内
- P0 未闭环前，不允许优先开发 P2 功能
- 任何新增模块必须先明确其所属优先级

## 4.2 Feature Harness

定义前端当前有哪些功能、哪些只是原型、哪些未接通。

约束来源：

- `backend/docs/feature_inventory.md`

强制规则：

- 开发前先确认功能是否已存在前端原型
- 如果页面有 UI 但未接入后端，优先补齐接口而不是重做页面
- 未注册路由或未接入组件必须标记状态，不能默认算在“已完成”

## 4.3 Contract Harness

定义前后端如何说同一种语言。

约束来源：

- `backend/docs/backend_spec.yaml`

强制规则：

- 每个后端接口必须存在于 spec
- 每个前端页面使用的接口必须能在 spec 中定位
- 请求参数、响应字段、状态值必须以 spec 为准
- 异步任务必须有明确状态枚举

## 4.4 Data Harness

定义业务实体、关系和不可破坏的约束。

约束来源：

- `backend/docs/backend_design.md`

强制规则：

- 新实体必须有主键、外键、索引、状态字段定义
- 用户私有数据默认带 `user_id`
- 列表查询实体必须提前定义分页和排序策略
- 删除行为必须明确是软删、硬删还是转移归属

Runtime database rule:

- Runtime databases for `local`, `lan`, `staging`, and `prod` must use PostgreSQL.
- SQLite is test-only and must not be used as the runtime database for app execution.

## 4.5 Test Harness

定义开发完成时必须有哪些测试。

强制规则：

- 新接口至少要有契约测试
- 有状态流的功能至少要有状态迁移测试
- 有主链路的功能至少要有一条集成用例
- 关键路径必须有端到端验收场景

## 4.6 Release Harness

定义什么时候允许进入下一阶段。

强制规则：

- 未达到阶段门禁，不得宣称该阶段完成
- 每个里程碑必须有一份“通过清单”

## 5. Development Unit: Slice

Harness 下的最小开发单位是 `Slice`。

每个 Slice 必须是“能给用户带来可感知价值的一条纵向能力”。

每个 Slice 必须具备以下字段：

- `slice_id`
- `name`
- `priority`
- `user_value`
- `frontend_routes`
- `backend_endpoints`
- `data_entities`
- `states`
- `dependencies`
- `acceptance_criteria`
- `test_requirements`

### 5.1 Slice Template

```yaml
slice_id: P0-03
name: Prompt Library CRUD
priority: P0
user_value: 用户可以创建、查看、编辑、删除提示词及其分类
frontend_routes:
  - /prompts
backend_endpoints:
  - GET /api/v1/prompt-categories
  - POST /api/v1/prompt-categories
  - PATCH /api/v1/prompt-categories/{categoryId}
  - DELETE /api/v1/prompt-categories/{categoryId}
  - GET /api/v1/prompts
  - POST /api/v1/prompts
  - GET /api/v1/prompts/{promptId}
  - PATCH /api/v1/prompts/{promptId}
  - DELETE /api/v1/prompts/{promptId}
data_entities:
  - prompt_categories
  - prompts
states:
  - draft
  - active
  - generating
dependencies:
  - P0-01 Auth & Current User
acceptance_criteria:
  - 分类可新增、编辑、删除
  - 提示词可分页查询、按分类筛选、搜索
  - 提示词状态可启停
test_requirements:
  - API contract test
  - CRUD integration test
  - Prompt status transition test
```

## 6. Platform Slice Map

下面是建议的整个平台切片图，按优先级推进。

## 6.1 P0 Slices

### P0-01 Auth & Current User

- 目标：为所有用户私有数据提供身份上下文
- 核心接口：
  - `GET /api/v1/me`
- 核心产物：
  - 用户信息
  - 当前套餐
  - 当前用量摘要

### P0-02 Discover Read

- 目标：让首页真实展示爆款文章与热搜榜
- 核心接口：
  - `GET /api/v1/discover/articles`
  - `GET /api/v1/discover/hot-topics`

### P0-03 Prompt Library CRUD

- 目标：让提示词库从 mock 变为真实数据
- 核心接口：
  - 分类 CRUD
  - 提示词 CRUD

### P0-04 Writer Workspace

- 目标：让智能生文页具备真实分组和文章列表管理
- 核心接口：
  - 文章分组 CRUD
  - 文章列表/详情/更新/删除

### P0-05 Generate Task

- 目标：让“开始生成”不再是本地 `setTimeout`
- 核心接口：
  - `POST /api/v1/writer/generate-tasks`
  - `GET /api/v1/writer/generate-tasks/{taskId}`

### P0-06 Layout Workspace

- 目标：让一键排版具备真实保存与恢复能力
- 核心接口：
  - `POST /api/v1/layout/render`
  - `GET/POST/PATCH/DELETE /api/v1/layout/drafts`

### P0-07 Asset Upload

- 目标：让封面和图片不再只保存在浏览器内存里
- 核心接口：
  - `POST /api/v1/assets`

## 6.2 P1 Slices

### P1-01 Discover Favorite & Export

- 收藏爆款文章
- 导出文章列表

### P1-02 Contact Internalization

- 把联系表单从外部 `readdy.ai` 迁回自有后端

### P1-03 Channel Authorization

- 公众号列表
- 发起授权
- 授权回调

### P1-04 Publish Workflow

- 发起发布
- 发布记录查询

### P1-05 Billing & Subscription

- 套餐
- 订单
- 订阅
- 用量限制

## 6.3 P2 Slices

### P2-01 Tutorial CMS

- 把教程从前端静态内容迁为后台管理内容

### P2-02 Editor Consolidation

- 决定 `editor/page.tsx` 保留、合并还是下线

### P2-03 Analytics Dashboard

- 把 `dashboard.ts` 对应能力转为真实模块

## 7. Definition of Done

Harness 的关键是 DoD 不是“代码写完”，而是“能力闭环”。

## 7.1 Endpoint DoD

任何后端接口完成，必须同时满足：

- 已定义于 `backend_spec.yaml`
- 有请求模型和响应模型
- 有鉴权规则
- 有错误码与错误场景
- 有至少一条契约测试
- 有至少一条成功路径集成测试

## 7.2 Page Integration DoD

任何页面能力接入后端，必须同时满足：

- 页面不再依赖对应 mock 数据
- 具备 `loading / empty / error / success` 四类状态
- 页面字段与接口字段一致
- 页面操作能回写真实数据
- 至少一条页面级验收场景可走通

## 7.3 Entity DoD

任何数据实体落地，必须同时满足：

- 已在数据设计文档中定义
- 有表结构 / 模型定义
- 有主键
- 有索引策略
- 有时间字段
- 有状态字段或明确说明为何不需要
- 有生命周期说明

## 7.4 Async Task DoD

任何异步任务能力必须满足：

- 有任务 ID
- 有状态枚举
- 有错误信息
- 可轮询查询
- 可追踪到业务实体

适用对象：

- 生文任务
- 发布任务
- 后续导出任务

## 7.5 Milestone DoD

任何阶段完成都必须满足：

- 该阶段所有 P 级 Slice 至少有一条主路径跑通
- 不再依赖对应核心 mock
- 文档已同步
- 至少一条端到端验收场景通过

## 8. Required Test Matrix

## 8.1 测试层级

### Contract Test

验证接口是否符合 `backend_spec.yaml`。

必须覆盖：

- 路径存在
- 方法正确
- 必填字段正确
- 响应字段与类型正确

### Service / Integration Test

验证业务逻辑和数据库行为。

必须覆盖：

- CRUD
- 状态流转
- 分页和过滤
- 权限隔离

### E2E Acceptance Test

验证关键业务链路。

P0 必须至少覆盖：

1. 爆款列表加载
2. 提示词 CRUD
3. 创建生文任务并查询完成状态
4. 文章进入排版页并保存排版稿

## 8.2 页面状态矩阵

所有接入后端的页面，必须显式覆盖以下状态：

| State | 必须存在 |
| --- | --- |
| loading | 是 |
| empty | 是 |
| error | 是 |
| success | 是 |
| retry | 对异步或列表页建议必须有 |

## 9. Hard Rules

以下规则是 Harness 的硬约束。

### Rule 1

不得在 spec 之外新增前后端字段。

### Rule 2

不得把前端 mock 当作“已完成能力”。

### Rule 3

不得只做页面，不做数据回写。

### Rule 4

不得只做接口，不验证页面状态。

### Rule 5

不得跳过异常路径。

至少要覆盖：

- 无数据
- 参数错误
- 鉴权失败
- 后端失败

### Rule 6

不得先做 P1/P2，再把 P0 主链路留空。

### Rule 7

任何路径或页面如果未注册，必须在功能盘点中标识，不允许默认为计划内交付。

## 10. Stage Gates

## 10.1 Gate G0: Spec Ready

进入开发前必须满足：

- PRD 中有对应范围
- 功能盘点中能定位页面或缺口
- 接口写入 `backend_spec.yaml`
- 数据实体已定义

## 10.2 Gate G1: Backend Ready

进入前端联调前必须满足：

- 接口实现完成
- 契约测试通过
- 集成测试通过
- 关键错误场景已验证

## 10.3 Gate G2: Frontend Ready

宣称功能完成前必须满足：

- 页面已接真实接口
- 页面状态完整
- mock 已移除或只保留 fixture 用途

## 10.4 Gate G3: Flow Ready

进入阶段验收前必须满足：

- 至少一条端到端流程跑通
- 输入输出可追踪
- 数据库里能查到过程数据

## 10.5 Gate G4: Release Ready

允许进入下一里程碑前必须满足：

- 当前阶段 P 级 Slice 全部通过
- 无阻塞缺陷
- 文档已同步

## 11. Traceability Requirement

每个 Slice 必须能追踪到 5 类对象：

- 页面
- 接口
- 数据表
- 状态流
- 测试

推荐追踪矩阵：

| Slice | Route | Endpoint | Entity | Test | Status |
| --- | --- | --- | --- | --- | --- |
| P0-02 | `/` | `GET /discover/articles` | `discover_articles` | contract + integration + e2e | planned |

## 12. Recommended Execution Workflow

每次开发应严格按下面流程：

1. 选定一个 Slice
2. 更新或确认 PRD 范围
3. 更新 `backend_spec.yaml`
4. 更新数据设计
5. 实现后端
6. 写契约与集成测试
7. 接入前端并移除对应 mock
8. 补页面状态
9. 跑通 E2E 场景
10. 更新功能盘点状态

## 13. How To Use This Harness In This Project

针对当前项目，建议立即执行以下策略：

### 第一阶段

只允许开发 P0-01 到 P0-07，对应：

- 当前用户
- 爆款查询
- 提示词库
- 智能生文
- 排版草稿
- 资源上传

### 第二阶段

当前 P0 未闭环前，禁止优先开发：

- 新的营销页面
- 新的仪表盘组件
- `editor/page.tsx` 的并行扩张
- 公众号发布扩展能力
- 支付细节优化

### 第三阶段

每完成一个 Slice，都要回写两个地方：

- `backend_spec.yaml`
- `feature_inventory.md`

否则该 Slice 不能算完成。

## 14. Immediate Next Step

如果要把 Harness 真正落地，而不是停留在文档层，下一步建议是：

1. 以 `P0-02 Discover Read` 为第一条正式 Slice
2. 为它建立追踪矩阵
3. 用 `backend_spec.yaml` 中对应接口作为第一批实现目标
4. 规定“首页接入真实接口并移除 `articles.ts` 依赖”作为验收门禁

这样平台开发会从第一天开始被 Harness 约束，而不是等做乱了再回头收拾。
