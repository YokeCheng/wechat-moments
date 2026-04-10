# Harness Engines Map

## 1. Purpose

本文档把本项目的 Harness Engineering 拆成一组可协同运行的“引擎”。
这样可以把抽象方法论落到具体工程动作上，方便人和 Agent 在开发平台时按同一套路执行。

## 2. Engine Overview

本项目建议将 Harness 拆为 5 个引擎：

- `Context Engine`
- `Constraint Engine`
- `Feedback Engine`
- `Entropy Engine`
- `Gate Engine`

它们不是独立工具，而是一套串联的工程执行层。

## 3. Engine Definitions

## 3.1 Context Engine

职责：

- 让 Agent 先读对上下文
- 把任务正确路由到 Slice
- 控制上下文体积，避免无关信息挤占任务空间

主要输入：

- `AGENTS.md`
- `backend/docs/context_engineering_rules.md`
- `backend/docs/prd.md`
- `backend/docs/slice_registry.md`

主要输出：

- 当前任务所属 Slice
- 最小上下文包
- 是否属于当前优先级范围

失败信号：

- Agent 选错 Slice
- 在未确认范围时直接开改
- 因没读 spec 或 inventory 造成错误判断

## 3.2 Constraint Engine

职责：

- 强制契约、数据设计和架构边界
- 避免人和 Agent 各自创造“隐式真相”

主要输入：

- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/architecture_constraints.md`
- `backend/docs/architecture_lint_plan.md`

主要输出：

- 合法接口定义
- 合法实体定义
- 合法分层依赖

失败信号：

- 先写实现、后补 spec
- 重复状态定义
- 越层依赖
- 页面依赖 undocumented 字段

## 3.3 Feedback Engine

职责：

- 把 review、测试、CI 和自检结果循环回任务
- 让错误成为可修正输入，而不是一次性结论

主要输入：

- `backend/docs/feedback_entropy_loop.md`
- `backend/docs/ci_checks.md`
- `backend/docs/agent_operating_protocol.md`

主要输出：

- Issue 列表
- Blocking level
- 修复方向

失败信号：

- 测试通过但能力仍依赖 mock
- review 只说“有问题”，不说明修复路径
- CI 报错无法指导 Agent 自修

## 3.4 Entropy Engine

职责：

- 持续清理主链路 mock、死路由、漂移文档和重复状态
- 把技术债拆成持续小额偿还，而不是集中爆炸

主要输入：

- `backend/docs/feedback_entropy_loop.md`
- `backend/docs/doc_gardening_protocol.md`
- `backend/docs/feature_inventory.md`

主要输出：

- 待退休 mock 清单
- 待治理死路由清单
- 文档漂移修复动作

失败信号：

- P0 Slice 已标记完成，但主页面仍靠 mock
- 文档长期落后于实现
- 未注册页面长期存在却无人处理

## 3.5 Gate Engine

职责：

- 决定某个 Slice 或阶段是否允许进入下一步
- 把“完成”定义成可验证门禁，而不是主观印象

主要输入：

- `backend/docs/release_gates.md`
- `backend/docs/platform_harness.md`
- `backend/docs/ci_checks.md`

主要输出：

- 当前 Gate 状态
- 是否允许进入下一个阶段
- 是否属于阻断项

失败信号：

- 未过 `G0` 就开工
- 未过 `G1` 就宣布后端可联调
- 未过 `G2` 就宣布页面完成
- 未过 `G3/G4` 就宣布阶段闭环

## 4. How Engines Work Together

推荐顺序：

1. `Context Engine` 先判断任务归属和最小上下文
2. `Constraint Engine` 再确认契约、实体和层级边界
3. `Feedback Engine` 在开发中持续回传偏差
4. `Entropy Engine` 把漂移和债务收口
5. `Gate Engine` 最后决定能否进入下一阶段

这 5 个引擎串起来后，才能形成完整 Harness。

## 5. Engine-To-Document Mapping

| Engine | Primary docs | Primary outcome |
| --- | --- | --- |
| Context Engine | `AGENTS.md`, `context_engineering_rules.md`, `slice_registry.md` | 读对任务 |
| Constraint Engine | `backend_spec.yaml`, `backend_design.md`, `architecture_constraints.md`, `architecture_lint_plan.md` | 写对边界 |
| Feedback Engine | `feedback_entropy_loop.md`, `ci_checks.md`, `agent_operating_protocol.md` | 错了能回改 |
| Entropy Engine | `doc_gardening_protocol.md`, `feature_inventory.md`, `feedback_entropy_loop.md` | 仓库不失控 |
| Gate Engine | `release_gates.md`, `platform_harness.md`, `ci_checks.md` | 完成可判定 |

## 6. Application In This Platform

针对当前“内容生产平台”开发，建议这样应用：

- 所有任务先通过 `Context Engine` 归入 P0/P1/P2 Slice
- 所有后端接口和表设计先通过 `Constraint Engine`
- 所有 review 和 CI 反馈都按 `Feedback Engine` 模板输出
- 所有 mock、死路由、文档漂移都进入 `Entropy Engine`
- 所有里程碑宣称完成前，必须走 `Gate Engine`

## 7. Immediate Practical Use

在当前仓库里，5 个引擎的最直接落点是：

- `P0-02 Discover Read`
- `P0-03 Prompt Library CRUD`
- `P0-04 Writer Workspace`
- `P0-05 Generate Task`
- `P0-06 Layout Workspace`
- `P0-07 Asset Upload`

也就是先把主链路从原型和 mock 状态拉成真实可运行系统。

## 8. Bottom Line

Harness Engineering 在本项目里，不是一个抽象理念，而是 5 个引擎协同工作：

- 让 Agent 读对
- 让实现不越界
- 让错误可回环
- 让仓库持续减熵
- 让“完成”有门禁

如果这 5 个引擎缺一个，平台开发都会重新滑回“局部功能堆叠”的老路。
