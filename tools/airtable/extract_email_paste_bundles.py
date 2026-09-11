"""Extract Airtable-paste bodies for parent-email producer automations.

Writes docs/deploy-checklists/{slot}-{version}-PASTE.txt for Mike copy/paste.
Skips GitHub-only headers per AUTOMATION_SCRIPT_STANDARD.

Usage:
  python3 tools/airtable/extract_email_paste_bundles.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "deploy-checklists"
AUTOMATIONS = ROOT / "airtable" / "automations" / "shooting-challenge"

PRODUCTION_DOCBLOCK = "/************************************************************\n * 0"


def extract_from_production_docblock(text: str, version_token: str) -> str:
    idx = text.find(PRODUCTION_DOCBLOCK)
    if idx < 0:
        raise SystemExit(f"production docblock marker not found (expected {PRODUCTION_DOCBLOCK!r})")
    body = text[idx:]
    if version_token not in body[:5000]:
        raise SystemExit(f"version token {version_token!r} missing near docblock")
    _assert_airtable_safe(body)
    return body


def extract_from_single_comment_block(text: str, version_token: str) -> str:
    """071 / 117 — one opening comment; skip GitHub header lines before Version:"""
    if not text.startswith("/*"):
        raise SystemExit("expected file to start with opening block comment")
    lines = text.splitlines(keepends=True)
    out: list[str] = ["/*\n"]
    past_header = False
    for line in lines[1:]:
        if not past_header:
            if line.strip().startswith("Version:"):
                past_header = True
                out.append(line)
            continue
        out.append(line)
    body = "".join(out)
    if version_token not in body[:3000]:
        raise SystemExit(f"version token {version_token!r} missing in single-block extract")
    _assert_airtable_safe(body)
    return body


def _assert_airtable_safe(body: str) -> None:
    if "require(" in body or "import " in body:
        raise SystemExit("Node-only import detected in paste body")


SPECS: list[tuple[str, str, str, str]] = [
    (
        "071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js",
        "071-v4.5-PASTE.txt",
        "v4.5",
        "single",
    ),
    (
        "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js",
        "072-v4.9.2-PASTE.txt",
        "v4.9.2",
        "docblock",
    ),
    (
        "073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js",
        "073-v4.7-PASTE.txt",
        "v4.7",
        "docblock",
    ),
    (
        "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js",
        "074-v3.6-PASTE.txt",
        "v3.6",
        "docblock",
    ),
    (
        "076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js",
        "076-v8.14-PASTE.txt",
        "v8.14",
        "docblock",
    ),
    (
        "117-zoom-send-recording-approval-email-to-make.js",
        "117-v2.2-PASTE.txt",
        "v2.2",
        "single",
    ),
]


def main() -> None:
    for filename, out_name, version, mode in SPECS:
        src = AUTOMATIONS / filename
        out = OUT_DIR / out_name
        if not src.is_file():
            raise SystemExit(f"missing source: {src}")
        text = src.read_text(encoding="utf-8")
        if mode == "docblock":
            body = extract_from_production_docblock(text, version)
        elif mode == "single":
            body = extract_from_single_comment_block(text, version)
        else:
            raise SystemExit(f"unknown mode {mode!r}")
        out.write_text(body, encoding="utf-8", newline="\n")
        print(
            f"OK {filename} -> {out_name} lines={len(body.splitlines())} "
            f"bytes={len(body.encode())} version={version}"
        )


if __name__ == "__main__":
    main()
