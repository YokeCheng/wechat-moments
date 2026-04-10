# Project Consensus

## 1. Repository Position

This repository is the execution repository for the "爆了么" platform.
It is not a loose collection of pages or demo APIs.

The platform is developed along one main chain:

`发现 -> 提示词 -> 生文 -> 排版 -> 发布 / 商业化`

Every feature, cleanup, refactor, or bug fix must be mapped back to that main chain.

## 2. Harness Engineering In This Repo

Harness Engineering here is a concrete execution system.
It is implemented through five engines:

- `Context Engine`
  Route work to the correct slice and load only the minimum required context.
- `Constraint Engine`
  Force implementation to follow the documented contract, data design, and architecture boundaries.
- `Feedback Engine`
  Use tests, checks, review, and CI to keep correcting drift.
- `Entropy Engine`
  Remove mocks, dead routes, stale docs, duplicated state, and runtime garbage.
- `Gate Engine`
  Decide whether a slice is actually done.

Primary references:

- `AGENTS.md`
- `backend/docs/platform_harness.md`
- `backend/docs/harness_engines_map.md`
- `backend/docs/agent_operating_protocol.md`
- `backend/docs/slice_registry.md`
- `backend/docs/backend_spec.yaml`
- `backend/docs/backend_design.md`
- `backend/docs/feature_inventory.md`
- `backend/docs/traceability_matrix.md`

## 3. Hard Agreements

- Define the `Slice` before writing code.
- Update `backend/docs/backend_spec.yaml` before changing backend contracts.
- Update `backend/docs/backend_design.md` before changing entities or state flows.
- Mock-only behavior does not count as complete.
- Do not skip priority order. P0 main-chain closure comes before P1/P2 expansion.
- Sync docs after closing a slice.
- No hidden agreements. Fields, states, and error semantics must be discoverable in docs.

## 4. Current Shared State

Closed governance and infrastructure slices:

- `G0-01 Harness Execution Foundation`
- `G0-02 LAN Infra Foundation`

Closed P0 slices:

- `P0-01 Auth And Current User`
- `P0-02 Discover Read`

Main-chain slices still pending:

- `P0-03 Prompt Library CRUD`
- `P0-04 Writer Workspace`
- `P0-05 Generate Task`
- `P0-06 Layout Workspace`
- `P0-07 Asset Upload`

Current overall status:

`Harness base is in place, the first two P0 slices are real, and the full main chain is still under construction.`

## 5. Runtime Infrastructure Agreement

Code runs locally on the workstation.
Core infrastructure runs on `172.16.10.191`.

Current real runtime expectation:

- backend application: local process
- frontend application: local process
- PostgreSQL: `172.16.10.191:5432`
- Redis: `172.16.10.191:6379`
- MinIO: `172.16.10.191:9000`

## 6. SQLite Boundary

`SQLite is test-only in this repository.`

That means:

- SQLite is allowed for automated tests and temporary test fixtures only.
- SQLite is not allowed as the runtime database for local, LAN, staging, or production execution.
- Runtime database connections must use PostgreSQL.

This boundary is enforced by both documentation and backend configuration.

## 7. Local Live Preview Agreement

The preferred development preview mode is local hot reload:

- frontend dev server on `http://127.0.0.1:3000`
- backend dev server on `http://127.0.0.1:8000`
- frontend dev requests proxied to the local backend in development mode

Committed helper scripts:

- `tools/dev/start_live_preview.ps1`
- `tools/dev/stop_live_preview.ps1`

These scripts keep logs and PID files under `.runtime/` instead of polluting the repository root.

## 8. Definition Of Done

By default, "done" means:

- the task is inside PRD scope
- the slice is registered
- the contract is defined
- the data design is defined when needed
- the code is implemented
- verification or tests have run
- docs are synchronized
- the critical path no longer depends on the replaced mock

## 9. Bottom Line

The shared project consensus is:

`We are building a harness-driven, slice-based, verifiable platform system, not stacking isolated UI fragments.`
