# 切片注册表

## 1. 目的

本文件将“爆了么”平台拆分成一组可执行的纵向切片（Slice），作为开发和验收的基本单位。

规则：

- 任何开发任务都必须映射到至少一个 Slice
- 任何 Slice 的完成都必须有接口、数据、页面和验收标准
- 没有登记到本文件的能力，不应默认进入开发

状态定义：

- `planned`：已定义，未开始
- `in_progress`：进行中
- `blocked`：存在阻塞
- `done`：达到完成定义
- `deferred`：推迟到后续阶段

## 2. 治理切片

### G0-01 Harness Execution Foundation

- status: `done`
- goal: 将 Harness 文档蓝图落为可执行脚本与最小 CI 入口
- user_value: Agent 和人工提交在进入主链路实现前就能被基础门禁拦截
- frontend_routes:
  - none
- backend_endpoints:
  - none
- data_entities:
  - none
- dependencies: none
- acceptance:
  - `tools/harness` 提供 required docs、OpenAPI 解析、切片接口覆盖、死路由与关键 mock 路径检查
  - `.github/workflows` 提供最小文档完整性与漂移完整性 workflow
  - `traceability_matrix.md` 已登记该治理切片

`G0-01` 额外交付的治理资产：

- root `PROJECT_CONSENSUS.md`
- `tools/dev/start_live_preview.ps1`
- `tools/dev/stop_live_preview.ps1`

### G0-02 LAN Infra Foundation

- status: `done`
- goal: 为 P0 主链路准备可在局域网服务器启动的最小基础设施编排
- user_value: 团队可以先独立启动 PostgreSQL、Redis、对象存储和管理面板，再继续推进真实联调
- frontend_routes:
  - none
- backend_endpoints:
  - none
- data_entities:
  - none
- dependencies:
  - `G0-01`
- acceptance:
  - 仓库根目录提供 `docker-compose.infra.yml`
  - 仓库根目录提供 `.env.lan.example`
  - 默认面向局域网地址 `172.16.10.191`
  - 基础设施覆盖 PostgreSQL / Redis / MinIO / pgAdmin

### G0-03 Frontend Language Foundation

- status: `done`
- goal: 为全局导航与首页发现建立可持续扩展的中英双语切换基础
- user_value: 用户可在中文与英文界面之间切换，首页与导航不再依赖单语言硬编码
- frontend_routes:
  - global navigation
  - `/`
- backend_endpoints:
  - none
- data_entities:
  - none
- dependencies:
  - `G0-01`
  - `P0-02`
- acceptance:
  - 前端默认语言为中文，并支持切换为英文
  - 顶部导航提供语言切换入口
  - 首页发现页与全局导航主要文案改为 i18n 资源驱动
  - 语言切换不改变 discover 接口契约与后端字段值

## 3. P0 切片

### P0-01 Auth And Current User

- status: `done`
- goal: 为所有用户私有数据提供身份与权益上下文
- user_value: 页面可以识别当前用户、当前套餐和用量摘要
- frontend_routes:
  - global navigation
- backend_endpoints:
  - `POST /api/v1/auth/dev-login`
  - `GET /api/v1/me`
- data_entities:
  - `users`
  - `subscriptions`
  - `usage_counters`
- dependencies: none
- acceptance:
  - 开发环境可通过最小身份注入拿到 bearer token
  - 可返回当前用户基本信息
  - 可返回当前套餐和用量摘要
  - 全局导航已接入真实当前用户上下文

### P0-02 Discover Read

- status: `in_progress`
- goal: 首页通过统一 discover 契约承载发现文章与热榜，其中热榜真实同步，发现文章暂以样例库承载筛选与写作跳转骨架
- user_value: 用户能在首页使用真实热榜和稳定的发现入口，同时不会再被样例文章伪装成实时原文
- frontend_routes:
  - `/`
- backend_endpoints:
  - `GET /api/v1/discover/articles`
  - `GET /api/v1/discover/hot-topics`
- data_entities:
  - `discover_articles`
  - `hot_topics`
- dependencies:
  - `P0-01`
- acceptance:
  - 首页文章列表来自统一 discover 接口，而不是前端 mock 文件
  - 热搜榜来自真实接口
  - 发现文章若仍为样例库，页面必须显式标识，且不得伪装成真实原文
  - 首页文章与热搜列表默认每页 10 条，并支持 10 / 20 / 50 / 100 档位切换
  - 页面有 loading / empty / error / success 状态
  - `articles.ts` 不再作为主数据源

### P0-02A Hot Topic Sync

- status: `done`
- goal: 让热榜数据从静态 seed 升级为真实多源定时同步
- user_value: 用户打开首页热榜时，能看到来自微博、百度、头条的最新真实词条，而不是固定 mock
- frontend_routes:
  - `/`
- backend_endpoints:
  - `GET /api/v1/discover/hot-topics`
- data_entities:
  - `hot_topics`
- dependencies:
  - `P0-02`
- acceptance:
  - 应用启动后会执行一次热榜同步
  - 后台每 6 小时刷新一次热榜快照
  - 热榜快照按批次增量入库，不覆盖历史批次
  - 同步源至少覆盖微博、百度、头条三个来源
  - 热度低于 `10000` 的词条不计入热榜
  - 单个来源抓取失败不会导致首页热榜接口不可用
  - 首页热榜列表可区分来源平台
  - 首页可展示最近同步时间，并支持手动触发刷新
  - 热榜标题只能跳转到真实详情页；无法拿到直达链接时不得伪装成搜索页

### P0-03 Prompt Library CRUD

- status: `done`
- goal: 提示词库从 mock 变为真实管理系统
- user_value: 用户可以创建、筛选、查看、编辑、删除提示词及分类
- frontend_routes:
  - `/prompts`
- backend_endpoints:
  - `GET /api/v1/prompt-categories`
  - `POST /api/v1/prompt-categories`
  - `PATCH /api/v1/prompt-categories/{categoryId}`
  - `DELETE /api/v1/prompt-categories/{categoryId}`
  - `GET /api/v1/prompts`
  - `POST /api/v1/prompts`
  - `GET /api/v1/prompts/{promptId}`
  - `PATCH /api/v1/prompts/{promptId}`
  - `DELETE /api/v1/prompts/{promptId}`
- data_entities:
  - `prompt_categories`
  - `prompts`
- dependencies:
  - `P0-01`
- acceptance:
  - 分类和提示词支持真实 CRUD
  - 搜索和分类筛选可用
  - 提示词状态可启停
  - `prompts.ts` 不再作为主数据源

  - 页面覆盖 loading / empty / error / success 四态
  - `/prompts` 默认每页 10 条，并支持 10 / 20 / 50 / 100 档位
  - `/prompts` 页面主要文案已接入中英双语资源

### P0-04 Writer Workspace

- status: `done`
- goal: 智能生文页具备真实分组和文章管理能力
- user_value: 用户可以管理文章分组、文章草稿和元信息
- frontend_routes:
  - `/writer`
- backend_endpoints:
  - `GET /api/v1/writer/groups`
  - `POST /api/v1/writer/groups`
  - `DELETE /api/v1/writer/groups/{groupId}`
  - `GET /api/v1/writer/articles`
  - `POST /api/v1/writer/articles`
  - `GET /api/v1/writer/articles/{articleId}`
  - `PATCH /api/v1/writer/articles/{articleId}`
  - `DELETE /api/v1/writer/articles/{articleId}`
- data_entities:
  - `writer_groups`
  - `writer_articles`
- dependencies:
  - `P0-01`
  - `P0-03`
- acceptance:
  - 分组管理使用真实接口
  - 文章列表与详情使用真实接口
  - 页面可接收上游预填参数
  - `writerArticles.ts` 不再作为主数据源

### P0-05 Generate Task

- status: `done`
- goal: 让“开始生成”成为真实异步任务
- user_value: 用户能创建生成任务并看到真实状态
- frontend_routes:
  - `/writer`
- backend_endpoints:
  - `POST /api/v1/writer/generate-tasks`
  - `GET /api/v1/writer/generate-tasks/{taskId}`
- data_entities:
  - `generate_tasks`
  - `writer_articles`
- dependencies:
  - `P0-04`
- acceptance:
  - 开始生成创建真实任务
  - 页面可查询任务状态
  - 成功后文章状态从 `generating` 变为 `completed`
  - 失败后可显示错误信息

### P0-06 Layout Workspace

- status: `in_progress`
- goal: 一键排版页具备真实保存和恢复能力
- user_value: 用户能保存排版稿并继续编辑
- frontend_routes:
  - `/layout`
- backend_endpoints:
  - `POST /api/v1/layout/render`
  - `GET /api/v1/layout/drafts`
  - `POST /api/v1/layout/drafts`
  - `GET /api/v1/layout/drafts/{draftId}`
  - `PATCH /api/v1/layout/drafts/{draftId}`
  - `DELETE /api/v1/layout/drafts/{draftId}`
- data_entities:
  - `layout_drafts`
- dependencies:
  - `P0-04`
- acceptance:
  - 排版草稿可保存和恢复
  - 渲染接口可返回 HTML
  - 页面保存不再只是 toast

### P0-07 Asset Upload

- status: `in_progress`
- goal: 封面和正文资源可真实上传
- user_value: 用户上传的封面图不再只存在浏览器内存
- frontend_routes:
  - `/layout`
- backend_endpoints:
  - `POST /api/v1/assets`
- data_entities:
  - `assets`
- dependencies:
  - `P0-06`
- acceptance:
  - 封面图可上传并返回资产 ID / URL
  - 排版草稿能引用上传资源

## 4. P1 切片

### P1-01 Discover Favorite And Export

- status: `planned`
- goal: 提供收藏和导出能力
- frontend_routes:
  - `/`
- backend_endpoints:
  - `POST /api/v1/discover/articles/{articleId}/favorite`
  - `DELETE /api/v1/discover/articles/{articleId}/favorite`
- data_entities:
  - `article_favorites`
- dependencies:
  - `P0-02`
- acceptance:
  - 收藏能持久化
  - 页面状态刷新后可恢复收藏状态

### P1-02 Contact Internalization

- status: `planned`
- goal: 联系表单迁移到项目自有后端
- frontend_routes:
  - `/contact`
- backend_endpoints:
  - `POST /api/v1/contact/messages`
- data_entities:
  - `contact_messages`
- dependencies: none
- acceptance:
  - 不再依赖 `readdy.ai`
  - 表单提交有真实入库

### P1-03 Channel Authorization

- status: `planned`
- goal: 公众号管理页从 mock 变为真实授权体系
- frontend_routes:
  - `/channels`
- backend_endpoints:
  - `GET /api/v1/channels`
  - `POST /api/v1/channels/authorize`
  - `DELETE /api/v1/channels/{channelId}`
- data_entities:
  - `channels`
- dependencies:
  - `P0-01`
- acceptance:
  - 公众号列表来自真实接口
  - 授权流程可启动
  - 解绑流程可用

### P1-04 Publish Workflow

- status: `planned`
- goal: 文章可以从平台发起发布
- frontend_routes:
  - `/channels`
- backend_endpoints:
  - `POST /api/v1/channels/{channelId}/publish`
  - `GET /api/v1/channels/{channelId}/publish-records`
- data_entities:
  - `publish_records`
- dependencies:
  - `P1-03`
  - `P0-06`
- acceptance:
  - 发布动作创建真实记录
  - 可查看发布历史状态

### P1-05 Billing And Subscription

- status: `planned`
- goal: 会员中心具备真实套餐、订单和用量控制
- frontend_routes:
  - `/vip`
- backend_endpoints:
  - `GET /api/v1/billing/plans`
  - `GET /api/v1/billing/subscription`
  - `POST /api/v1/billing/orders`
  - `GET /api/v1/billing/orders/{orderId}`
  - `GET /api/v1/billing/usage`
- data_entities:
  - `plans`
  - `subscriptions`
  - `orders`
  - `usage_counters`
- dependencies:
  - `P0-01`
- acceptance:
  - 套餐来自真实接口
  - 当前订阅状态可查询
  - 订单可创建
  - 用量可展示

## 5. P2 切片

### P2-01 Tutorial CMS

- status: `deferred`
- goal: 将教程内容从前端静态内嵌迁移为可管理内容

### P2-02 Editor Consolidation

- status: `deferred`
- goal: 对 `editor/page.tsx` 做明确决策：保留、合并或下线

### P2-03 Dashboard Realization

- status: `deferred`
- goal: 将 `dashboard.ts` 对应能力接入真实数据源

## 6. 推荐执行顺序

推荐按以下顺序推进：

1. `P0-01`
2. `P0-02`
3. `P0-03`
4. `P0-04`
5. `P0-05`
6. `P0-06`
7. `P0-07`
8. `P1-02`
9. `P1-03`
10. `P1-04`
11. `P1-05`

原因：

- 先闭环主内容生产链路
- 再接入联系、发布和商业化

## 7. 完成规则

任何 Slice 只有在以下条件同时满足时，才允许把 `status` 改为 `done`：

- 接口已存在于 `backend_spec.yaml`
- 数据实体已存在于设计文档
- 页面已使用真实接口
- 对应关键 mock 已退役或降级为测试 fixture
- 至少一条主路径验收通过
