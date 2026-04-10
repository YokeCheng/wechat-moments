# P0-02 Discover Read Execution Pack

## 1. Purpose

本文档把 `P0-02 Discover Read` 从 Slice 注册项推进为可执行交付包。
目标是把首页从本地 `articles.ts` 原型数据切到真实后端读取能力，并明确这个 Slice 的边界、依赖、测试和门禁。

## 2. Slice Snapshot

| Item | Value |
| --- | --- |
| slice_id | `P0-02` |
| name | `Discover Read` |
| priority | `P0` |
| frontend route | `/` |
| dependency | `P0-01 Auth And Current User` |
| core endpoints | `GET /api/v1/discover/articles`, `GET /api/v1/discover/hot-topics` |
| core entities | `discover_articles`, `hot_topics` |
| main mock to retire | `frontend/src/mocks/articles.ts` |

## 3. Current Baseline

基于当前前端盘点，`/` 页面的现状是：

- 已注册并可访问
- 主数据来自 `frontend/src/mocks/articles.ts`
- 页面具备列表、筛选、热搜榜等原型 UI
- 当前没有项目自有后端请求接入
- 收藏、导出等行为尚未形成真实后端闭环

这意味着 `P0-02` 不是“重做首页”，而是“保留现有原型结构，切换主数据源并补齐页面状态”。

## 4. In Scope

本 Slice 当前范围内必须完成：

- 首页文章列表真实读取
- 首页热搜榜真实读取
- 列表查询参数与接口参数对齐
- 页面具备 `loading / empty / error / success`
- `articles.ts` 不再作为首页主数据源

## 5. Out Of Scope

以下能力不属于本 Slice 的最小闭环，不应顺手扩展：

- 收藏持久化
- 导出能力
- 基于文章一键派生提示词的真实闭环
- 基于文章直接发起仿写任务的真实闭环
- Dashboard 类未注册页面和未接入组件

说明：

- 收藏属于 `P1-01 Discover Favorite And Export`
- 派生提示词与仿写将依赖 `P0-03` 和 `P0-04`

## 6. Contract Checklist

## 6.1 `GET /api/v1/discover/articles`

必须覆盖：

- 查询参数：
  - `platform`
  - `keyword`
  - `field`
  - `time_range`
  - `views_min`
  - `page`
  - `page_size`
- 响应字段：
  - `id`
  - `platform`
  - `field`
  - `title`
  - `author`
  - `publish_time`
  - `views`
  - `likes`
  - `shares`
  - `source_url`
  - `is_hot`
  - `is_new`
- 分页结构：
  - `items`
  - `pagination`

## 6.2 `GET /api/v1/discover/hot-topics`

必须覆盖：

- 查询参数：
  - `page`
  - `page_size`
- 响应字段：
  - `id`
  - `rank`
  - `title`
  - `heat`
  - `trend`
  - `field`

## 7. Data Checklist

对应数据设计已经存在于 `backend/docs/backend_design.md`：

- `discover_articles`
  - 支持平台、领域、标题、作者、发布时间、阅读量等字段
  - 已定义查询相关索引
- `hot_topics`
  - 支持排行、热度、趋势、领域、快照日期

该 Slice 在落地时需要特别确认：

- 接口响应字段名与数据表字段映射一致
- `author_name -> author` 的输出映射清晰稳定
- 时间筛选逻辑与 `publish_time` 一致
- 热搜榜查询至少有快照日期或默认最新快照策略

## 8. Gate Status

按当前文档状态，`P0-02` 的 Gate 判断建议如下：

- `G0 Spec Ready`
  - 已基本具备
  - 证据：
    - `slice_registry.md` 已登记
    - `backend_spec.yaml` 已有对应接口
    - `backend_design.md` 已有对应实体
    - `feature_inventory.md` 已记录首页现状与 mock 来源
- `G1 Backend Ready`
  - 未开始
- `G2 Frontend Ready`
  - 未开始
- `G3 Flow Ready`
  - 未开始

## 9. Delivery Plan

推荐按以下顺序执行：

1. 确认 `P0-01` 的最小用户上下文策略
2. 实现 `GET /api/v1/discover/articles`
3. 实现 `GET /api/v1/discover/hot-topics`
4. 为两条接口补 contract test
5. 为筛选、分页和空结果补 integration test
6. 首页切换到真实接口
7. 补齐 `loading / empty / error / success`
8. 将 `articles.ts` 从首页主链路移除
9. 回写 `feature_inventory.md` 和 `slice_registry.md`

## 10. Required Tests

最低测试集建议：

- contract test
  - 两条 discover 接口均存在且响应结构符合 spec
- integration test
  - 列表筛选条件生效
  - 分页正确
  - 空结果返回正常
  - 非法参数返回清晰错误
- homepage smoke
  - 首页加载真实文章列表
  - 首页加载热搜榜
  - 后端失败时页面进入错误态

## 11. Acceptance Checklist

```text
Slice: P0-02 Discover Read

- [ ] 首页文章列表来自真实接口
- [ ] 首页热搜榜来自真实接口
- [ ] platform / keyword / field / time_range / views_min 查询有效
- [ ] 页面具备 loading / empty / error / success 四态
- [ ] frontend/src/mocks/articles.ts 不再作为首页主数据源
- [ ] feature_inventory.md 已回写
- [ ] slice_registry.md 状态已回写
```

## 12. Blocking Risks

当前主要阻塞项：

- `P0-01` 尚未闭环，真实用户上下文策略未完全落地
- 首页上的收藏等动作如果未明确降级，可能被误判为已完成能力
- 页面现有按钮行为如果仍依赖 mock 分支，容易形成“接口接了但数据没切”的假完成

## 13. Bottom Line

`P0-02` 的完成标志不是“后端有两个 GET 路由”，而是：

- 首页主数据已脱离 `articles.ts`
- 页面状态完整
- 查询与返回字段和 spec 一致
- 文档和 Slice 状态已同步

缺任何一项，都不应把这个 Slice 标记为完成。
