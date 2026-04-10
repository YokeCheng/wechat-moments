from __future__ import annotations

from pathlib import Path

from common import REQUIRED_DOCS, ROOT, fail, ok


def main() -> None:
    missing = [doc for doc in REQUIRED_DOCS if not (ROOT / doc).exists()]
    if missing:
        fail(
            check="RequiredDocs",
            issue=f"Missing harness document(s): {', '.join(missing)}",
            why="Every task depends on the same minimum Harness reference set.",
            fix="Add or restore the missing Harness documents before merging.",
            affected_document=missing[0],
        )

    ok("RequiredDocs", f"verified {len(REQUIRED_DOCS)} required Harness documents")


if __name__ == "__main__":
    main()
