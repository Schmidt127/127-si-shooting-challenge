"""Extract Airtable-paste bodies for 010 v10.12, 057 v1.9, and 072 v4.3.

Skips the GitHub-only header above each production docblock.
Writes docs/deploy-checklists/*-PASTE.txt artifacts for Mike copy/paste.

Usage:
  python3 tools/airtable/extract_production_qa_paste_bundles.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "deploy-checklists"

SPECS: list[tuple[Path, Path, str, str]] = [
    (
        ROOT
        / "airtable"
        / "automations"
        / "shooting-challenge"
        / "010-submission-intake-create-xp-event.js",
        OUT_DIR / "010-v10.12-PASTE.txt",
        "v10.12",
        "/************************************************************\n * 010 - SUBMISSION INTAKE",
    ),
    (
        ROOT
        / "airtable"
        / "automations"
        / "shooting-challenge"
        / "057-achievements-and-milestones-calculate-perfect-week-eligibility.js",
        OUT_DIR / "057-v1.9-PASTE.txt",
        "1.9",
        "/***************************************************************************************************\n * 057 - Achievements",
    ),
    (
        ROOT
        / "airtable"
        / "automations"
        / "shooting-challenge"
        / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js",
        OUT_DIR / "072-v4.3-PASTE.txt",
        "v4.3",
        "/************************************************************\n * 072 - EMAIL",
    ),
]


def extract(src: Path, out: Path, version_token: str, start_marker: str) -> None:
    text = src.read_text(encoding="utf-8")
    idx = text.find(start_marker)
    if idx < 0:
        raise SystemExit(f"start marker not found in {src.name}")
    body = text[idx:]
    if version_token not in body[:4000]:
        raise SystemExit(f"version token {version_token!r} missing near docblock in {src.name}")
    if "require(" in body or "import " in body:
        raise SystemExit(f"Node-only import detected in paste body for {src.name}")
    out.write_text(body, encoding="utf-8", newline="\n")
    lines = len(body.splitlines())
    print(
        f"OK {src.name} -> {out.name} lines={lines} bytes={len(body.encode())} "
        f"version={version_token}"
    )


def main() -> None:
    for src, out, ver, marker in SPECS:
        if not src.is_file():
            raise SystemExit(f"missing source: {src}")
        extract(src, out, ver, marker)


if __name__ == "__main__":
    main()
