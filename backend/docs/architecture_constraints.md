# Architecture Constraints

## 1. Purpose

本文件定义“爆了么”项目的架构约束，用于限制 Agent 或人工开发在实现过程中跨层乱依赖、复制状态定义、绕开契约和堆积技术债。

目标不是追求抽象上的“优雅架构”，而是让平台在持续由 AI Agent 参与开发时仍然保持可维护。

## 2. Scope

当前仓库的约束对象包括：

- 后端文档与未来后端代码
- 前端与后端契约交界处
- 模块分层和目录依赖方向
- 枚举、状态、实体定义的单一来源

## 3. Dependency Model

本项目采用单向依赖模型：

`Types / Schemas -> Config -> Repo -> Service -> Runtime / Workers -> API -> UI Integration`

解释：

- `Types / Schemas`
  - 纯类型、Pydantic schema、枚举、DTO
- `Config`
  - 配置、环境变量、常量
- `Repo`
  - 数据访问层
- `Service`
  - 业务逻辑层
- `Runtime / Workers`
  - 异步任务、队列消费者、后台流程
- `API`
  - 路由、控制器、HTTP 协议适配
- `UI Integration`
  - 前后端契约层、前端调用映射、联调协议

约束原则：

- 下层可以被上层使用
- 下层不能反向依赖上层
- `API` 不能承载核心业务逻辑
- `Repo` 不得直接编排复杂业务流程
- `UI` 不得依赖后端内部实现细节

## 4. Allowed Dependencies

## 4.1 Backend Layer Rules

### Types / Schemas

允许依赖：

- Python 标准库
- 基础第三方类型库

禁止依赖：

- Repo
- Service
- API
- Runtime

### Config

允许依赖：

- Types / Schemas
- 标准库

禁止依赖：

- Repo
- Service
- API

### Repo

允许依赖：

- Types / Schemas
- Config
- DB session / ORM 基础设施

禁止依赖：

- API
- UI
- 运行时任务调度逻辑

### Service

允许依赖：

- Types / Schemas
- Config
- Repo

禁止依赖：

- UI
- 前端页面模型
- HTTP 框架对象直接渗透到业务逻辑

### Runtime / Workers

允许依赖：

- Types / Schemas
- Config
- Repo
- Service

禁止依赖：

- 前端代码
- UI 结构

### API

允许依赖：

- Types / Schemas
- Config
- Service
- Runtime 触发器

禁止依赖：

- 直接绕过 Service 编排复杂业务
- 在控制器内复制业务状态机

## 4.2 Frontend Contract Rules

前端只能依赖公开契约，不应依赖后端实现。

允许依赖：

- `backend/docs/backend_spec.yaml` 对应的公开接口字段
- 公开状态枚举
- 明确的错误响应语义

禁止依赖：

- 数据库字段私有命名
- 后端内部任务实现细节
- 后端未写进 spec 的临时字段

## 5. Single Source Of Truth Rules

## 5.1 Interface Truth

所有前后端接口字段，以 `backend/docs/backend_spec.yaml` 为单一事实来源。

规则：

- 新接口必须先写入 spec
- 字段变更必须先改 spec
- 状态值必须以 spec 为准

## 5.2 Entity Truth

数据实体、主键、关系、索引和生命周期，以 `backend/docs/backend_design.md` 为单一事实来源。

## 5.3 Feature Truth

页面是否已接通、是否仍为 mock、是否未注册，以 `backend/docs/feature_inventory.md` 为准。

## 5.4 Scope Truth

功能优先级与是否应开发，以 `backend/docs/prd.md` 和 `backend/docs/slice_registry.md` 为准。

## 6. Module Ownership

## 6.1 Backend Ownership Boundaries

### `discover`

负责：

- 爆款文章
- 热搜榜
- 收藏
- 基于爆款派生提示词

不得负责：

- 生文任务状态机
- 排版逻辑

### `prompts`

负责：

- 提示词分类
- 提示词模板
- 提示词状态

不得负责：

- 文章生成执行
- 页面跳转逻辑

### `writer`

负责：

- 分组
- 文章草稿
- 生文任务

不得负责：

- 排版 HTML 最终渲染
- 公众号发布

### `layout`

负责：

- Markdown 到 HTML 的渲染协议
- 排版草稿
- 样式参数持久化

不得负责：

- 文章生成
- 公众号授权

### `channels`

负责：

- 公众号授权
- 公众号列表
- 发布任务
- 发布记录

### `billing`

负责：

- 套餐
- 订单
- 订阅
- 用量

### `contact`

负责：

- 联系表单
- 留言记录

## 7. State Ownership

状态定义禁止多处复制。

统一要求：

- 提示词状态由 `prompts` 契约统一定义
- 文章状态和任务状态由 `writer` 契约统一定义
- 发布状态由 `channels` 契约统一定义
- 订阅和订单状态由 `billing` 契约统一定义

前端不得私自扩展状态值。

## 8. Lint / CI Encoding Strategy

这些约束最终应该尽量编码为可执行规则。

建议的执行器：

### 8.1 Import Boundary Rules

后端未来可做：

- `repo` 禁止 import `api`
- `service` 禁止 import `ui`
- `schema` 禁止 import `repo/service/api`

### 8.2 Contract Drift Rules

- 前端使用的接口字段必须在 spec 中存在
- 后端新增接口必须出现在 spec 中

### 8.3 Route Drift Rules

- 前端跳转到的路由如果未注册，应在检查中报出

### 8.4 Mock Drift Rules

- 关键主链路页面不得长期保留核心 mock 依赖

## 9. Error Messages As Context

约束检查报错时，不应只输出“违反规则”，而应输出：

- 违反了什么
- 为什么这个规则存在
- 正确修复方式是什么

例如：

错误示例：

```text
Architecture violation: service layer imported API router.
Why: business logic must remain HTTP-framework agnostic.
Fix: move request parsing to API layer, keep service inputs as plain schemas.
```

这种错误信息本身就是 Context Engineering 的一部分，能帮助 Agent 自我修复。

## 10. Current Project-Specific Constraints

基于当前仓库现状，新增以下特定约束：

### Constraint A

`frontend/src/pages/editor/page.tsx` 目前未注册路由，在它未纳入 `slice_registry.md` 前，不允许优先扩展其后端能力。

### Constraint B

`frontend/src/mocks/articles.ts`
`frontend/src/mocks/prompts.ts`
`frontend/src/mocks/writerArticles.ts`

对应功能属于主链路，必须优先被真实接口替代。

### Constraint C

`dashboard.ts` 对应组件当前未接入主路由，不允许在 P0 阶段优先投入真实后端支持。

### Constraint D

联系表单当前依赖外部 `readdy.ai`，若进入自有后端化，必须先在 spec 和 slice 注册表中登记。

## 11. Merge Gate Rules

任何改动如果触发以下情况，应视为不允许合并：

- 新增接口未更新 spec
- 新增实体未更新设计文档
- 前端新增字段依赖未在契约中定义
- 新功能未归属到 Slice
- 打破层级依赖

## 12. Practical Usage

每次开发前，用以下清单自查：

1. 这次改动属于哪个模块？
2. 它在哪一层？
3. 它依赖的对象是否只来自允许层？
4. 它的字段是否来自单一事实来源？
5. 它是否引入了新的重复状态定义？

如果有任一问题回答不清，不应直接编码。
