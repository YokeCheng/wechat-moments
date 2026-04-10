# Doc Gardening Protocol

## 1. Purpose

本文档定义本项目的文档园艺协议，用来持续治理文档漂移。
目标不是做一次性整理，而是把文档维护变成和编码同频的小额持续偿还机制。

## 2. Why This Matters

在 Harness Engineering 里，文档不是附属品，而是：

- Slice 路由入口
- 契约来源
- 架构边界来源
- Gate 判定依据

一旦文档漂移，Agent 就会基于过期信息继续生成错误实现，导致错误被自动放大。

## 3. Documents In Gardening Scope

以下文件属于必须维护的核心园艺对象：

- `AGENTS.md`
- `backend/docs/prd.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/platform_harness.md`
- `backend/docs/slice_registry.md`
- `backend/docs/traceability_matrix.md`
- `backend/docs/release_gates.md`
- `backend/docs/ci_checks.md`
- `backend/docs/doc_drift_scanner_plan.md`
- `backend/docs/agent_operating_protocol.md`

## 4. Drift Types

文档园艺主要处理 5 类漂移：

- `scope drift`
  - PRD 与真实优先级不一致
- `contract drift`
  - spec 与页面/实现不一致
- `data drift`
  - 实体设计与真实状态流不一致
- `feature drift`
  - feature inventory 与前端现状不一致
- `process drift`
  - gate、CI、Agent 协议与当前开发方式不一致

## 5. Required Gardening Triggers

出现以下任一情况时，必须触发文档园艺：

- 新增或修改接口
- 新增或修改实体
- 某个 Slice 状态变化
- 某个页面从 mock 切到真实接口
- 发现未注册页面、死路由或原型孤岛
- 发现 CI 规则、Gate 规则或 Agent 协议已失效

## 6. Gardening Cadence

## 6.1 On Every Task

每次任务结束后，至少检查：

- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/slice_registry.md`

只要其中任一文件已被当前任务事实改变，就应同步更新。

## 6.2 On Every Slice

每个 Slice 达到新阶段时，至少检查：

- `backend/docs/release_gates.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/ci_checks.md`

## 6.3 On Every Milestone

每个 P0/P1/P2 阶段收口前，至少检查：

- 当前 P 级 Slice 是否与 PRD 对齐
- 主链路 mock 是否仍存在
- Gate 描述是否与实际验收方式一致
- `AGENTS.md` 是否仍能正确路由任务

## 7. File-Specific Gardening Rules

## 7.1 AGENTS.md

仅保留稳定入口信息。
如果内容已经变成大而全说明书，应拆分到专门文档。

## 7.2 prd.md

只维护产品范围、优先级和业务边界。
不应塞入实现细节。

## 7.3 feature_inventory.md

必须如实反映前端现状：

- 已注册页面
- 未注册页面
- mock 来源
- 真实接口缺口
- 原型状态

## 7.4 backend_spec.yaml

接口字段、状态语义、路径和方法必须保持权威。
如页面依赖字段变化，优先回写 spec。

## 7.5 backend_design.md

实体、关系、状态机、索引策略应与真实实现一致。
如果只是页面效果变化，不应误改数据设计文档。

## 7.6 slice_registry.md

必须真实记录：

- Slice 是否存在
- 优先级
- 依赖关系
- 当前状态
- 验收口径

## 8. Gardening Workflow

推荐固定流程：

1. 识别变更属于哪个 Slice
2. 判断影响的是 scope、contract、data、feature 还是 process
3. 更新最小必要文档
4. 检查是否存在关联镜像文档需要同步
5. 在任务总结中明确指出已更新哪些文档

## 9. Doc-Gardening Agent Charter

如果未来为本仓库配置专门的文档园丁 Agent，其职责应包括：

- 扫描实现与 spec 漂移
- 扫描前端路由与 feature inventory 漂移
- 扫描 mock 退休状态
- 扫描 `AGENTS.md` 是否仍可路由任务
- 提交最小必要的文档修正 PR

该 Agent 不负责改业务代码，重点在于降低上下文腐烂风险。

## 10. Failure Output Format

建议文档漂移反馈统一为：

```text
Issue:
Drift type:
Why it matters:
How to fix:
Affected document:
Affected slice:
```

示例：

```text
Issue: Prompt page still uses fields not present in backend_spec.yaml
Drift type: contract drift
Why it matters: frontend-backend alignment has no single source of truth.
How to fix: update backend_spec.yaml or remove undocumented fields from page integration.
Affected document: backend/docs/backend_spec.yaml
Affected slice: P0-03 Prompt Library CRUD
```

## 11. Current Priority Gardening Targets

结合当前仓库现状，优先治理以下漂移源：

- `frontend/src/mocks/articles.ts`
- `frontend/src/mocks/prompts.ts`
- `frontend/src/mocks/writerArticles.ts`
- 未注册跳转目标 `/editor`
- 未注册跳转目标 `/materials`
- 未注册跳转目标 `/analytics`
- 未注册跳转目标 `/publish`

## 12. Bottom Line

文档园艺不是“补文档”，而是持续修正 Agent 的工作镜像。
如果代码变了、契约变了、主链路变了，而文档没变，那么 Harness 就已经开始失效。
