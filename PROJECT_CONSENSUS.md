# 项目共识

## 1. 仓库定位

本仓库是“爆了么”平台的执行仓库。
它不是零散页面或演示 API 的拼装集合。

平台沿一条主链路推进：

`发现 -> 提示词 -> 生文 -> 排版 -> 发布 / 商业化`

所有功能、清理、重构或缺陷修复，都必须映射回这条主链路。

## 2. 本仓库中的 Harness Engineering

这里的 Harness Engineering 不是抽象概念，而是一套具体执行系统。
它通过五个引擎协同落地：

- `Context Engine`
  - 将工作路由到正确的切片，只加载最小必要上下文
- `Constraint Engine`
  - 强制实现遵守已定义的契约、数据设计与架构边界
- `Feedback Engine`
  - 通过测试、检查、评审与 CI 持续纠偏
- `Entropy Engine`
  - 主动清理 mock、死路由、陈旧文档、重复状态与运行时垃圾
- `Gate Engine`
  - 判断某个切片是否真正达到完成标准

主要参考资料：

- `AGENTS.md`
- `backend/docs/platform_harness.md`
- `backend/docs/harness_engines_map.md`
- `backend/docs/agent_operating_protocol.md`
- `backend/docs/slice_registry.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/traceability_matrix.md`

## 3. 硬约束

- 必须先定义 `Slice`，再开始写代码。
- 任何后端契约变更前，必须先更新 `backend/docs/backend_spec.yaml`。
- 任何实体或状态流变更前，必须先更新 `backend/docs/backend_design.md`。
- 只有 mock 的行为不能视为完成。
- 不允许跳过优先级顺序，P0 主链路闭环先于 P1/P2 扩展功能。
- 切片关闭后，必须同步文档。
- 禁止制造隐式约定，字段、状态与错误语义必须可在文档中定位。

## 4. 当前共享状态

已完成的治理与基础设施切片：

- `G0-01 Harness Execution Foundation`
- `G0-02 LAN Infra Foundation`

已完成的 P0 切片：

- `P0-01 Auth And Current User`
- `P0-02 Discover Read`

主链路中仍待完成的切片：

- `P0-03 Prompt Library CRUD`
- `P0-04 Writer Workspace`
- `P0-05 Generate Task`
- `P0-06 Layout Workspace`
- `P0-07 Asset Upload`

当前整体状态：

`Harness 基座已经就位，前两个 P0 切片已接入真实能力，完整主链路仍在持续建设中。`

## 5. 运行时基础设施约定

代码在本机工作站运行。
核心基础设施部署在 `172.16.10.191`。

当前真实运行时预期如下：

- 后端应用：本机进程
- 前端应用：本机进程
- PostgreSQL：`172.16.10.191:5432`
- Redis：`172.16.10.191:6379`
- MinIO：`172.16.10.191:9000`

## 6. SQLite 边界

`SQLite 在本仓库中仅允许用于测试。`

这意味着：

- SQLite 仅可用于自动化测试和临时测试夹具。
- SQLite 不可作为本地、局域网、预发布或生产环境的运行时数据库。
- 运行时数据库连接必须使用 PostgreSQL。

这条边界同时由文档和后端配置共同约束。

## 7. 本机实时预览约定

首选开发预览模式为本机热更新：

- 前端开发服务器：`http://127.0.0.1:3000`
- 后端开发服务器：`http://127.0.0.1:8000`
- 开发模式下，前端请求通过代理转发到本机后端

已提交的辅助脚本：

- `tools/dev/start_live_preview.ps1`
- `tools/dev/stop_live_preview.ps1`

这些脚本会把日志和 PID 文件统一放到 `.runtime/`，避免污染仓库根目录。

## 8. 完成定义

默认情况下，“完成”至少同时满足以下条件：

- 任务在 PRD 范围内
- 切片已登记
- 契约已定义
- 必要时数据设计已定义
- 代码实现已落地
- 验证或测试已运行
- 文档已同步
- 关键链路不再依赖被替换的 mock

## 9. 底线共识

项目共享共识如下：

`我们要建设的是一个受 Harness 驱动、按切片推进、可验证的平台系统，而不是堆叠彼此割裂的界面碎片。`
