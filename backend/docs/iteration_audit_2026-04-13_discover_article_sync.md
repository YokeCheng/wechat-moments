# 2026-04-13 Discover Article Sync 审计

## 1. 审计范围

- Slice：`P0-02 Discover Read`
- 子切片：`P0-02B Discover Article Sync`
- 路由：`/`
- 契约：
  - `GET /api/v1/discover/articles`
  - `POST /api/v1/discover/articles`

## 2. 本轮关闭的问题

- 首页发现文章不再停留在后端样例库，已切到真实搜索索引同步。
- 首页文章区已展示最近同步时间，并支持手动刷新。
- `discover_articles` 已增加 `collected_at`，前后端统一用它表达 live 数据 freshness。
- 当平台已有 live 数据时，首页不再混入该平台样例行。
- 微信来源无法稳定拿到原文时，接口返回 `source_url = null`，不再伪装成搜索页或假原文。

## 3. 代码证据

- 同步服务：`backend/app/services/discover_article_sync_service.py`
- 定时 worker：`backend/app/workers/discover_article_sync_worker.py`
- API：`backend/app/api/v1/endpoints/discover.py`
- 查询策略：`backend/app/repo/discover_repo.py`
- 运行时迁移：`backend/app/db/runtime_migrations.py`
- 前端联调：
  - `frontend/src/lib/discover.ts`
  - `frontend/src/pages/home/page.tsx`
  - `frontend/src/pages/home/components/DiscoverArticleTable.tsx`

## 4. 验证结果

- 后端测试：
  - `python -m pytest backend/tests -q`
  - 结果：`26 passed`
- 前端校验：
  - `npm run type-check`
  - `npm run build`
  - 结果：通过
- 运行态接口验证：
  - `POST /api/v1/discover/articles` 返回 `200`
  - 本次实测刷新结果：`total = 79`
  - `GET /api/v1/discover/articles?platform=toutiao&page=1&page_size=10` 返回 live 数据与 `synced_at`
  - `GET /api/v1/discover/articles?platform=weixin&page=1&page_size=10` 返回 live 数据与 `synced_at`

## 5. 残余限制

- 微信搜索结果当前只能稳定拿到真实索引信息，无法承诺稳定原文直链。
- 头条公开搜索结果的内容质量波动较大，个别分类会出现噪声文章；当前策略已经保证“真实来源优先”，但还不能保证“平台分类绝对纯净”。
- `favorite`、`derive-prompt` 等后续动作仍不属于本轮 `P0-02B` 完成范围。

## 6. 审计结论

- `P0-02B Discover Article Sync`：`done`
- `P0-02 Discover Read`：`done`
- 当前首页 discover 主路径已经达到“真实数据接入 + freshness 可见 + 刷新可用 + 样例回退受控”的最小闭环标准
