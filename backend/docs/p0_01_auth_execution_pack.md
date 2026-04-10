# P0-01 Auth And Current User Execution Pack

## 1. Purpose

本文档把 `P0-01 Auth And Current User` 从 Slice 注册项推进为可执行交付包。
目标是为整个平台建立最小可用的“当前用户上下文”，让后续 P0 Slice 在真实用户身份、套餐和用量摘要之上继续开发，而不是继续依赖隐式前端状态。

## 2. Slice Snapshot

| Item | Value |
| --- | --- |
| slice_id | `P0-01` |
| name | `Auth And Current User` |
| priority | `P0` |
| frontend route | `global navigation` |
| dependency | `none` |
| core endpoints | `POST /api/v1/auth/dev-login`, `GET /api/v1/me` |
| core entities | `users`, `subscriptions`, `usage_counters` |
| main drift to retire | current user still implicit in frontend |

## 3. Current Baseline

基于当前前端盘点，这个 Slice 的现状是：

- 顶部导航和用户下拉 UI 已存在
- 前端界面上存在“用户中心 / 会员 / 用量”类展示入口
- 当前项目自有后端尚未为前端提供真实用户上下文
- 当前 spec 已定义 `GET /api/v1/me`
- 当前数据设计已定义 `users`、`subscriptions`、`usage_counters`

这意味着 `P0-01` 的任务不是一口气做完整认证系统，而是先让整个平台拥有一个真实、稳定、可复用的“当前用户上下文入口”。

## 4. In Scope

本 Slice 当前范围内必须完成：

- 建立最小身份解析策略
- 提供 `POST /api/v1/auth/dev-login`
- 提供 `GET /api/v1/me`
- 返回当前用户基础信息
- 返回当前套餐摘要
- 返回当前用量摘要
- 为后续私有数据 Slice 提供稳定的 `user_id` 归属前提

说明：

- 这里的“身份解析策略”可以是最小可用方案
- 目标是支撑后续 Discover、Prompts、Writer、Layout 的真实联调

## 5. Out Of Scope

以下能力不属于本 Slice 的最小闭环，不应顺手扩展：

- 注册、找回密码、短信登录
- 完整 RBAC 权限系统
- 账号设置页
- 第三方 OAuth 登录
- 支付开通会员流程
- 完整订阅生命周期运营规则

说明：

- `P0-01` 关注的是“当前用户上下文”
- 不是“一次性做完整账号体系”

## 6. Contract Checklist

## 6.1 `GET /api/v1/me`

必须覆盖：

- 鉴权前提：
  - 使用已有 `bearerAuth`
- 响应字段：
  - `id`
  - `username`
  - `display_name`
  - `plan_code`
  - `usage`
- `usage` 子字段：
  - `generate_daily_used`
  - `generate_daily_limit`
  - `prompt_count`
  - `channel_count`
  - `export_monthly_used`
  - `export_monthly_limit`

## 6.2 Error Semantics

最低要求应覆盖：

- 未登录或 token 无效时返回明确错误
- 用户不存在或状态异常时返回明确错误
- 当前用户没有有效订阅时，仍能回落到默认套餐视图，例如 `free`

说明：

- 当前 spec 对成功响应已定义
- 失败语义应在实现和测试中显式补齐

## 6.3 `POST /api/v1/auth/dev-login`

最低要求应覆盖：

- 开发环境可通过用户名换取 bearer token
- 同一用户名可稳定映射到同一用户
- token 可直接用于 `/api/v1/me`

## 7. Data Checklist

对应数据设计已经存在于 `backend/docs/backend_design.md`：

- `users`
  - 存储基础身份信息
- `subscriptions`
  - 提供当前计划归属
- `usage_counters`
  - 提供周期性用量摘要

该 Slice 在落地时需要特别确认：

- `plan_code` 的来源是否来自当前有效订阅
- 如果没有有效订阅，是否回落为 `free`
- `usage` 返回的是当前周期快照，而不是散落字段拼接
- 后续私有资源均可以稳定按 `user_id` 隔离

## 8. Gate Status

按当前文档状态，`P0-01` 的 Gate 判断建议如下：

- `G0 Spec Ready`
  - 已基本具备
  - 证据：
    - `slice_registry.md` 已登记
    - `backend_spec.yaml` 已有 `GET /api/v1/me`
    - `backend_design.md` 已有 `users`、`subscriptions`、`usage_counters`
    - `feature_inventory.md` 已记录全局导航和当前前端现状
- `G1 Backend Ready`
  - 未开始
- `G2 Frontend Ready`
  - 未开始
- `G3 Flow Ready`
  - 未开始

## 9. Delivery Plan

推荐按以下顺序执行：

1. 明确最小身份解析方案
2. 实现鉴权依赖或等效用户上下文注入
3. 实现 `GET /api/v1/me`
4. 补齐套餐摘要与用量摘要聚合逻辑
5. 为 `/me` 补 contract test
6. 为未登录、无订阅、正常用户三类场景补 integration test
7. 全局导航切换到真实用户上下文
8. 明确后续 P0 Slice 对 `user_id` 的依赖约定
9. 回写 `feature_inventory.md`、`slice_registry.md`、`traceability_matrix.md`

## 10. Required Tests

最低测试集建议：

- contract test
  - `/api/v1/me` 存在且响应结构符合 spec
- auth integration test
  - 合法身份返回当前用户
  - 无效身份返回明确错误
  - 无有效订阅时返回默认套餐或明确定义结果
- usage summary integration test
  - 当期用量聚合正确
  - 缺失部分计数器时有稳定兜底
- navigation smoke
  - 前端全局导航可读取并展示当前用户摘要

## 11. Acceptance Checklist

```text
Slice: P0-01 Auth And Current User

- [ ] `GET /api/v1/me` 可返回真实当前用户信息
- [ ] 返回当前套餐摘要
- [ ] 返回当前用量摘要
- [ ] 未登录或 token 无效时有明确错误语义
- [ ] 后续私有数据 Slice 可稳定拿到 `user_id`
- [ ] 全局导航不再依赖隐式前端用户状态
- [ ] feature_inventory.md 已回写
- [ ] slice_registry.md 状态已回写
- [ ] traceability_matrix.md 已回写
```

## 12. Blocking Risks

当前主要阻塞项：

- 当前 spec 有 `/me`，但本地开发阶段的最小身份注入方式尚未明确
- 套餐来源如果没有“当前有效订阅”规则，`plan_code` 可能漂移
- 用量摘要如果按多个分散来源拼接，容易与后续 Billing Slice 产生双重真相
- 如果前端未真正接入 `/me`，这个 Slice 容易被误判为“后端已完成”

## 13. Dependency Value For P0-02

`P0-01` 对 `P0-02 Discover Read` 的直接价值是：

- 为 Discover 请求提供稳定的当前用户上下文
- 让后续收藏、导出等用户私有行为有身份基础
- 避免首页在切真实接口时继续依赖隐式本地用户

也就是说，`P0-02` 不需要等待完整账号系统，但需要等待一个稳定的 `/me` 和用户归属策略。

## 14. Bottom Line

`P0-01` 的完成标志不是“后端多了一个 `/me` 路由”，而是：

- 当前用户身份可稳定解析
- `/me` 能返回真实用户、套餐和用量摘要
- 全局导航可消费这个上下文
- 后续私有数据 Slice 有统一的 `user_id` 前提

缺任何一项，都不应把这个 Slice 标记为完成。
