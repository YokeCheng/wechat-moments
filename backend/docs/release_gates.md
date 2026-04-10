# Release Gates

## 1. Purpose

本文件定义“爆了么”平台在 Harness Engineering 下的阶段放行标准。

这里的 Gate 不是泛泛的“建议”，而是阶段切换条件：

- 没通过 Gate，不能宣称某阶段完成
- 没通过 Gate，不能把高优先级 Slice 标记为 `done`
- 没通过 Gate，不能理直气壮地开始下一个优先级阶段

## 2. Gate Model

本项目采用 5 个门禁层级：

- `G0 Spec Ready`
- `G1 Backend Ready`
- `G2 Frontend Ready`
- `G3 Flow Ready`
- `G4 Release Ready`

这 5 层必须按顺序通过，不允许跳过。

## 3. Gate Definitions

## 3.1 G0: Spec Ready

表示某个 Slice 已经具备进入开发的最低条件。

### 必须满足

- 该能力已归属到 `backend/docs/slice_registry.md` 中的某个 Slice
- 该能力在 `backend/docs/prd.md` 中有范围依据
- 该能力的接口已经写入 `backend/docs/backend_spec.yaml`
- 该能力涉及的实体已经在 `backend/docs/backend_design.md` 中定义
- 该能力的前端现状已能在 `backend/docs/feature_inventory.md` 中定位

### 典型失败信号

- 页面已经开始改，但 spec 还没定义
- 讨论功能时只能指前端代码，无法映射到 Slice
- 后端接口名称已经出现，但设计文档没跟上

### 通过后允许

- 开始后端实现
- 开始前端真实接口接入准备

## 3.2 G1: Backend Ready

表示接口和核心逻辑已可用于联调。

### 必须满足

- 对应接口已实现
- 接口和 `backend_spec.yaml` 一致
- 关键状态枚举已落地
- 至少具备基本错误处理
- 至少有契约检查或等价验证
- 至少有最小集成验证

### 典型失败信号

- 路由存在，但字段与 spec 不一致
- Happy path 可跑，但错误分支没有定义
- 接口看似完成，但异步任务没有状态查询能力

### 通过后允许

- 前端开始联调

## 3.3 G2: Frontend Ready

表示页面不再停留在 mock 原型，而是具备真实交互能力。

### 必须满足

- 页面已切到真实接口
- 对应主数据源不再依赖关键 mock
- 页面具备 `loading / empty / error / success` 状态
- 页面字段与 spec 一致
- 页面写操作能真实回写

### 典型失败信号

- 页面请求接口了，但实际仍显示 mock 数据
- 页面只有成功态，没有错误态
- 前端使用了 spec 没定义的字段

### 通过后允许

- 进入链路级验收

## 3.4 G3: Flow Ready

表示一个完整业务流已经跑通。

### 必须满足

- 至少一条端到端业务链路可验证
- 中间关键状态可追踪
- 输入、输出、持久化结果一致
- 页面跳转和参数传递有效

### 当前 P0 必须覆盖的链路

1. 发现页加载真实数据
2. 提示词库真实 CRUD
3. 生文页创建真实生成任务并拿到状态
4. 排版页保存真实草稿

### 典型失败信号

- 单接口都通，但页面之间接不上
- 生文成功后无法进入排版
- 页面跳转可以发生，但参数没有落到表单或持久化数据

### 通过后允许

- 进入阶段完成判断

## 3.5 G4: Release Ready

表示一个阶段已经达到对外或对团队内部宣布完成的标准。

### 必须满足

- 该阶段所有高优先级 Slice 已通过 `G3`
- 无阻塞级缺陷
- 文档已同步
- 功能盘点状态已回写
- 不存在关键主链路 mock 依赖

### 典型失败信号

- 已说“P0 完成”，但首页还靠 `articles.ts`
- 已说“提示词库完成”，但编辑分类不能真正保存
- 已说“生文完成”，但仍用 `setTimeout` 模拟

## 4. Stage Gates By Milestone

## 4.1 P0 Gate

P0 的目标不是“做完几个页面”，而是闭环内容主链路。

### P0 必须完成的 Slice

- `P0-01 Auth And Current User`
- `P0-02 Discover Read`
- `P0-03 Prompt Library CRUD`
- `P0-04 Writer Workspace`
- `P0-05 Generate Task`
- `P0-06 Layout Workspace`
- `P0-07 Asset Upload`

### P0 Release 条件

- 首页已不依赖 `articles.ts` 作为主数据源
- 提示词库已不依赖 `prompts.ts` 作为主数据源
- 生文页已不依赖 `writerArticles.ts` 作为主数据源
- “开始生成”不再由本地 `setTimeout` 模拟
- 排版页保存不再只是 toast
- 至少一条主链路完全跑通：
  - 发现 -> 生文 -> 排版
  - 提示词 -> 生文 -> 排版

### P0 未通过前，不应优先开发

- Dashboard 实时分析
- `editor/page.tsx` 的扩展
- 复杂商业化细节
- 教程后台化

## 4.2 P1 Gate

P1 的目标是把平台从内容生产工具扩展为“可发布、可收费、可收集反馈”的系统。

### P1 必须完成的 Slice

- `P1-01 Discover Favorite And Export`
- `P1-02 Contact Internalization`
- `P1-03 Channel Authorization`
- `P1-04 Publish Workflow`
- `P1-05 Billing And Subscription`

### P1 Release 条件

- 收藏行为可持久化
- 联系表单不再依赖 `readdy.ai`
- 公众号列表和授权来自真实后端
- 发布记录可查询
- 会员套餐、订单、订阅、用量来自真实后端

## 4.3 P2 Gate

P2 是优化和扩展阶段，不应与 P0/P1 混淆。

### P2 代表能力

- 教程 CMS 化
- `editor/page.tsx` 决策
- Dashboard 真实化
- 更复杂的运营与协作能力

## 5. Gate Checklist Template

每个 Slice 或里程碑验收时，可使用下面的检查模板：

```text
Slice / Milestone:
Current gate target:

G0 Spec Ready:
- [ ] Slice 已登记
- [ ] PRD 有范围依据
- [ ] Spec 已更新
- [ ] Data design 已更新

G1 Backend Ready:
- [ ] 接口实现完成
- [ ] 契约一致
- [ ] 错误路径存在
- [ ] 基本验证已通过

G2 Frontend Ready:
- [ ] 页面使用真实接口
- [ ] 关键 mock 已退役
- [ ] loading/empty/error/success 完整

G3 Flow Ready:
- [ ] 至少一条链路跑通
- [ ] 状态可追踪

G4 Release Ready:
- [ ] 文档已同步
- [ ] 无 P0/P1 阻塞缺陷
```

## 6. Blocking Levels

建议对未通过 Gate 的问题使用统一阻塞级别：

- `P0-blocking`
  - 影响主链路闭环
- `P1-blocking`
  - 影响发布、支付、反馈闭环
- `non-blocking`
  - 不影响当前里程碑声明完成

## 7. Operational Rule

任何任务如果：

- 尚未通过 `G0`
- 或者已经被识别为 `P0-blocking`

则不应继续分散开发其他扩展功能。

## 8. Bottom Line

在这个项目里，Release Gate 的核心不是“代码能运行”，而是：

- 文档一致
- 契约一致
- 页面一致
- 主链路一致

少一个，都不能算真正通过。
