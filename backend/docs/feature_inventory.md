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
| `/writer` | `src/pages/writer/page.tsx` | `src/mocks/writerArticles.ts`, `src/mocks/prompts.ts` | 智能生文 |
| `/layout` | `src/pages/layout/page.tsx` | URL 参数 + 本地状态 | 一键排版 |
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
| `src/pages/layout/page.tsx` | `FileReader` 读取本地封面图 | 后端需要文件上传接口 |
| `src/pages/layout/page.tsx` | `useSearchParams` 读取 `content` | 生文页与排版页需要稳定的数据传递 |
| `src/pages/writer/page.tsx` | `setTimeout` 模拟异步生成 | 后端需要生成任务接口和状态查询 |

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

## Known Integration Risks

- `/editor` 页面与部分快捷工具路径未注册
- `WriterPage` 未读取 URL 预填参数
- `LayoutPage` 没有真实持久化
- 多个源码文件存在编码异常，联调前建议统一 UTF-8
## 2026-04-09 P0-02 Update

- Route `/` now reads real backend data from `GET /api/v1/discover/articles` and `GET /api/v1/discover/hot-topics`.
- The primary homepage path no longer imports `src/mocks/articles.ts`.
- Homepage states now explicitly cover loading, empty, error, and success.
- Favorite and export remain follow-up work and are not counted as part of `P0-02`.
- Removed the unregistered `src/pages/editor/page.tsx` prototype, unused home-only experiment components, and the orphaned `src/mocks/editor.ts` / `src/mocks/dashboard.ts` files.
