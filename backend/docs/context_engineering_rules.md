# Context Engineering Rules

## 1. Purpose

本文档定义本项目在 Harness Engineering 下的上下文工程规则。
目标不是把所有知识一次性塞给 Agent，而是让 Agent 在有限上下文里，始终先读对、再做对、最后写回对。

上下文工程在这里承担 4 个职责：

- 给 Agent 一个稳定、轻量、长期可维护的入口
- 规定不同任务需要拉取的最小上下文集合
- 防止陈旧规则、无关说明和整仓库噪音挤占任务上下文
- 把历史失败案例沉淀为可复用的入口和检索路径

## 2. Core Principles

## 2.1 Entry Point First

Agent 进入仓库时，不应直接扫描整仓库，而应先从以下入口开始：

- `AGENTS.md`
- `backend/docs/prd.md`
- `backend/docs/slice_registry.md`

这 3 份文档分别回答：

- 平台在做什么
- 当前任务属于哪个 Slice
- 当前优先级与交付边界是什么

## 2.2 Pull, Do Not Preload

默认只读取当前任务必需的上下文，不预加载大批无关文件。

规则：

- 先读入口文档，再按任务类型拉取补充文档
- 没有明确需要，不一次性读取整个 `frontend` 或 `backend` 目录
- 没有明确需要，不把历史讨论、旧方案、无效原型一并带入当前任务

## 2.3 Stable Context And Task Context Must Be Separated

上下文分为两类：

- 稳定上下文：长期成立、频繁复用、变更频率低
- 任务上下文：只与当前 Slice、当前接口、当前页面、当前缺陷相关

稳定上下文包括：

- `AGENTS.md`
- `backend/docs/platform_harness.md`
- `backend/docs/architecture_constraints.md`
- `backend/docs/agent_operating_protocol.md`

任务上下文包括：

- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- 对应 Slice 的实现代码、测试和页面

## 2.4 Document Only What Can Stay Accurate

文档不是越多越好。
只有满足以下条件的信息才应该进入入口文档：

- 高频复用
- 低歧义
- 低时效腐烂风险
- 与历史错误直接相关

如果某条规则很容易失效，应放在专门文档中，而不是塞进 `AGENTS.md`。

## 2.5 Every Added Rule Must Explain Why

新增规则时，不能只写“禁止 X”，还要写清楚：

- 为什么这条规则存在
- 违反后会造成什么工程后果
- 正确做法是什么

这样错误信息、评审意见和 CI 输出才能成为 Agent 可消费的反馈，而不只是阻断。

## 3. Minimum Context Bundles

不同任务应拉取不同的最小上下文包。

## 3.1 Product And Scope Tasks

适用任务：

- 范围判断
- 优先级讨论
- Slice 规划

必须读取：

- `AGENTS.md`
- `backend/docs/prd.md`
- `backend/docs/slice_registry.md`
- `backend/docs/platform_harness.md`

## 3.2 Frontend-Backend Alignment Tasks

适用任务：

- 梳理缺口
- 对接页面
- 替换 mock

必须读取：

- `AGENTS.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/release_gates.md`

## 3.3 API And Data Tasks

适用任务：

- 新接口
- 字段变更
- 数据表设计

必须读取：

- `AGENTS.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/architecture_constraints.md`
- `backend/docs/architecture_lint_plan.md`

## 3.4 Review And Release Tasks

适用任务：

- review
- 验收
- Gate 判定
- 质量回扫

必须读取：

- `backend/docs/platform_harness.md`
- `backend/docs/release_gates.md`
- `backend/docs/feedback_entropy_loop.md`
- `backend/docs/ci_checks.md`
- `backend/docs/doc_gardening_protocol.md`

## 4. Context Loading Order

推荐固定顺序：

1. 先定位 Slice
2. 再确认范围和优先级
3. 再确认契约和数据
4. 最后才进入代码和测试

具体顺序如下：

1. `AGENTS.md`
2. `backend/docs/slice_registry.md`
3. `backend/docs/prd.md`
4. `backend/docs/backend_spec.yaml`
5. `backend/docs/backend_design.md`
6. `backend/docs/feature_inventory.md`
7. `backend/docs/release_gates.md`
8. 实际实现代码和测试

## 5. Context Budget Rules

为了减少噪音，约定以下预算规则：

- 没有定位到 Slice 前，不进入大范围编码
- 没有确认 spec 前，不创建新接口字段
- 没有确认 feature inventory 前，不假设页面已经真实接通
- 没有验证 release gate 前，不宣称某个阶段完成

如果任务只需判断范围，不应过早加载实现细节。
如果任务只需补接口，不应过早加载不相关页面。

## 6. When To Expand Context

只有在出现以下信号时才扩大上下文：

- 找不到当前任务对应的 Slice
- spec 与页面行为不一致
- 数据实体缺失
- 页面依赖未注册路由或关键 mock
- 评审或测试指出当前判断依据不足

扩容时应逐层增加，而不是一次性“全仓扫描”。

## 7. When To Update Context Documents

出现以下情况时，应反向更新上下文文档：

- 同类错误重复出现两次以上
- Agent 因入口文档不足而选错 Slice
- Agent 因规则模糊而绕过契约
- 新增了长期有效的架构约束
- 文档与代码、spec、页面状态发生漂移

规则来源应该是失败反馈，而不是预设 1000 条想象中的说明。

## 8. Anti-Patterns

以下做法视为违反上下文工程：

- 把 `AGENTS.md` 写成大而全知识库
- 不看入口文档，直接开始改页面或接口
- 为了一次任务把整个仓库文件批量加载进上下文
- 把短期临时决策写成长期硬规则
- 文档只写结论，不写原因和修正路径

## 9. Recommended Maintenance Rhythm

建议按以下频率维护上下文工程：

- 每次任务结束：检查是否需要回写 `feature_inventory.md`、`backend_spec.yaml`、`slice_registry.md`
- 每个 Slice 完成后：检查 `AGENTS.md` 是否还足以路由同类任务
- 每个里程碑结束后：检查是否有规则已经陈旧，应拆出或删除

## 10. Bottom Line

本项目的上下文工程不是“文档越多越安全”，而是：

- 入口稳定
- 拉取按需
- 规则可解释
- 反馈可回写
- 陈旧内容可淘汰

如果 Agent 读了很多，但仍然不能快速定位 Slice、契约和风险，那么上下文工程就是失败的。
