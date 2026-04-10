# Agent Operating Protocol

## 1. Purpose

本文件规定 AI Agent 在本项目中的标准操作协议。

目标不是限制产出速度，而是保证 Agent 在开发整个平台时：

- 不乱改
- 不跳步
- 不绕开契约
- 不把原型误当成完成

本协议适用于：

- AI Agent 执行开发任务
- AI Agent 执行审查任务
- 人工按 Harness 方式组织任务

## 2. Operating Assumptions

Agent 在本仓库中的基本假设：

- 任何任务都必须映射到 Slice
- 任何接口都必须先存在于 spec
- 任何实体都必须先存在于设计文档
- 任何页面的“完成”必须脱离关键 mock

## 3. Standard Operating Sequence

每个任务都必须按以下顺序执行。

## 3.1 Step 1: Identify Slice

先判断当前任务属于哪个 Slice。

操作：

- 读取 `backend/docs/slice_registry.md`
- 找到对应 Slice
- 若找不到，先补 Slice 再继续

禁止：

- 不经 Slice 归属直接编码

## 3.2 Step 2: Read Minimum Context

按任务类型加载最小上下文。

### 做需求 / 范围判断

- `AGENTS.md`
- `backend/docs/prd.md`
- `backend/docs/slice_registry.md`

### 做前后端联调

- `AGENTS.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/backend_spec.yaml`

### 做后端接口 / 数据设计

- `AGENTS.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/architecture_constraints.md`

### 做验收 / 门禁

- `backend/docs/platform_harness.md`
- `backend/docs/release_gates.md`
- `backend/docs/feedback_entropy_loop.md`

## 3.3 Step 3: Confirm Scope

确认当前任务是否在 `PRD` 定义的优先级内。

操作：

- 看是否属于 P0/P1/P2
- 若 P0 未闭环，避免优先扩展 P1/P2

## 3.4 Step 4: Update Spec Before Build

如果任务涉及接口变化，必须先更新：

- `backend/docs/backend_spec.yaml`

如果任务涉及实体变化，必须先更新：

- `backend/docs/backend_design.md`

禁止：

- 先写实现，后补契约

## 3.5 Step 5: Implement Smallest Viable Slice

只实现当前 Slice 所需的最小闭环。

原则：

- 优先做纵向闭环
- 不顺手扩展边缘功能
- 不在同一次任务中混做多个无关 Slice

## 3.6 Step 6: Verify

至少做以下验证：

- spec 可解析或可核对
- 逻辑路径可验证
- 页面状态完整
- 主链路不被破坏

## 3.7 Step 7: Update Mirrors

完成后必须检查是否要同步以下镜像文档：

- `backend/docs/feature_inventory.md`
- `backend/docs/slice_registry.md`
- `backend/docs/release_gates.md`

## 4. Task Types And Required Outputs

## 4.1 Feature Build Task

必须输出：

- 归属 Slice
- 相关接口
- 相关数据实体
- 已完成的验收项
- 仍未完成的阻塞项

## 4.2 Review Task

必须输出：

- 发现的问题
- 为什么是问题
- 影响哪个 Slice
- 阻塞级别
- 修复建议

## 4.3 Planning Task

必须输出：

- 当前阶段目标
- 推荐 Slice 顺序
- 阶段阻塞项

## 5. Required Self-Check Questions

Agent 在结束任务前，必须至少回答以下问题：

1. 当前任务属于哪个 Slice？
2. 这个 Slice 的接口是否已有 spec？
3. 这个 Slice 的数据实体是否有设计定义？
4. 当前任务是否减少了关键 mock 依赖？
5. 当前任务是否引入了新的熵？

如果有任一问题答不上来，不应宣称完成。

## 6. Anti-Patterns

以下行为视为违反协议：

### Anti-Pattern 1

“看到页面缺一个效果，就直接加代码。”

问题：

- 没有 Slice
- 没有范围控制

### Anti-Pattern 2

“先写一个临时接口，之后再整理 spec。”

问题：

- 直接制造契约漂移

### Anti-Pattern 3

“页面能点，就算功能完成。”

问题：

- 可能仍依赖 mock
- 可能异常路径全空

### Anti-Pattern 4

“顺手把不相关模块也一起改了。”

问题：

- 会模糊 Slice 边界
- 增加 review 成本

### Anti-Pattern 5

“测试通过，所以一定没问题。”

问题：

- 测试本身可能无效
- 必须检查测试边界是否正确

## 7. Preferred Review Output Format

Agent 在做 review 或自审时，优先使用以下格式：

```text
Issue:
Why it matters:
Affected slice:
Blocking level:
Fix:
```

## 8. Current Project Priorities

当前项目里，Agent 默认优先关注：

- `P0-02 Discover Read`
- `P0-03 Prompt Library CRUD`
- `P0-04 Writer Workspace`
- `P0-05 Generate Task`
- `P0-06 Layout Workspace`
- `P0-07 Asset Upload`

以下能力默认不优先：

- `editor/page.tsx` 扩展
- 未接入主路由的 Dashboard 组件
- P2 类增强能力

## 9. Completion Statement Template

完成任务时，建议使用如下摘要：

```text
Slice:
Scope:
Spec updated:
Data design updated:
Feature inventory updated:
Main path verified:
Residual risks:
```

## 10. Bottom Line

在这个项目里，Agent 的首要职责不是“写得快”，而是：

- 正确定位任务
- 遵守契约
- 保持架构边界
- 让主链路闭环
- 持续降低熵

如果做不到这 5 点，产出再多，也不算合格的 Harness 内开发。
