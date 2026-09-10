#!/usr/bin/env python3
"""
Add five retry fields to Curriculum Hub Airtable table "Submission Outbox".

Dry-run by default. Set CONFIRM_WRITE=1 to create missing fields.

Required env:
  AIRTABLE_TOKEN or AIRTABLE_API_TOKEN — PAT with schema.bases:read + schema.bases:write
  CURRICULUM_HUB_AIRTABLE_BASE_ID — Hub base ID (app…), NOT Shooting Challenge appn84sqPw03zEbTT

Optional:
  OUTBOX_TABLE_NAME — default "Submission Outbox"
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import requests

TABLE_NAME = os.environ.get("OUTBOX_TABLE_NAME", "Submission Outbox").strip()
BASE_ID = os.environ.get("CURRICULUM_HUB_AIRTABLE_BASE_ID", "").strip()
TOKEN = (
    os.environ.get("AIRTABLE_TOKEN", "").strip()
    or os.environ.get("AIRTABLE_API_TOKEN", "").strip()
)
CONFIRM_WRITE = os.environ.get("CONFIRM_WRITE", "").strip() == "1"

SC_BASE_ID = "appn84sqPw03zEbTT"

FIELD_SPECS: list[dict[str, Any]] = [
    {"name": "Retry Payload", "type": "multilineText"},
    {
        "name": "Delivery Attempt Count",
        "type": "number",
        "options": {"precision": 0},
    },
    {"name": "Last Attempt At", "type": "dateTime"},
    {"name": "Delivered At", "type": "dateTime"},
    {"name": "Processing Claim", "type": "singleLineText"},
]


def headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }


def fail(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    sys.exit(code)


def get_tables() -> list[dict[str, Any]]:
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables"
    resp = requests.get(url, headers=headers(), timeout=60)
    if resp.status_code != 200:
        fail(f"GET tables failed ({resp.status_code}): {resp.text[:500]}")
    return resp.json().get("tables", [])


def find_outbox_table(tables: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [t for t in tables if t.get("name") == TABLE_NAME]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        fail(f"Ambiguous: multiple tables named {TABLE_NAME!r}")
    # Case-insensitive fallback
    lower = TABLE_NAME.lower()
    ci = [t for t in tables if str(t.get("name", "")).lower() == lower]
    if len(ci) == 1:
        return ci[0]
    return None


def create_field(table_id: str, spec: dict[str, Any]) -> dict[str, Any]:
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/{table_id}/fields"
    resp = requests.post(url, headers=headers(), json=spec, timeout=60)
    if resp.status_code not in (200, 201):
        fail(f"Create field {spec['name']!r} failed ({resp.status_code}): {resp.text[:500]}")
    return resp.json()


def main() -> None:
    if not TOKEN:
        fail("Missing AIRTABLE_TOKEN or AIRTABLE_API_TOKEN")
    if not BASE_ID:
        fail("Missing CURRICULUM_HUB_AIRTABLE_BASE_ID")
    if BASE_ID == SC_BASE_ID:
        fail(
            f"Refusing SC Production base {SC_BASE_ID}. "
            "Submission Outbox lives in Curriculum Hub base — set CURRICULUM_HUB_AIRTABLE_BASE_ID."
        )

    tables = get_tables()
    outbox = find_outbox_table(tables)
    if not outbox:
        names = sorted(t.get("name", "") for t in tables)
        fail(
            f"Table {TABLE_NAME!r} not found in base {BASE_ID}. "
            f"Tables ({len(names)}): {', '.join(names[:20])}{'…' if len(names) > 20 else ''}"
        )

    table_id = outbox["id"]
    existing = {f.get("name") for f in outbox.get("fields", [])}
    missing = [s for s in FIELD_SPECS if s["name"] not in existing]
    present = [s["name"] for s in FIELD_SPECS if s["name"] in existing]

    report = {
        "baseId": BASE_ID,
        "table": TABLE_NAME,
        "tableId": table_id,
        "present": present,
        "missing": [s["name"] for s in missing],
        "confirmWrite": CONFIRM_WRITE,
    }
    print(json.dumps(report, indent=2))

    if not missing:
        print("All five retry fields already exist — nothing to do.", file=sys.stderr)
        return

    if not CONFIRM_WRITE:
        print(
            f"Dry run: would create {len(missing)} field(s). "
            "Set CONFIRM_WRITE=1 to apply.",
            file=sys.stderr,
        )
        return

    created: list[str] = []
    for spec in missing:
        result = create_field(table_id, spec)
        created.append(result.get("name", spec["name"]))
        print(f"Created: {spec['name']} ({result.get('id', '?')})", file=sys.stderr)

    print(json.dumps({"created": created}, indent=2))


if __name__ == "__main__":
    main()
