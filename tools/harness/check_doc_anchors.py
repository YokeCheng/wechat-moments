from __future__ import annotations

from common import ROOT, markdown_headings, fail, ok


EXPECTED_HEADINGS = {
    "AGENTS.md": {
        "0. Harness Reference",
        "1. Repo Mission",
        "2. Minimal Entry Point",
        "4. Hard Rules",
        "8. Required Checks Before Declaring Completion",
    },
    "backend/docs/platform_harness.md": {
        "0. Supporting Docs",
        "4. Harness Layers",
        "5. Development Unit: Slice",
        "10. Stage Gates",
        "13. How To Use This Harness In This Project",
    },
}


def main() -> None:
    for relative_path, expected in EXPECTED_HEADINGS.items():
        path = ROOT / relative_path
        headings = markdown_headings(path)
        missing = sorted(expected - headings)
        if missing:
            fail(
                check="DocAnchors",
                issue=f"{relative_path} is missing required heading(s): {', '.join(missing)}",
                why="Context routing depends on stable documentation entry points.",
                fix="Restore the missing headings or update this check together with the Harness contract.",
                affected_document=relative_path,
            )

    ok("DocAnchors", f"verified required headings in {len(EXPECTED_HEADINGS)} entry-point documents")


if __name__ == "__main__":
    main()
