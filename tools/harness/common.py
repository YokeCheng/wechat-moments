from __future__ import annotations

from pathlib import Path
import re
import sys
from typing import Iterable

import yaml


ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = ROOT / "frontend" / "src"
ROUTER_CONFIG = FRONTEND_SRC / "router" / "config.tsx"
SLICE_REGISTRY = ROOT / "backend" / "docs" / "slice_registry.md"
OPENAPI_SPEC = ROOT / "backend" / "docs" / "backend_spec.yaml"

REQUIRED_DOCS = [
    "AGENTS.md",
    "backend/docs/prd.md",
    "backend/docs/feature_inventory.md",
    "backend/docs/backend_spec.yaml",
    "backend/docs/backend_design.md",
    "backend/docs/platform_harness.md",
    "backend/docs/context_engineering_rules.md",
    "backend/docs/architecture_constraints.md",
    "backend/docs/architecture_lint_plan.md",
    "backend/docs/feedback_entropy_loop.md",
    "backend/docs/doc_gardening_protocol.md",
    "backend/docs/slice_registry.md",
    "backend/docs/release_gates.md",
    "backend/docs/agent_operating_protocol.md",
    "backend/docs/ci_workflow_examples.md",
    "backend/docs/doc_drift_scanner_plan.md",
    "backend/docs/traceability_matrix.md",
    "backend/docs/harness_engines_map.md",
]

LIST_FIELDS = {
    "frontend_routes",
    "backend_endpoints",
    "data_entities",
    "dependencies",
    "acceptance",
}

IMPORT_RE = re.compile(
    r"^\s*import(?:[\s\w{},*]+from\s*)?[\"']([^\"']+)[\"'];?",
    re.MULTILINE,
)
DEFAULT_IMPORT_RE = re.compile(
    r"^\s*import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+[\"']([^\"']+)[\"'];?",
    re.MULTILINE,
)
HEADING_RE = re.compile(r"^(#{2,6})\s+(.+?)\s*$", re.MULTILINE)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_yaml(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def strip_code(value: str) -> str:
    text = value.strip()
    if text.startswith("`") and text.endswith("`") and len(text) >= 2:
        return text[1:-1]
    return text


def fail(
    *,
    check: str,
    issue: str,
    why: str,
    fix: str,
    blocking_level: str = "P0-blocking",
    affected_slice: str | None = None,
    affected_document: str | None = None,
) -> None:
    lines = [
        f"Check: {check}",
        f"Issue: {issue}",
        f"Why it matters: {why}",
        f"How to fix: {fix}",
        f"Blocking level: {blocking_level}",
    ]
    if affected_slice:
        lines.append(f"Affected slice: {affected_slice}")
    if affected_document:
        lines.append(f"Affected document: {affected_document}")
    raise SystemExit("\n".join(lines))


def ok(check: str, detail: str) -> None:
    print(f"[OK] {check}: {detail}")


def markdown_headings(path: Path) -> set[str]:
    return {match.group(2).strip() for match in HEADING_RE.finditer(read_text(path))}


def parse_slice_registry(path: Path = SLICE_REGISTRY) -> list[dict[str, object]]:
    slices: list[dict[str, object]] = []
    current: dict[str, object] | None = None
    current_field: str | None = None

    for raw_line in read_text(path).splitlines():
        stripped = raw_line.strip()

        if stripped.startswith("### "):
            if current:
                slices.append(current)
            title = stripped[4:].strip()
            match = re.match(r"([A-Z0-9-]+)\s+(.*)", title)
            current = {
                "title": title,
                "slice_id": match.group(1) if match else title,
                "name": match.group(2) if match else "",
                "status": "",
                "frontend_routes": [],
                "backend_endpoints": [],
                "data_entities": [],
                "dependencies": [],
                "acceptance": [],
            }
            current_field = None
            continue

        if current is None:
            continue

        indent = len(raw_line) - len(raw_line.lstrip(" "))
        if indent >= 2 and stripped.startswith("- ") and current_field in LIST_FIELDS:
            current[current_field].append(strip_code(stripped[2:].strip()))
            continue

        bullet = re.match(r"- ([a-z_]+):(?:\s*(.*))?$", stripped)
        if not bullet:
            current_field = None
            continue

        key = bullet.group(1)
        value = strip_code((bullet.group(2) or "").strip())

        if key in LIST_FIELDS:
            current.setdefault(key, [])
            if value and value.lower() != "none":
                current[key].append(value)
                current_field = None
            elif value.lower() == "none":
                current_field = None
            else:
                current_field = key
            continue

        current[key] = value
        current_field = None

    if current:
        slices.append(current)

    return slices


def parse_openapi(path: Path = OPENAPI_SPEC) -> dict[str, object]:
    data = load_yaml(path)
    if not isinstance(data, dict):
        fail(
            check="OpenAPIParse",
            issue=f"{rel(path)} did not parse into a mapping.",
            why="Harness contract checks need a valid OpenAPI document root.",
            fix="Restore backend/docs/backend_spec.yaml to a valid OpenAPI YAML object.",
            affected_document=rel(path),
        )

    if "openapi" not in data or "paths" not in data:
        fail(
            check="OpenAPIParse",
            issue=f"{rel(path)} is missing required OpenAPI keys.",
            why="Spec-driven checks require both the OpenAPI version and the path table.",
            fix="Ensure the spec includes top-level 'openapi' and 'paths' keys.",
            affected_document=rel(path),
        )

    paths = data.get("paths")
    if not isinstance(paths, dict):
        fail(
            check="OpenAPIParse",
            issue=f"{rel(path)} has a non-mapping 'paths' section.",
            why="Endpoint coverage checks cannot resolve documented operations.",
            fix="Restore the OpenAPI paths section to a YAML mapping.",
            affected_document=rel(path),
        )

    return data


def openapi_operations(spec: dict[str, object]) -> set[str]:
    operations: set[str] = set()
    for path, methods in spec.get("paths", {}).items():
        if not isinstance(methods, dict):
            continue
        for method in methods:
            if method.lower() in {
                "get",
                "post",
                "put",
                "patch",
                "delete",
                "options",
                "head",
            }:
                operations.add(f"{method.upper()} {path}")
    return operations


def expand_endpoint_reference(value: str) -> list[str]:
    text = strip_code(value)
    if not text or text.lower() == "none":
        return []

    match = re.match(r"^([A-Z/]+)\s+(\S+)$", text)
    if not match:
        return []

    methods = [part for part in match.group(1).split("/") if part]
    path = match.group(2)
    return [f"{method} {path}" for method in methods]


def list_frontend_files() -> list[Path]:
    return sorted(
        path
        for path in FRONTEND_SRC.rglob("*")
        if path.is_file() and path.suffix in {".ts", ".tsx", ".js", ".jsx"}
    )


def resolve_local_import(current_file: Path, target: str) -> Path | None:
    if target.startswith("@/"):
        base = FRONTEND_SRC / target[2:]
    elif target.startswith("."):
        base = (current_file.parent / target).resolve()
    else:
        return None

    candidates = []
    if base.suffix:
        candidates.append(base)
    else:
        candidates.extend(base.with_suffix(ext) for ext in (".ts", ".tsx", ".js", ".jsx"))
        candidates.extend((base / f"index{ext}") for ext in (".ts", ".tsx", ".js", ".jsx"))

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def build_frontend_import_graph() -> dict[Path, set[Path]]:
    graph: dict[Path, set[Path]] = {}

    for source_file in list_frontend_files():
        imports: set[Path] = set()
        for match in IMPORT_RE.finditer(read_text(source_file)):
            resolved = resolve_local_import(source_file, match.group(1))
            if resolved:
                imports.add(resolved)
        graph[source_file] = imports

    return graph


def reachable_files(graph: dict[Path, set[Path]], roots: Iterable[Path]) -> set[Path]:
    stack = [root.resolve() for root in roots]
    seen: set[Path] = set()

    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)
        for child in graph.get(current, set()):
            if child not in seen:
                stack.append(child)

    return seen


def parse_route_config(
    path: Path = ROUTER_CONFIG,
) -> tuple[set[str], dict[str, Path]]:
    text = read_text(path)
    import_map: dict[str, Path] = {}

    for match in DEFAULT_IMPORT_RE.finditer(text):
        import_name, target = match.groups()
        resolved = resolve_local_import(path, target)
        if resolved:
            import_map[import_name] = resolved

    routes = set(re.findall(r'path:\s*["\']([^"\']+)["\']', text))
    route_components: dict[str, Path] = {}

    for match in re.finditer(
        r'path:\s*["\']([^"\']+)["\']\s*,\s*element:\s*<Layout><([A-Za-z_][A-Za-z0-9_]*)\s*/></Layout>',
        text,
    ):
        route_path, component = match.groups()
        component_file = import_map.get(component)
        if component_file:
            route_components[route_path] = component_file

    return routes, route_components


def normalize_route_target(raw_target: str) -> str | None:
    target = raw_target.strip()
    if not target.startswith("/"):
        return None
    target = target.split("?", 1)[0]
    target = target.split("#", 1)[0]
    target = target.split("${", 1)[0]
    if not target:
        return None
    normalized = target.rstrip("/")
    return normalized or "/"
