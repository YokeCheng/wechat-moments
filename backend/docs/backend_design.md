# 爆了么 FastAPI 后端设计

## 1. 设计目标

本设计面向 PRD v0.1，目标是支撑前端原型落地为可运行的 MVP 后端。设计重点：

- 先打通内容生产主链路
- 数据模型尽量稳定，便于后续扩展公众号、会员、支付
- 接口语义清晰，适合 FastAPI + Pydantic + SQLAlchemy 实现

## 2. 技术建议

### 2.1 推荐技术栈

- Web 框架：FastAPI
- 数据校验：Pydantic v2
- ORM：SQLAlchemy 2.x
- 迁移：Alembic
- 数据库：PostgreSQL
- 缓存 / 队列：Redis
- 异步任务：
  - 本地开发：FastAPI `BackgroundTasks`
  - 生产建议：Celery / Dramatiq / Arq 三选一

### 2.2 推荐目录结构

```text
backend/
  app/
    api/
      deps.py
      v1/
        router.py
        endpoints/
          health.py
          auth.py
          discover.py
          prompts.py
          writer.py
          layout.py
          channels.py
          billing.py
          contact.py
    core/
      config.py
      security.py
      exceptions.py
    db/
      base.py
      session.py
      models/
    schemas/
      common.py
      auth.py
      discover.py
      prompts.py
      writer.py
      layout.py
      channels.py
      billing.py
      contact.py
    services/
      discover_service.py
      prompt_service.py
      writer_service.py
      layout_service.py
      channel_service.py
      billing_service.py
    workers/
      generate_article.py
      publish_channel.py
    main.py
  docs/
    prd.md
    backend_design.md
```

## 3. 接口设计约定

## 3.1 API 前缀

- 基础前缀：`/api/v1`

## 3.2 鉴权

### MVP 建议

- 采用 `Authorization: Bearer <token>` 方式
- 本地开发可提供开发登录接口
- 生产环境接入正式登录体系后保留 `/me`

### 鉴权分级

- 公开接口：健康检查、套餐列表、教程内容
- 登录接口：其余所有内容生产与资产管理接口
- 服务回调接口：支付回调、公众号授权回调，需验签

## 3.3 通用响应格式

推荐统一响应包裹，便于前端处理：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "request_id": "req_01J..."
}
```

## 3.4 通用错误码

| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 40001 | 参数错误 |
| 40101 | 未登录或 token 无效 |
| 40301 | 权限不足 |
| 40401 | 资源不存在 |
| 40901 | 资源冲突 |
| 42201 | 业务校验失败 |
| 42901 | 额度不足或频率超限 |
| 50001 | 内部错误 |

## 3.5 分页约定

列表接口统一支持以下参数：

- `page`
- `page_size`
- `keyword`
- `sort_by`
- `sort_order`

列表返回结构建议：

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 120,
  "has_more": true
}
```

## 4. 状态与枚举设计

### 4.1 提示词状态

- `draft`
- `active`
- `generating`

### 4.2 文章状态

- `draft`
- `generating`
- `completed`
- `failed`

### 4.3 生成任务状态

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

### 4.4 排版稿状态

- `draft`
- `published`

### 4.5 公众号状态

- `authorized`
- `expired`
- `revoked`

### 4.6 发布任务状态

- `queued`
- `publishing`
- `success`
- `failed`

### 4.7 订阅计划

- `free`
- `basic`
- `pro`
- `enterprise`

### 4.8 联系类型

- `feature`
- `bug`
- `business`
- `account`
- `other`

## 5. FastAPI 接口清单

## 5.1 系统与鉴权

### GET `/health`

- 说明：健康检查
- 鉴权：否
- 返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "ok"
  }
}
```

### POST `/api/v1/auth/dev-login`

- 说明：开发环境快速登录
- 鉴权：否
- 请求：

```json
{
  "username": "demo"
}
```

- 返回：

```json
{
  "token": "jwt_token",
  "user": {
    "id": "usr_xxx",
    "name": "Demo User",
    "plan_code": "free"
  }
}
```

### GET `/api/v1/me`

- 说明：获取当前用户与权益
- 鉴权：是
- 返回字段：
  - 用户基本信息
  - 当前套餐
  - 使用额度摘要

## 5.2 每日爆款 / 热搜

### GET `/api/v1/discover/articles`

- 说明：查询爆款文章列表
- 鉴权：是
- 查询参数：
  - `platform`: `weixin` / `toutiao`
  - `keyword`
  - `field`
  - `time_range`
  - `views_min`
  - `page`
  - `page_size`

- 返回字段：
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

### GET `/api/v1/discover/hot-topics`

- 说明：查询热搜榜
- 鉴权：是
- 查询参数：
  - `platform`，预留
  - `page`
  - `page_size`

### POST `/api/v1/discover/favorites`

- 说明：收藏文章
- 鉴权：是
- 请求：

```json
{
  "article_id": "art_xxx"
}
```

### DELETE `/api/v1/discover/favorites/{article_id}`

- 说明：取消收藏文章
- 鉴权：是

### POST `/api/v1/discover/articles/{article_id}/derive-prompt`

- 说明：基于爆款文章生成提示词草稿
- 鉴权：是
- 行为：
  - 读取文章信息
  - 生成提示词文本
  - 可选择直接落库为草稿提示词

### POST `/api/v1/discover/articles/{article_id}/imitate`

- 说明：基于爆款文章创建生文任务草稿
- 鉴权：是
- 请求：

```json
{
  "title": "文章标题",
  "prompt_id": "prm_xxx",
  "group_id": "grp_xxx",
  "ref_url": "https://...",
  "image_count": 3
}
```

## 5.3 提示词库

### GET `/api/v1/prompt-categories`

- 说明：查询提示词分类列表
- 鉴权：是

### POST `/api/v1/prompt-categories`

- 说明：新增提示词分类
- 鉴权：是
- 请求：

```json
{
  "name": "情感"
}
```

### PATCH `/api/v1/prompt-categories/{category_id}`

- 说明：编辑提示词分类
- 鉴权：是

### DELETE `/api/v1/prompt-categories/{category_id}`

- 说明：删除提示词分类
- 鉴权：是
- 约束：
  - 若存在提示词引用，默认禁止删除

### GET `/api/v1/prompts`

- 说明：查询提示词列表
- 鉴权：是
- 查询参数：
  - `category_id`
  - `keyword`
  - `status`
  - `page`
  - `page_size`

### POST `/api/v1/prompts`

- 说明：新增提示词
- 鉴权：是
- 请求：

```json
{
  "title": "爆款情感文章生成",
  "category_id": "cat_xxx",
  "content": "提示词内容",
  "tags": ["情感", "故事"],
  "status": "draft"
}
```

### GET `/api/v1/prompts/{prompt_id}`

- 说明：查询提示词详情
- 鉴权：是

### PATCH `/api/v1/prompts/{prompt_id}`

- 说明：编辑提示词
- 鉴权：是

### DELETE `/api/v1/prompts/{prompt_id}`

- 说明：删除提示词
- 鉴权：是

### POST `/api/v1/prompts/{prompt_id}/activate`

- 说明：启用提示词
- 鉴权：是

### POST `/api/v1/prompts/{prompt_id}/deactivate`

- 说明：停用提示词
- 鉴权：是

## 5.4 智能生文

### GET `/api/v1/writer/groups`

- 说明：查询文章分组
- 鉴权：是

### POST `/api/v1/writer/groups`

- 说明：新建文章分组
- 鉴权：是
- 请求：

```json
{
  "name": "科技类"
}
```

### DELETE `/api/v1/writer/groups/{group_id}`

- 说明：删除文章分组
- 鉴权：是
- 约束：
  - 分组删除后，文章回落到“未分组”

### GET `/api/v1/writer/articles`

- 说明：查询文章列表
- 鉴权：是
- 查询参数：
  - `group_id`
  - `keyword`
  - `status`
  - `page`
  - `page_size`

### POST `/api/v1/writer/articles`

- 说明：创建文章草稿
- 鉴权：是
- 用途：
  - 纯手动新建草稿
  - 由上游页面预创建文章占位

### GET `/api/v1/writer/articles/{article_id}`

- 说明：查询文章详情
- 鉴权：是

### PATCH `/api/v1/writer/articles/{article_id}`

- 说明：编辑文章元信息与正文
- 鉴权：是
- 可编辑字段：
  - `title`
  - `group_id`
  - `prompt_id`
  - `ref_url`
  - `image_count`
  - `content`
  - `status`

### DELETE `/api/v1/writer/articles/{article_id}`

- 说明：删除文章
- 鉴权：是

### POST `/api/v1/writer/generate-tasks`

- 说明：发起 AI 生文任务
- 鉴权：是
- 请求：

```json
{
  "title": "GPT-5 发布解读",
  "group_id": "grp_xxx",
  "prompt_id": "prm_xxx",
  "ref_url": "https://...",
  "image_count": 3
}
```

- 返回：

```json
{
  "task_id": "gen_xxx",
  "article_id": "atr_xxx",
  "status": "queued"
}
```

### GET `/api/v1/writer/generate-tasks/{task_id}`

- 说明：查询生成任务状态
- 鉴权：是
- 返回字段：
  - `status`
  - `error_message`
  - `article_id`
  - `started_at`
  - `finished_at`

### POST `/api/v1/writer/generate-tasks/{task_id}/cancel`

- 说明：取消生成任务
- 鉴权：是

## 5.5 一键排版

### POST `/api/v1/layout/render`

- 说明：将 Markdown 与样式参数渲染为 HTML
- 鉴权：是
- 请求：

```json
{
  "title": "文章标题",
  "content_md": "# 标题",
  "cover_asset_id": "ast_xxx",
  "theme_id": "default",
  "theme_color": "#FF6600",
  "font_family": "sans",
  "font_size": 15,
  "line_height": 1.8,
  "title_align": "center",
  "para_indent": true,
  "round_image": true
}
```

### GET `/api/v1/layout/drafts`

- 说明：查询排版草稿列表
- 鉴权：是

### POST `/api/v1/layout/drafts`

- 说明：保存排版草稿
- 鉴权：是

### GET `/api/v1/layout/drafts/{draft_id}`

- 说明：查询排版草稿详情
- 鉴权：是

### PATCH `/api/v1/layout/drafts/{draft_id}`

- 说明：更新排版草稿
- 鉴权：是

### DELETE `/api/v1/layout/drafts/{draft_id}`

- 说明：删除排版草稿
- 鉴权：是

### POST `/api/v1/assets/upload`

- 说明：上传封面或正文图片
- 鉴权：是
- 说明：
  - 建议返回统一资产 ID 和可访问 URL

## 5.6 公众号管理

### GET `/api/v1/channels`

- 说明：查询当前用户公众号列表
- 鉴权：是

### POST `/api/v1/channels/auth/start`

- 说明：发起公众号授权
- 鉴权：是
- 返回：
  - 授权地址
  - state

### POST `/api/v1/channels/auth/callback`

- 说明：处理公众号授权回调
- 鉴权：否，需验签

### DELETE `/api/v1/channels/{channel_id}`

- 说明：解绑公众号
- 鉴权：是

### POST `/api/v1/channels/{channel_id}/publish`

- 说明：发起文章发布
- 鉴权：是
- 请求：

```json
{
  "article_id": "atr_xxx",
  "layout_draft_id": "lay_xxx",
  "title": "文章标题"
}
```

### GET `/api/v1/channels/{channel_id}/publish-records`

- 说明：查询发布记录
- 鉴权：是

## 5.7 会员与支付

### GET `/api/v1/billing/plans`

- 说明：查询套餐列表
- 鉴权：否

### GET `/api/v1/billing/subscription`

- 说明：查询当前用户订阅状态与资源额度
- 鉴权：是

### POST `/api/v1/billing/orders`

- 说明：创建订单
- 鉴权：是
- 请求：

```json
{
  "plan_code": "pro",
  "payment_method": "wechat"
}
```

### GET `/api/v1/billing/orders/{order_id}`

- 说明：查询订单状态
- 鉴权：是

### POST `/api/v1/billing/payments/callback`

- 说明：支付结果回调
- 鉴权：否，需验签

### GET `/api/v1/billing/usage`

- 说明：查询当前周期使用量
- 鉴权：是

## 5.8 联系我们

### POST `/api/v1/contact/messages`

- 说明：提交联系表单
- 鉴权：可匿名，也可登录
- 请求：

```json
{
  "name": "张三",
  "email": "demo@example.com",
  "type": "feature",
  "message": "建议增加导出能力"
}
```

### GET `/api/v1/contact/messages`

- 说明：后台查询留言
- 鉴权：管理员

## 6. 数据表设计

## 6.1 设计原则

- 所有业务主表使用字符串主键，便于跨服务扩展。
- 时间字段统一使用 `timestamptz`。
- 用户私有数据原则上全部带 `user_id`。
- 枚举类状态字段统一使用 `varchar(32)`，由应用层约束。
- 金额统一使用“分”为单位的整数。

## 6.2 核心表清单

### 1. `users`

用户基础信息表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 用户 ID |
| username | varchar(64) unique | 用户名 |
| email | varchar(128) null | 邮箱 |
| display_name | varchar(64) | 展示名 |
| avatar_url | varchar(255) null | 头像 |
| status | varchar(32) | `active` / `disabled` |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `uk_users_username`
- `idx_users_email`

### 2. `plans`

套餐定义表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 套餐 ID |
| code | varchar(32) unique | `free/basic/pro/enterprise` |
| name | varchar(64) | 套餐名称 |
| price_amount | integer | 金额，单位分 |
| billing_cycle | varchar(16) | `month` / `year` |
| description | text | 描述 |
| limits_json | jsonb | 额度配置 |
| is_active | boolean | 是否启用 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

`limits_json` 示例：

```json
{
  "discover_export_monthly": 999,
  "prompt_limit": -1,
  "generate_daily": 50,
  "channel_limit": 3
}
```

### 3. `subscriptions`

用户订阅关系表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 订阅 ID |
| user_id | varchar(32) | 用户 ID |
| plan_id | varchar(32) | 套餐 ID |
| status | varchar(32) | `active` / `expired` / `cancelled` |
| started_at | timestamptz | 生效时间 |
| expired_at | timestamptz | 到期时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_subscriptions_user_id`
- `idx_subscriptions_status`

### 4. `orders`

订单表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 订单 ID |
| user_id | varchar(32) | 用户 ID |
| plan_id | varchar(32) | 套餐 ID |
| order_no | varchar(64) unique | 业务订单号 |
| amount | integer | 金额，单位分 |
| payment_method | varchar(32) | 支付方式 |
| status | varchar(32) | `pending` / `paid` / `failed` / `closed` |
| paid_at | timestamptz null | 支付时间 |
| ext_json | jsonb | 回调原始信息 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 5. `usage_counters`

用户资源用量快照表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 主键 |
| user_id | varchar(32) | 用户 ID |
| period_key | varchar(16) | 统计周期，例如 `2026-04` |
| metric_code | varchar(64) | 指标编码 |
| used_count | integer | 已用数量 |
| updated_at | timestamptz | 更新时间 |

唯一约束：

- `uk_usage_user_period_metric (user_id, period_key, metric_code)`

### 6. `discover_articles`

爆款文章表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 文章 ID |
| platform | varchar(32) | `weixin` / `toutiao` |
| field | varchar(32) | 领域 |
| title | varchar(255) | 标题 |
| author_name | varchar(128) | 作者 / 账号 |
| publish_time | timestamptz | 发布时间 |
| views | integer | 阅读量 |
| likes | integer | 点赞数 |
| shares | integer | 分享数 |
| source_url | varchar(500) | 原文链接 |
| is_hot | boolean | 是否热 |
| is_new | boolean | 是否新 |
| raw_json | jsonb | 原始采集数据 |
| created_at | timestamptz | 入库时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_discover_articles_platform_publish_time`
- `idx_discover_articles_field`
- `idx_discover_articles_views`
- `idx_discover_articles_title_gin`，建议全文检索

说明：

- 当前 `discover_articles` 仍作为首页发现文章样例库，用于打通筛选、分页、写作跳转和后续真实采集切片的统一契约。
- 当记录的 `source_url` 仍为内部占位地址时，API 层必须把该记录标记为 `is_sample=true`，并将响应里的 `source_url` 置空；不得回退为搜索页或伪装成原文页。
- 首页必须显式区分“样例文章”和“真实热榜快照”，避免把样例内容误判为实时采集结果。

### 7. `hot_topics`

热搜榜表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 热搜 ID |
| platform | varchar(32) | 来源平台：`weibo/baidu/toutiao` |
| rank_no | integer | 排名 |
| title | varchar(255) | 词条 |
| heat | bigint | 热度 |
| trend | varchar(16) | `up/down/stable` |
| field | varchar(32) | 领域 |
| snapshot_date | date | 榜单日期 |
| snapshot_at | timestamptz | 本次同步批次时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 最近一次同步入库时间 |

说明：
- `hot_topics` 以批次方式保存热榜快照，查询最新榜单时按最新 `snapshot_at` 读取。
- 运行时默认每 6 小时同步一次微博、百度、头条热榜，且支持手动触发刷新。
- 单次同步只追加新批次，不覆盖历史快照，便于审计和回溯。
- 热度低于 `10000` 的词条不计入热榜。
- 外部来源短时失败时，可回退到现有快照或 seed 数据，不阻断首页读取。
- `raw_json.source_url` 只保存真实详情页直链；若上游只提供搜索页或话题搜索入口，则返回空值而不是伪装成原文链接。
- `updated_at` 用于前端展示最近同步时间，也作为热榜同步审计的时间锚点。

### 8. `article_favorites`

用户收藏文章表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 主键 |
| user_id | varchar(32) | 用户 ID |
| article_id | varchar(32) | 爆款文章 ID |
| created_at | timestamptz | 创建时间 |

唯一约束：

- `uk_article_favorites_user_article (user_id, article_id)`

### 9. `prompt_categories`

提示词分类表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 分类 ID |
| user_id | varchar(32) | 用户 ID |
| name | varchar(64) | 分类名称 |
| sort_order | integer | 排序 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

唯一约束：

- `uk_prompt_categories_user_name (user_id, name)`

### 10. `prompts`

提示词表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 提示词 ID |
| user_id | varchar(32) | 用户 ID |
| category_id | varchar(32) null | 分类 ID |
| title | varchar(128) | 标题 |
| content | text | 提示词内容 |
| tags_json | jsonb | 标签数组 |
| status | varchar(32) | `draft/active/generating` |
| usage_count | integer | 使用次数 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_prompts_user_category_id`
- `idx_prompts_user_status`
- `idx_prompts_title_gin`

### 11. `writer_groups`

文章分组表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 分组 ID |
| user_id | varchar(32) | 用户 ID |
| name | varchar(64) | 分组名称 |
| sort_order | integer | 排序 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

唯一约束：

- `uk_writer_groups_user_name (user_id, name)`

### 12. `writer_articles`

文章表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 文章 ID |
| user_id | varchar(32) | 用户 ID |
| group_id | varchar(32) null | 分组 ID |
| prompt_id | varchar(32) null | 提示词 ID |
| source_article_id | varchar(32) null | 爆款文章 ID |
| title | varchar(255) | 标题 |
| ref_url | varchar(500) null | 参考链接 |
| image_count | integer | 图片数量 |
| word_count | integer | 字数 |
| status | varchar(32) | `draft/generating/completed/failed` |
| content_md | text | Markdown 正文 |
| summary | text null | 摘要，预留 |
| error_message | text null | 错误信息 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_writer_articles_user_group_id`
- `idx_writer_articles_user_status`
- `idx_writer_articles_updated_at`

### 13. `generate_tasks`

AI 生文任务表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 任务 ID |
| user_id | varchar(32) | 用户 ID |
| article_id | varchar(32) | 文章 ID |
| task_type | varchar(32) | `generate_article` |
| status | varchar(32) | `queued/running/succeeded/failed/cancelled` |
| model_name | varchar(64) null | 模型名称 |
| prompt_snapshot | text | 提示词快照 |
| input_payload | jsonb | 输入参数 |
| output_payload | jsonb | 输出摘要 |
| error_message | text null | 错误信息 |
| started_at | timestamptz null | 开始时间 |
| finished_at | timestamptz null | 结束时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_generate_tasks_user_status`
- `idx_generate_tasks_article_id`

### 14. `assets`

通用资源表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 资源 ID |
| user_id | varchar(32) | 用户 ID |
| asset_type | varchar(32) | `cover_image/content_image` |
| file_name | varchar(255) | 原文件名 |
| mime_type | varchar(128) | 文件类型 |
| file_size | integer | 文件大小 |
| storage_key | varchar(255) | 存储键 |
| public_url | varchar(500) | 访问地址 |
| created_at | timestamptz | 创建时间 |

### 15. `layout_drafts`

排版草稿表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 草稿 ID |
| user_id | varchar(32) | 用户 ID |
| article_id | varchar(32) null | 来源文章 ID |
| title | varchar(255) | 标题 |
| cover_asset_id | varchar(32) null | 封面资源 ID |
| content_md | text | Markdown 内容 |
| content_html | text | 渲染后的 HTML |
| theme_id | varchar(32) | 主题 ID |
| theme_color | varchar(16) | 主题色 |
| font_family | varchar(32) | 字体 |
| font_size | integer | 字号 |
| line_height | numeric(3,1) | 行距 |
| title_align | varchar(16) | 标题对齐 |
| para_indent | boolean | 是否首行缩进 |
| round_image | boolean | 是否圆角图片 |
| status | varchar(32) | `draft/published` |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_layout_drafts_user_id`
- `idx_layout_drafts_article_id`

### 16. `channels`

公众号表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 公众号 ID |
| user_id | varchar(32) | 用户 ID |
| platform | varchar(32) | `weixin` |
| channel_name | varchar(128) | 名称 |
| avatar_url | varchar(500) null | 头像 |
| followers_count | integer | 粉丝数 |
| articles_count | integer | 文章数 |
| status | varchar(32) | `authorized/expired/revoked` |
| auth_payload | jsonb | 授权信息 |
| last_synced_at | timestamptz null | 最近同步时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引：

- `idx_channels_user_id`
- `idx_channels_status`

### 17. `publish_records`

发布记录表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 发布记录 ID |
| user_id | varchar(32) | 用户 ID |
| channel_id | varchar(32) | 公众号 ID |
| article_id | varchar(32) null | 文章 ID |
| layout_draft_id | varchar(32) null | 排版稿 ID |
| title | varchar(255) | 发布标题 |
| status | varchar(32) | `queued/publishing/success/failed` |
| remote_article_id | varchar(128) null | 平台侧文章 ID |
| error_message | text null | 错误信息 |
| published_at | timestamptz null | 发布时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 18. `contact_messages`

联系表单表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | varchar(32) pk | 留言 ID |
| user_id | varchar(32) null | 用户 ID，匿名可空 |
| name | varchar(64) | 姓名 |
| email | varchar(128) | 邮箱 |
| type | varchar(32) | `feature/bug/business/account/other` |
| message | text | 留言内容 |
| status | varchar(32) | `new/processing/replied/closed` |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

## 7. 关键关系说明

- `users` 1:N `prompt_categories`
- `users` 1:N `prompts`
- `users` 1:N `writer_groups`
- `users` 1:N `writer_articles`
- `writer_articles` 1:N `generate_tasks`
- `writer_articles` 1:N `layout_drafts`
- `users` 1:N `channels`
- `channels` 1:N `publish_records`
- `plans` 1:N `subscriptions`
- `users` 1:N `orders`

## 8. MVP 落地建议

### 8.1 第一批必须建表

- `users`
- `plans`
- `subscriptions`
- `usage_counters`
- `discover_articles`
- `hot_topics`
- `prompt_categories`
- `prompts`
- `writer_groups`
- `writer_articles`
- `generate_tasks`
- `assets`
- `layout_drafts`
- `contact_messages`

### 8.2 第二批再建

- `article_favorites`
- `channels`
- `publish_records`
- `orders`

## 9. 与前端对接建议

### 9.1 需要优先修正的前端问题

- `writer` 页面目前没有读取爆款页跳转带来的查询参数，后端接口接入前应补齐。
- `/editor`、`/materials`、`/analytics`、`/publish` 等路径未注册，需明确保留还是移除。
- 排版页当前保存逻辑仅是本地 toast，需要切换为真实保存接口。
- 部分源码存在编码不一致问题，建议统一转为 UTF-8。

### 9.2 建议的对接顺序

1. 接入 `/api/v1/me`
2. 接入 `/api/v1/discover/articles` 和 `/api/v1/discover/hot-topics`
3. 接入提示词分类与提示词 CRUD
4. 接入文章列表、文章详情、生成任务
5. 接入排版草稿保存与渲染
6. 最后接入公众号与会员

## 10. 示例 OpenAPI 标签划分

- `system`
- `auth`
- `discover`
- `prompt-categories`
- `prompts`
- `writer-groups`
- `writer-articles`
- `generate-tasks`
- `layout`
- `assets`
- `channels`
- `billing`
- `contact`
