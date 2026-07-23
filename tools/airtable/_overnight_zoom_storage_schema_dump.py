"""Overnight zoom-storage audit helper: dump key table fields from PROD snapshot.

Read-only against the checked-in schema snapshot JSON (no API calls).
Usage: python tools/airtable/_overnight_zoom_storage_schema_dump.py [table ...]
"""

from __future__ import annotations

import glob
import json
import sys

SNAPSHOT_GLOB = (
    "airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/schema_enhanced_*.json"
)

DEFAULT_TABLES = [
    "Zoom Attendance",
    "Zoom Meetings",
    "Submission Assets",
    "Video Feedback",
]


def main() -> None:
    paths = sorted(glob.glob(SNAPSHOT_GLOB))
    if not paths:
        raise SystemExit(f"No snapshot found for {SNAPSHOT_GLOB}")
    data = json.load(open(paths[-1], encoding="utf-8"))
    tables = data.get("tables") or data.get("schema", {}).get("tables") or []
    wanted = sys.argv[1:] or DEFAULT_TABLES

    by_name = {t.get("name"): t for t in tables}
    print(f"snapshot: {paths[-1]}")
    print(f"tables in snapshot: {len(tables)}")
    for name in wanted:
        table = by_name.get(name)
        if not table:
            print(f"\n=== {name}: NOT FOUND ===")
            continue
        print(f"\n=== {name} ({table.get('id')}) — {len(table.get('fields', []))} fields ===")
        for f in table.get("fields", []):
            ftype = f.get("type")
            line = f"  - {f.get('name')} [{ftype}]"
            opts = f.get("options") or {}
            if ftype == "formula" and opts.get("formula"):
                line += f" formula: {opts['formula'][:300]}"
            if ftype in ("singleSelect", "multipleSelects"):
                choices = [c.get("name") for c in (opts.get("choices") or [])]
                line += f" choices: {choices}"
            if ftype == "multipleRecordLinks":
                line += f" -> table {opts.get('linkedTableId')}"
            if ftype in ("rollup", "lookup", "multipleLookupValues", "count"):
                line += f" via fieldId {opts.get('recordLinkFieldId')} / {opts.get('fieldIdInLinkedTable')}"
            print(line)


if __name__ == "__main__":
    main()
