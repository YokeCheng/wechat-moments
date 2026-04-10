from __future__ import annotations

import sys
from pathlib import Path

from common import OPENAPI_SPEC, openapi_operations, parse_openapi, rel, ok


def main() -> None:
    raw_path = Path(sys.argv[1]) if len(sys.argv) > 1 else OPENAPI_SPEC
    spec_path = raw_path if raw_path.is_absolute() else (Path.cwd() / raw_path).resolve()
    spec = parse_openapi(spec_path)
    operations = openapi_operations(spec)
    ok(
        "OpenAPIParse",
        f"parsed {rel(spec_path)} with {len(spec.get('paths', {}))} paths and {len(operations)} operations",
    )


if __name__ == "__main__":
    main()
