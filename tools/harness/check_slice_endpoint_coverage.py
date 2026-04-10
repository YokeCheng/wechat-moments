from __future__ import annotations

from common import (
    OPENAPI_SPEC,
    SLICE_REGISTRY,
    expand_endpoint_reference,
    openapi_operations,
    parse_openapi,
    parse_slice_registry,
    fail,
    ok,
)


ENFORCED_STATUSES = {"in_progress", "done"}


def main() -> None:
    spec = parse_openapi(OPENAPI_SPEC)
    operations = openapi_operations(spec)
    registry = parse_slice_registry(SLICE_REGISTRY)

    missing_refs: list[tuple[str, str]] = []

    for slice_item in registry:
        status = str(slice_item.get("status", "")).strip()
        if status not in ENFORCED_STATUSES:
            continue

        slice_id = str(slice_item.get("slice_id", "unknown"))
        for endpoint in slice_item.get("backend_endpoints", []):
            for operation in expand_endpoint_reference(str(endpoint)):
                if operation not in operations:
                    missing_refs.append((slice_id, operation))

    if missing_refs:
        first_slice, first_operation = missing_refs[0]
        detail = "; ".join(f"{slice_id}: {operation}" for slice_id, operation in missing_refs[:8])
        fail(
            check="SliceEndpointCoverage",
            issue=f"Registered slice endpoint missing from OpenAPI spec: {detail}",
            why="An in-progress or done slice must not rely on undocumented backend endpoints.",
            fix="Add the missing operation to backend/docs/backend_spec.yaml or correct the slice registry entry.",
            affected_slice=first_slice,
            affected_document="backend/docs/backend_spec.yaml",
        )

    ok("SliceEndpointCoverage", "all in-progress/done slice endpoints are covered by OpenAPI")


if __name__ == "__main__":
    main()
