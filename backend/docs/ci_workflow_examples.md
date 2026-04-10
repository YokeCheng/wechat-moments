# CI Workflow Examples

## 1. Purpose

本文档提供 Harness Engineering 在 CI 中的推荐 workflow 示例。
当前仓库已经落地首批 workflow 和 `tools/harness/` 脚本；本文件既记录现状，也保留后续扩展蓝图。

当前已实现：

- `.github/workflows/doc-integrity.yml`
- `.github/workflows/drift-integrity.yml`
- `tools/harness/check_required_docs.py`
- `tools/harness/parse_openapi.py`
- `tools/harness/check_doc_anchors.py`
- `tools/harness/check_slice_endpoint_coverage.py`
- `tools/harness/check_dead_routes.py`
- `tools/harness/check_mock_critical_path.py`

## 2. Workflow Set

建议至少分 4 类 workflow：

- `doc-integrity`
- `contract-integrity`
- `architecture-integrity`
- `flow-smoke`

## 3. Workflow 1: Doc Integrity

目标：

- 检查核心 Harness 文档是否存在
- 检查 `backend_spec.yaml` 是否可解析
- 检查追踪矩阵和 Slice 文档是否存在关键项

推荐触发：

- pull request
- push to main branch

推荐步骤：

1. checkout repository
2. verify required docs exist
3. parse `backend/docs/backend_spec.yaml`
4. scan required titles in `AGENTS.md` / `platform_harness.md`

示例：

```yaml
name: doc-integrity

on:
  pull_request:
  push:
    branches: [main]

jobs:
  doc-integrity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python tools/harness/check_required_docs.py
      - run: python tools/harness/parse_openapi.py backend/docs/backend_spec.yaml
      - run: python tools/harness/check_doc_anchors.py
```

## 4. Workflow 2: Contract Integrity

目标：

- 检查实现接口与 spec 是否漂移
- 检查 in-progress Slice 的 endpoint 是否都能在 spec 中找到
- 检查关键状态枚举是否只有单一来源

推荐触发：

- pull request

推荐步骤：

1. scan backend routes
2. compare with OpenAPI paths
3. compare frontend consumed fields with documented schemas
4. fail on undocumented fields or missing endpoints

示例：

```yaml
name: contract-integrity

on:
  pull_request:

jobs:
  contract-integrity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python tools/harness/check_spec_coverage.py
      - run: python tools/harness/check_slice_endpoint_coverage.py
      - run: python tools/harness/check_state_enum_drift.py
```

## 5. Workflow 3: Architecture Integrity

目标：

- 强制层级依赖方向
- 阻止 `repo/service/api` 交叉污染

推荐触发：

- pull request

推荐步骤：

1. scan imports
2. compare dependency edges against allowed graph
3. emit actionable lint messages

示例：

```yaml
name: architecture-integrity

on:
  pull_request:

jobs:
  architecture-integrity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python tools/harness/check_layer_dependencies.py
```

## 6. Workflow 4: Flow Smoke

目标：

- 确认 P0 主链路没有被 mock 和死路由重新污染
- 验证最小关键流程可跑通

推荐触发：

- nightly
- release branch push
- manual dispatch before milestone close

推荐步骤：

1. run backend tests
2. run frontend smoke or API flow smoke
3. scan dead routes
4. scan critical mock usage

示例：

```yaml
name: flow-smoke

on:
  workflow_dispatch:
  schedule:
    - cron: "0 2 * * *"

jobs:
  flow-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python tools/harness/check_dead_routes.py
      - run: python tools/harness/check_mock_critical_path.py
      - run: pytest tests/contract tests/integration tests/smoke
```

## 7. Recommended Tooling Layout

后续如果把 CI 辅助脚本代码化，建议放在：

```text
tools/
  harness/
    check_required_docs.py
    parse_openapi.py
    check_doc_anchors.py
    check_spec_coverage.py
    check_slice_endpoint_coverage.py
    check_state_enum_drift.py
    check_layer_dependencies.py
    check_dead_routes.py
    check_mock_critical_path.py
    check_doc_drift.py
```

## 8. Failure Message Contract

所有 workflow 的失败输出都应尽量遵循：

```text
Check:
Issue:
Why it matters:
How to fix:
Blocking level:
Affected slice:
```

这样 CI 结果可以直接作为 Agent 的可执行反馈输入。

## 9. Rollout Order

建议分 3 轮接入：

### Phase A

- `doc-integrity`
- OpenAPI parse
- dead route scan

### Phase B

- spec drift
- slice endpoint coverage
- mock critical path scan

### Phase C

- architecture lint
- contract tests
- integration tests
- flow smoke

## 10. Bottom Line

CI workflow 在本项目里不是“补自动化”，而是把 Harness 规则变成持续执行层。
如果规则不能进入 workflow，它最终就会退化成只在文档里存在的建议。
