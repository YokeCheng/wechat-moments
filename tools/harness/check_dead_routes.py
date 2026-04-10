from __future__ import annotations

import re

from common import (
    FRONTEND_SRC,
    ROOT,
    build_frontend_import_graph,
    normalize_route_target,
    parse_route_config,
    reachable_files,
    rel,
    fail,
    ok,
)


TARGET_PATTERNS = [
    re.compile(r"navigate\(\s*[\"'`]([^\"'`]+)[\"'`]\s*\)"),
    re.compile(r"to=\s*[\"'`]([^\"'`]+)[\"'`]"),
    re.compile(r"href=\s*[\"'`]([^\"'`]+)[\"'`]"),
    re.compile(r"path:\s*[\"'`](/[^\"'`]+)[\"'`]"),
]


def main() -> None:
    graph = build_frontend_import_graph()
    registered_routes, _ = parse_route_config()
    reachable = reachable_files(graph, [FRONTEND_SRC / "main.tsx"])

    issues: list[tuple[str, str]] = []

    for source_file in sorted(reachable):
        text = source_file.read_text(encoding="utf-8")
        for pattern in TARGET_PATTERNS:
            for match in pattern.finditer(text):
                normalized = normalize_route_target(match.group(1))
                if not normalized:
                    continue
                if normalized not in registered_routes:
                    issues.append((rel(source_file), normalized))

    issues = sorted(set(issues))
    if issues:
        first_file, first_target = issues[0]
        detail = "; ".join(f"{path} -> {target}" for path, target in issues[:8])
        fail(
            check="DeadRoutes",
            issue=f"Reachable navigation target is not registered: {detail}",
            why="Users can be routed into 404s or orphaned prototype paths from active pages.",
            fix="Register the route in frontend/src/router/config.tsx or remove the live navigation target.",
            affected_document=first_file,
        )

    ok("DeadRoutes", "all reachable internal navigation targets resolve to registered routes")


if __name__ == "__main__":
    main()
