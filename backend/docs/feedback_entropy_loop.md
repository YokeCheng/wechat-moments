# Feedback And Entropy Loop

## 1. Purpose

本文件定义项目中的 Feedback Loop 和 Entropy Management 机制。

目标：

- 让 Agent 在开发中持续获得可执行反馈
- 让错误能够循环回到模型或开发者，形成自修复
- 让仓库不会随着持续迭代而快速熵增

## 2. Feedback Loop Model

本项目采用五层反馈回路。

### Layer 1: Context Feedback

问题：

- Agent 是否读对了文档
- Agent 是否识别对了当前任务归属

输入来源：

- `AGENTS.md`
- `backend/docs/slice_registry.md`
- `backend/docs/feature_inventory.md`

如果失败：

- 回到任务定义阶段
- 不允许直接编码

### Layer 2: Contract Feedback

问题：

- 接口是否符合 `backend_spec.yaml`
- 页面依赖字段是否已定义

检查对象：

- 路径
- 方法
- 参数
- 状态值
- 响应字段

如果失败：

- 先修 spec 或先修实现
- 不允许把“临时字段”留在代码里

### Layer 3: Logic Feedback

问题：

- 业务逻辑是否符合数据模型和状态机

检查对象：

- CRUD 行为
- 状态流转
- 权限隔离
- 空态与异常场景

如果失败：

- 回到 Service / Repo 逻辑

### Layer 4: Flow Feedback

问题：

- 用户主链路是否跑通

当前重点链路：

1. 爆款发现
2. 提示词管理
3. 生文任务
4. 排版草稿

如果失败：

- 即使单接口通过，也不能视为 Slice 完成

### Layer 5: Review Feedback

问题：

- 当前改动是否真的达成目标
- 测试是否有效
- 文档是否同步

检查对象：

- 变更与 Slice 是否一致
- 是否留有新技术债
- 是否存在无效测试

## 3. Agent-To-Agent Review Model

本项目采用“智能体审智能体”的思路：

- 代码或文档变更完成后，先自检
- 再通过约束、契约和测试打回
- 若仍不满足，再次修正

建议流程：

1. Agent 自审任务范围
2. Agent 自审契约变更
3. Agent 运行基本检查
4. Agent 检查页面 / 接口 / 文档是否一致
5. 未通过则回滚到前一阶段重新修正

## 4. Invalid Test Detection

测试通过不等于能力有效。

以下情况应判定测试无效：

- 只覆盖 happy path，不覆盖错误路径
- 测试使用的输入与真实页面行为不一致
- 状态流存在 bug，但测试仍因断言过弱而通过
- 页面仍依赖 mock，但测试只测本地状态
- 接口返回错误字段名，测试没检测出来

判定无效后：

- 该 Slice 不能完成
- 测试必须重写或补强

## 5. Required Checks Per Slice

每个 Slice 完成时，至少跑以下检查：

### Check 1: Scope Check

- 是否属于注册切片
- 是否在当前优先级范围

### Check 2: Contract Check

- `backend_spec.yaml` 可解析
- 接口路径存在
- 字段和状态定义齐全

### Check 3: Data Check

- 实体、关系、状态是否在设计文档中有定义

### Check 4: Feature Check

- `feature_inventory.md` 是否已更新
- 是否还依赖关键 mock

### Check 5: Flow Check

- 是否至少走通一条主路径

## 6. Entropy Sources In Current Project

当前仓库已经出现若干典型熵源：

### Source A: Unregistered Pages

- `frontend/src/pages/editor/page.tsx`

### Source B: Dead Navigation Targets

- `/editor`
- `/materials`
- `/analytics`
- `/publish`

### Source C: Mock-Critical Paths

- `frontend/src/mocks/articles.ts`
- `frontend/src/mocks/prompts.ts`
- `frontend/src/mocks/writerArticles.ts`

### Source D: Static Prototype Islands

- 公众号管理页面内 `mockChannels`
- 会员中心页面内 `plans`
- 教程页面内静态规格说明

### Source E: Documentation Drift

- 文档可能与代码状态不一致

### Source F: Encoding Drift

- 当前前端存在中文编码异常文件，属于工程熵的一种

## 7. Entropy Management Strategy

## 7.1 Continuous Small-Paydown

不等待系统混乱后集中治理，而是在每次改动中做小额偿还。

具体要求：

- 替换主链路 mock 时，顺手移除对应临时状态
- 接真实接口时，补齐空态 / 错误态
- 发现死路由时，记录并决策，而不是长期放置
- 发现重复状态定义时，合并到契约单一来源

## 7.2 Mock Retirement Policy

关键主链路 mock 不得长期存在。

退役顺序建议：

1. `articles.ts`
2. `prompts.ts`
3. `writerArticles.ts`
4. 页面内 `mockChannels`
5. 页面内 `plans`

规则：

- 一旦某模块接入真实接口，对应关键 mock 必须标记为待退役
- 不允许“接口接了，但页面继续用 mock”

## 7.3 Doc Gardening Policy

文档园丁策略要求持续扫描以下漂移：

- spec 与实现漂移
- feature inventory 与页面现状漂移
- PRD 与切片优先级漂移
- 架构规则与目录结构漂移

每次改动后，至少确认：

- 是否要更新 `feature_inventory.md`
- 是否要更新 `slice_registry.md`
- 是否要更新 `backend_spec.yaml`

## 7.4 Route Gardening Policy

每个阶段都要扫描：·····························

- 前端跳转目标是否已注册
- 注册页面是否有真实入口
- 是否存在长期未接通页面

## 7.5 Encoding Hygiene

当前仓库存在编码不一致问题。规则如下：

- 新增文档和代码统一用 UTF-8
- 不在已有乱码基础上继续扩散
- 发现编码异常文件时，应登记为治理项

## 8. Operational Cadence

## 8.1 On Every Task

每次任务完成后都应执行：

- 更新相关文档
- 检查是否引入新 mock 依赖
- 检查是否引入未注册路径

## 8.2 On Every Slice

每个 Slice 完成后都应执行：

- 契约校验
- 主路径检查
- 功能清单状态更新

## 8.3 On Every Milestone

每个阶段完成前都应执行：

- 主链路全量复核
- 技术债清单更新
- 文档一致性复核

## 9. Feedback Output Requirements

任何自动化或人工反馈，最好采用以下格式：

```text
Issue:
Why it matters:
How to fix:
Blocking level:
Affected slice:
```

示例：

```text
Issue: Writer page does not read query params from discover flow.
Why it matters: Breaks the discover -> writer handoff, so P0 flow is not closed.
How to fix: Parse title/promptId/ref from route query and prefill the generate form.
Blocking level: P0-blocking
Affected slice: P0-04 Writer Workspace
```

这种格式的反馈更适合 Agent 自我修复。

## 10. What Counts As Entropy Reduction

以下动作可以计入“熵减少”：

- 去掉主链路 mock
- 消除死路由
- 合并重复状态定义
- 修正文档漂移
- 补齐异常路径
- 统一契约字段命名
- 修复编码异常

## 11. Immediate Use In This Project

当前阶段，反馈和熵管理应优先盯住：

1. 首页真实数据化
2. 提示词库真实数据化
3. 生文任务真实化
4. 排版草稿真实化

也就是：

- 少做边缘优化
- 先把主链路从原型变成系统

## 12. Bottom Line

如果一个改动让仓库多了：

- 更多 mock
- 更多隐式字段
- 更多死页面
- 更多文档漂移
- 更多重复状态

那么它即使“功能看起来更多”，在 Harness 视角里也是退步。
