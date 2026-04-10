# Architecture Lint Plan

## 1. Purpose

本文档把架构约束从“文字说明”进一步推进到“可检查、可失败、可修复”的 lint 计划。
目标是让本项目未来无论由人还是 AI Agent 开发，都不能轻易绕过分层边界。

## 2. Canonical Layer Model

本项目后端默认遵循以下依赖方向：

`Types / Schemas -> Config -> Repo -> Service -> Runtime / Workers -> API`

规则：

- 低层不能反向依赖高层
- 业务规则应停留在 `service`
- 数据访问应停留在 `repo`
- 运行时编排、异步任务和外部执行器应停留在 `runtime / workers`
- `api` 只负责输入输出、鉴权入口和调用编排

详细边界定义见：

- `backend/docs/architecture_constraints.md`

## 3. Lint Goals

Lint 体系需要防止 4 类问题：

- 越层 import
- 重复定义同一组状态或字段语义
- 把临时实现直接固化为跨层耦合
- API、Service、Repo 职责混杂

## 4. Rule Set

## 4.1 Layer Dependency Rules

建议强制以下依赖规则：

- `types` 或 `schemas` 不得 import `repo`、`service`、`runtime`、`api`
- `config` 不得 import `repo`、`service`、`runtime`、`api`
- `repo` 不得 import `service`、`runtime`、`api`
- `service` 不得 import `api`
- `runtime` 或 `workers` 不得 import `api`
- `api` 可以依赖 `service`、`schemas`、`config`

## 4.2 Business Logic Placement Rules

建议强制：

- `repo` 中不写业务状态流转规则
- `api` 中不写核心业务决策
- `service` 中不直接拼装 HTTP 响应对象
- `runtime` 中不绕过 `service` 直写前端约定字段

## 4.3 Single Source Of Truth Rules

以下对象应只存在一个权威定义来源：

- 提示词状态
- 文章状态
- 生成任务状态
- 发布任务状态
- 订单状态

建议来源优先级：

- 接口字段语义以 `backend/docs/backend_spec.yaml` 为准
- 实体结构以 `backend/docs/backend_design.md` 为准
- 架构层次以 `backend/docs/architecture_constraints.md` 为准

## 4.4 Naming And Directory Rules

未来后端代码落地时，建议保持以下目录语义：

- `backend/app/api`
- `backend/app/schemas`
- `backend/app/config`
- `backend/app/repo`
- `backend/app/service`
- `backend/app/runtime`

同名概念不应跨目录重复定义多个版本，例如：

- `PromptStatus`
- `ArticleStatus`
- `GenerateTaskStatus`

## 5. Lint Error Message Design

Lint 输出本身也是上下文工程的一部分。
错误信息不应只写“违反规则”，还应包含：

- 规则名称
- 为什么违规
- 正确依赖方向
- 推荐修复路径
- 影响的 Slice 或能力范围

推荐格式：

```text
Rule: ServiceMustNotImportApi
Issue: backend/app/service/prompt_service.py imports backend/app/api/prompt_router.py
Why it matters: service is a lower layer and must stay reusable and transport-agnostic.
Correct direction: api -> service, not service -> api.
How to fix: move shared DTOs to schemas or move orchestration back into api.
Blocking level: P0-blocking
```

## 6. Rollout Plan

## 6.1 Phase A: Documented Constraints

当前阶段先完成文档化约束：

- 形成统一层级模型
- 形成统一错误解释模板
- 在 review 中按该规则人工执行

## 6.2 Phase B: Scripted Static Checks

后续后端代码出现后，可先用轻量脚本做静态扫描：

- 扫描跨层 import
- 扫描重复状态定义
- 扫描不符合目录约定的模块

这一阶段可先接受少量人工维护的规则白名单。

## 6.3 Phase C: CI-Blocking Architecture Lint

代码稳定后，再将以下检查升级为 CI 阻断项：

- 越层 import
- forbidden dependency edges
- 单一状态源漂移
- 核心目录结构漂移

## 7. Review Checklist

每次涉及后端结构变更时，至少检查：

- 新模块属于哪一层
- 依赖方向是否单向
- 状态枚举是否已有权威定义
- 是否把业务判断错放进 `api` 或 `repo`
- 是否引入了跨层共享但无归属的工具模块

## 8. Common Violations In This Project

针对当前平台，未来最容易出现的架构违规包括：

- 为了赶进度，把页面字段映射逻辑写死在 `service`
- 为了省事，把数据库结果对象直接作为 API 响应返回
- 在生成任务、排版草稿、发布任务中各自复制一套状态值
- 在 `runtime / workers` 中直接依赖 `api` 层 DTO

## 9. Relation To CI

本计划对应 `backend/docs/ci_checks.md` 中的：

- `architecture checks`
- `single source of truth check`

文档先定义规则，CI 再把规则变成门禁。

## 10. Bottom Line

架构 lint 的本质不是追求“目录整齐”，而是防止：

- 业务逻辑失控扩散
- 后端实现与前端契约互相污染
- Agent 为了局部任务方便而破坏长期可维护性

如果规则不能被 review 复用、不能被 CI 编码、不能解释修复路径，那它就还不是合格的 Harness 约束。
