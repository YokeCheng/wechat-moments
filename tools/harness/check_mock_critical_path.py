from __future__ import annotations

from common import (
    OPENAPI_SPEC,
    ROOT,
    build_frontend_import_graph,
    parse_route_config,
    parse_slice_registry,
    reachable_files,
    rel,
    fail,
    ok,
)


ENFORCED_STATUSES = {"done"}

SLICE_RULES = {
    "P0-02": {
        "route": "/",
        "mock_files": ["frontend/src/mocks/articles.ts"],
    },
    "P0-03": {
        "route": "/prompts",
        "mock_files": ["frontend/src/mocks/prompts.ts"],
    },
    "P0-04": {
        "route": "/writer",
        "mock_files": [
            "frontend/src/mocks/writerArticles.ts",
            "frontend/src/mocks/prompts.ts",
        ],
    },
    "P0-05": {
        "route": "/writer",
        "forbidden_text": "setTimeout(",
    },
}


def main() -> None:
    graph = build_frontend_import_graph()
    _, route_components = parse_route_config()
    registry = {str(item.get("slice_id")): item for item in parse_slice_registry()}

    issues: list[str] = []
    first_slice: str | None = None

    for slice_id, rule in SLICE_RULES.items():
        slice_item = registry.get(slice_id)
        if not slice_item:
            continue

        status = str(slice_item.get("status", "")).strip()
        if status not in ENFORCED_STATUSES:
            continue

        route = str(rule["route"])
        root_file = route_components.get(route)
        if not root_file:
            issues.append(f"{slice_id}: route {route} is not registered")
            first_slice = first_slice or slice_id
            continue

        reachable = reachable_files(graph, [root_file])

        for mock_file in rule.get("mock_files", []):
            mock_path = (ROOT / mock_file).resolve()
            if mock_path in reachable:
                issues.append(f"{slice_id}: {route} still depends on {mock_file}")
                first_slice = first_slice or slice_id

        forbidden_text = rule.get("forbidden_text")
        if forbidden_text:
            for source_file in sorted(reachable):
                text = source_file.read_text(encoding="utf-8")
                if str(forbidden_text) in text:
                    issues.append(
                        f"{slice_id}: {rel(source_file)} still contains {forbidden_text}"
                    )
                    first_slice = first_slice or slice_id
                    break

    if issues:
        fail(
            check="MockCriticalPath",
            issue="; ".join(issues[:8]),
            why="A slice marked done cannot still rely on primary-path mock data or local fake async behavior.",
            fix="Replace the mock dependency with real backend integration before declaring the slice done.",
            affected_slice=first_slice,
            affected_document="backend/docs/feature_inventory.md",
        )

    ok("MockCriticalPath", "no done slice still depends on critical-path mocks or fake async flow")


if __name__ == "__main__":
    main()
