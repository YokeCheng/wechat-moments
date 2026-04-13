# Frontend Feature Inventory

## Scope

本清单基于当前 `frontend` 目录代码整理，覆盖：

- 已注册页面与路由
- 实际 HTTP 调用点
- mock 数据来源
- 前端已经具备的功能模块
- 从前端反推出的后端依赖

说明：

- “已实现”表示前端界面和本地交互已存在，不代表已经接入真实后端。
- 当前仓库存在部分中文编码异常，本文按代码逻辑理解功能。

## High-Level Summary

- 已注册一级页面 8 个：`/`、`/prompts`、`/writer`、`/layout`、`/channels`、`/vip`、`/tutorial`、`/contact`
- 存在 1 个未注册页面：`src/pages/editor/page.tsx`
- 当前真实 HTTP 请求已有 3 处：
  - 顶部导航开发登录 `POST /api/v1/auth/dev-login`
  - 顶部导航当前用户上下文 `GET /api/v1/me`
  - 联系页提交到外部 `readdy.ai`
- 核心业务页面数据仍几乎全部来自本地 mock 或页面内 mock
- 当前主链路已经形成：`每日爆款 -> 提示词 -> 智能生文 -> 一键排版`

## Registered Routes

来源：`frontend/src/router/config.tsx`

| Route | Page File | Current Data Source | Notes |
| --- | --- | --- | --- |
| `/` | `src/pages/home/page.tsx` | `src/mocks/articles.ts` | 爆款发现入口 |
| `/prompts` | `src/pages/prompts/page.tsx` | `src/mocks/prompts.ts` | 提示词库 |
| `/writer` | `src/pages/writer/page.tsx` | `/api/v1/writer/*` + `/api/v1/prompts` | 智能生文 |
| `/layout` | `src/pages/layout/page.tsx` | `/api/v1/layout/*` + `/api/v1/assets` + `articleId` 查询参数 | 一键排版 |
| `/channels` | `src/pages/channels/page.tsx` | 页面内 `mockChannels` | 公众号管理原型 |
| `/vip` | `src/pages/vip/page.tsx` | 页面内 `plans` | 会员中心原型 |
| `/tutorial` | `src/pages/tutorial/page.tsx` | 页面内静态数据 | 帮助文档 |
| `/contact` | `src/pages/contact/page.tsx` | 页面内静态数据 + 外部表单 API | 联系我们 |
| `*` | `src/pages/NotFound.tsx` | 无 | 404 页面 |

## Unregistered Or Unused UI

| File / Component | Current State | Notes |
| --- | --- | --- |
| `src/pages/editor/page.tsx` | 页面存在但未注册 | 首页创建入口会跳转 `/editor?platform=...`，当前会落到 404 |
| `src/pages/home/components/CreateEntrance.tsx` | 组件存在但未挂到首页 | 依赖未注册的 `/editor` |
| `src/pages/home/components/QuickTools.tsx` | 组件存在但未挂到首页 | 目标路径 `/materials`、`/analytics`、`/publish`、`/editor` 都未注册 |
| `src/pages/home/components/RecentPosts.tsx` | 未挂到已注册页面 | 依赖 `src/mocks/dashboard.ts` |
| `src/pages/home/components/PendingList.tsx` | 未挂到已注册页面 | 依赖 `src/mocks/dashboard.ts` |
| `src/pages/home/components/TrendChart.tsx` | 未挂到已注册页面 | 依赖 `src/mocks/dashboard.ts` |
| `src/pages/home/components/StatsCard.tsx` | 展示组件，未挂到已注册页面 | 配套 `dashboard.ts` |
| `src/components/feature/Sidebar.tsx` | 未挂载 | 看起来是旧版设计残留 |

## Actual HTTP / API Call Points

### Real Network Call

| File | Trigger | Method | Target | Purpose |
| --- | --- | --- | --- | --- |
| `src/components/feature/TopBar.tsx` | 页面加载时获取开发登录 token | `POST` | `/api/v1/auth/dev-login` | 开发环境最小身份注入 |
| `src/components/feature/TopBar.tsx` | 页面加载时获取当前用户摘要 | `GET` | `/api/v1/me` | 顶部导航读取真实用户上下文 |
| `src/pages/contact/page.tsx` | 提交联系表单 | `POST` | `https://readdy.ai/api/form/d7ac94n6e3lk97049p9g` | 提交用户留言 |

结论：当前前端已开始接入项目自有后端，但核心业务页面仍未脱离 mock。

### Browser / Local-Only Action Points

| File | Local Action | Meaning For Backend |
| --- | --- | --- |
| `src/pages/prompts/page.tsx` | `navigator.clipboard.writeText` | 后端不需复制接口，但需要返回完整提示词内容 |
| `src/pages/layout/page.tsx` | `navigator.clipboard.writeText` | 后端需要排版 HTML 渲染或持久化能力 |
| `src/pages/layout/page.tsx` | `input[type=file]` 上传封面图 | 已接通 `/api/v1/assets`，浏览器仍负责选择文件 |
| `src/pages/layout/page.tsx` | `useSearchParams` 读取 `content` | 生文页与排版页需要稳定的数据传递 |
| `src/pages/writer/page.tsx` | 轮询生成任务状态 | 已接通 `/api/v1/writer/generate-tasks` 与状态查询 |

## Mock Data Sources

| Mock File | Main Entities | Consumed By |
| --- | --- | --- |
| `src/mocks/articles.ts` | 爆款文章、热搜榜、筛选项 | 首页、热搜榜 |
| `src/mocks/prompts.ts` | 提示词分类、提示词 | 提示词库、智能生文、仿写弹窗 |
| `src/mocks/writerArticles.ts` | 文章分组、文章草稿 | 智能生文页 |
| `src/mocks/dashboard.ts` | 趋势图、待发布、近期内容 | 目前未接入的首页组件 |
| `src/mocks/editor.ts` | 平台模板、草稿 | 未注册的 editor 页面 |

## Feature Inventory By Module

### 1. Global Layout / Navigation

前端已有：

- 顶部导航
- 顶部“智能生文” CTA
- 用户下拉菜单 UI
- 基于真实 `/api/v1/me` 的当前用户展示

后端依赖：

- 当前用户信息
- 登录态
- 收藏列表 / 账号设置等后续入口

### 2. Home / 每日爆款

前端已有：

- Tab：公众号爆款 / 头条号爆款 / 今日热搜榜
- 搜索
- 分类筛选
- 时间筛选 UI
- 阅读量筛选
- 列表展示：领域、日期、账号、标题、阅读、点赞、分享
- 操作：收藏、提示词、仿写
- 热搜榜展示排名、热度、趋势

后端依赖：

- 爆款文章分页查询
- 热搜榜查询
- 收藏接口
- 基于文章生成提示词
- 基于文章发起仿写
- 导出接口

当前缺口：

- 时间筛选只有 UI，没有真实过滤逻辑
- 收藏只有本地状态
- 导出按钮没有真实能力

### 3. Prompts / 提示词库

前端已有：

- 分类列表
- 新建分类
- 删除分类
- 编辑分类弹窗
- 搜索提示词
- 新建提示词
- 查看详情
- 复制提示词
- 启用 / 停用
- 删除提示词

后端依赖：

- 分类 CRUD
- 提示词 CRUD
- 提示词状态切换
- 提示词详情
- 使用次数统计

当前缺口：

- 编辑分类弹窗没有真正保存
- “立即生文”按钮没有接通生文流程

### 4. Writer / 智能生文

前端已有：

- 文章分组管理
- 文章列表
- 搜索文章
- 一键生文弹窗
- 选择提示词、分组、参考链接、图片数量
- 本地模拟生成过程
- 编辑文章元信息
- 删除文章
- 已完成文章跳转排版页

后端依赖：

- 分组 CRUD
- 文章列表 / 详情 / 更新 / 删除
- 生文任务创建
- 生文任务状态查询

当前缺口：

- 生成逻辑完全由本地 `setTimeout` 模拟
- 页面没有读取从爆款页传来的 `title/promptId/ref` 查询参数

### 5. Layout / 一键排版

前端已有：

- Markdown 编辑
- Markdown 工具栏
- 标题与封面设置
- 主题 / 颜色 / 字体 / 行高 / 对齐 / 缩进等排版选项
- 多设备预览
- 全屏预览
- 复制排版 HTML
- 保存成功 toast

后端依赖：

- 排版草稿保存
- 排版草稿读取 / 更新 / 删除
- 资源上传
- Markdown 渲染 HTML

当前缺口：

- “保存”只是本地提示
- 图片没有上传到服务器
- HTML 只在前端本地生成

### 6. Channels / 公众号管理

前端已有：

- 已授权公众号卡片展示
- 授权公众号按钮
- 授权二维码弹窗
- 发布文章按钮
- 查看数据按钮
- 删除按钮

后端依赖：

- 公众号列表
- 授权发起与回调
- 发布接口
- 发布记录
- 解绑接口

当前缺口：

- 完全是页面内 mock

### 7. VIP / 会员中心

前端已有：

- 套餐卡片
- 当前用户状态展示
- 支付二维码弹窗

后端依赖：

- 套餐列表
- 当前订阅状态
- 订单创建
- 订单查询
- 使用量统计

当前缺口：

- 所有支付流程都是静态原型

### 8. Tutorial / 使用教程

前端已有：

- 四步上手
- 视频演示静态内容
- 内嵌需求说明

后端依赖：

- 当前不强依赖后端

### 9. Contact / 联系我们

前端已有：

- 联系方式展示
- 留言表单
- 表单校验
- 提交中状态
- 提交成功状态

后端依赖：

- 项目自有联系表单接口

当前缺口：

- 当前发往外部 `readdy.ai`，不是项目后端

## Inferred Backend Interface Surface

详细接口草稿见 `backend/docs/backend_spec.yaml`。

核心范围：

- 用户信息：`GET /api/v1/me`
- 发现页：爆款列表、热搜榜、收藏、基于文章生成提示词
- 提示词库：分类 CRUD、提示词 CRUD
- 智能生文：分组 CRUD、文章 CRUD、生成任务
- 一键排版：渲染、草稿 CRUD、资源上传
- 公众号：授权、列表、发布、发布记录
- 会员：套餐、订阅、订单、用量
- 联系我们：留言提交

## 2026-04-13 状态更新

- `/writer` 主路径已完成真实联调：分组列表、文章列表、文章编辑、文章删除、生成任务创建与轮询均走后端接口。
- `/writer` 已支持承接上游参数：`promptId`、`title`、`ref`、`articleId`，并默认每页 10 条，支持 `10/20/50/100` 档位。
- `/writer` 主路径已脱离 `src/mocks/writerArticles.ts`，本地 `setTimeout` 生成逻辑已退役。
- `/layout` 已接通真实排版链路：HTML 渲染、草稿创建、草稿更新、封面上传、封面静态访问均可用。
- `/layout` 已补上“最近草稿/恢复入口”，当前主要剩余缺口是封面直读细节和正文资源上传工作台，因此能力状态仍应记为“最小闭环已完成，完整工作台仍在推进”。
- 首页热榜已切换为微博、百度、头条三源聚合读取；应用启动后会先同步一次，随后每 6 小时增量写入一批新快照。
- 热榜项现在带有来源平台标识；当单个平台抓取失败时，会优先回退到上一份快照，必要时再回退到 seed，不阻断首页展示。
- 首页热榜补充了最近同步时间和手动刷新入口，便于直接判断当前快照是否滞后。
- 首页热榜标题现在只在拿到真实详情页直链时才允许跳转，不再把搜索页伪装成原文。
- 首页发现文章已切到真实搜索索引同步；仅在某平台尚无 live 数据时才允许回退样例，并且必须显式标识。
- 发现文章列表不再把平台搜索页伪装成原文；微信无稳定原文时显示“无原文”，头条优先返回真实详情页链接。
- 顶部导航将收敛到当前真正可交付的主链路页面，未完成的 P1/P2 原型不再作为默认主导航入口暴露。

## 已知集成风险

- `/editor` 页面与部分快捷工具路径未注册
- `LayoutPage` 已接通真实草稿持久化，但恢复草稿时仍缺少封面资源直读能力
- 多个源码文件存在编码异常，联调前建议统一 UTF-8
- 微信搜索结果受反爬限制，首页微信文章区目前只能稳定展示真实索引结果，无法承诺稳定原文直链
- 头条文章字段相关性依赖其公开搜索结果质量，个别分类可能出现噪声内容，但数据已来自真实搜索而非本地 mock
## 2026-04-09 P0-02 更新

- 路由 `/` 已接入 `GET /api/v1/discover/articles` 与 `GET /api/v1/discover/hot-topics`。
- 首页主路径不再从 `src/mocks/articles.ts` 读取主数据。
- 首页已显式覆盖 `loading / empty / error / success` 四态。
- 收藏与导出仍属于后续切片，不计入当前 `P0-02` 完成范围。
- 已移除未注册的 `src/pages/editor/page.tsx` 原型、首页专用实验组件，以及孤立的 `src/mocks/editor.ts` / `src/mocks/dashboard.ts`。

## 2026-04-10 Discover UI 更新

- 顶部导航已提供 `中文 / EN` 语言切换，前端默认中文。
- 当前双语覆盖范围包括全局导航和首页发现页主界面。
- 首页文章列表与热搜列表默认每页 `10` 条，并支持 `10 / 20 / 50 / 100` 档位。
- 页大小切换继续沿用 discover 契约，并向后端传递 `page_size`。

## 2026-04-13 Discover Article Sync 更新

- 首页发现文章已完成 `P0-02B Discover Article Sync` 最小闭环：应用启动自动同步、后台每 6 小时定时同步、首页支持手动刷新。
- `GET /api/v1/discover/articles` 已返回 `synced_at`，`POST /api/v1/discover/articles` 可立即触发一次真实同步。
- `discover_articles.collected_at` 已落库，用作 live 数据时间锚点；首页文章区已展示最近同步时间。
- 微信文章现在来自真实搜索索引，若拿不到稳定原文直链则返回 `source_url = null`，不再伪装搜索页。
- 头条文章现在来自真实搜索结果，优先返回可用详情页链接；当平台已有 live 数据时，首页不再混入该平台样例数据。

## 2026-04-10 P0-03 提示词库更新

- Route `/prompts` now reads real backend data from `GET /api/v1/prompt-categories` and `GET /api/v1/prompts`.
- The primary `/prompts` path no longer depends on `src/mocks/prompts.ts`.
- Prompt library actions now use backend CRUD for category create/update/delete and prompt create/update/delete.
- Prompt page states now explicitly cover loading, empty, error, and success.
- Prompt page now defaults to `10` items per page and allows `10 / 20 / 50 / 100`.
- Prompt page text now participates in the same Chinese/English language toggle as the top bar.
