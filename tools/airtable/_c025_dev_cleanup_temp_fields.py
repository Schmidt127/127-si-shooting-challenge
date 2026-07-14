#!/usr/bin/env python3
"""C-025 DEV: inventory and optionally delete/rename temporary scaffolding fields.

Default: dry-run inventory only.
Writes require: --confirm-write

Targets (per C-025-effective-to-formula-conversion.md):
- Effective * (Config formula draft) helpers on Zoom Meetings
- * — legacy rollup / * — pre-YN renamed Program/Global fields on Zoom Meetings
- C025 Checkbox Rollup Probe
- C025 Select Probe * diagnostic fields
- C025 Schema Write Probe (if still present)

Does NOT delete production fields, ZA view marker, or authoritative credit formulas.
DEV only — never PROD.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

tv = dotenv_values(HERE / ".env")
TOKEN = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
if not TOKEN:
    raise SystemExit("missing AIRTABLE_TOKEN in tools/airtable/.env")

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Table IDs (DEV)
TABLES = {
    "Zoom Meetings": "tblWcSHEm8vNNIxyB",
    "Zoom Attendance": "tblfwbt6aCDCM5gUz",
    "Config": "tblRB6sh77NxjS568",
}

TEMP_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    ("draft_helper", re.compile(r"^Effective .+ \(Config formula draft\)$"), "Config formula draft helper"),
    ("legacy_rollup", re.compile(r" — legacy rollup$"), "Renamed legacy rollup field"),
    ("pre_yn", re.compile(r" — pre-YN$"), "Pre-YN rename scaffold"),
    ("checkbox_rollup_probe", re.compile(r"^C025 Checkbox Rollup Probe$"), "Checkbox rollup diagnostic"),
    ("select_probe", re.compile(r"^C025 Select Probe"), "Select/text draft diagnostic"),
    ("schema_write_probe", re.compile(r"^C025 Schema Write Probe$"), "Schema write permission probe"),
    ("select_blank_cmp", re.compile(r"^C025 Select Probe BlankCmp$"), "Select blank compare probe"),
    ("select_len", re.compile(r"^C025 Select Probe Len$"), "Select len probe"),
    (
        "zzz_archive",
        re.compile(r"^ZZZ C025 Archive — "),
        "Archived temp field (rename cleanup; Meta DELETE often 404)",
    ),
]

PROTECTED_EXACT = {
    "Zoom Recording Quiz — Past Deadline (view marker)",
    "Zoom Credit Key",
    "Zoom Credit Approved?",
    "Zoom Credit Conflict?",
    "Zoom Credit Debug",
}


def fetch_tables() -> list[dict]:
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json().get("tables") or []


def classify_field(name: str) -> tuple[str | None, str]:
    if name in PROTECTED_EXACT:
        return None, "protected"
    for key, pattern, label in TEMP_PATTERNS:
        if pattern.search(name):
            return key, label
    return None, ""


def formula_text(field: dict) -> str:
    opts = field.get("options") or {}
    if isinstance(opts.get("formula"), str):
        return opts["formula"]
    return ""


def find_references(
    tables: list[dict],
    inventory_rows: list[dict],
    target_ids: set[str],
    target_names: set[str],
) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = {tid: [] for tid in target_ids}
    name_to_id = {row["name"]: row["id"] for row in inventory_rows}

    for table in tables:
        tname = table.get("name") or ""
        for field in table.get("fields") or []:
            fname = field.get("name") or ""
            fid = field.get("id") or ""
            if fid in target_ids:
                continue
            haystacks = [formula_text(field), json.dumps(field.get("options") or {})]
            blob = "\n".join(haystacks)
            for tid in target_ids:
                if tid in blob:
                    refs.setdefault(tid, []).append(f"{tname}.{fname}")
            for name in target_names:
                if f"{{{name}}}" in blob:
                    refs.setdefault(name_to_id[name], []).append(f"{tname}.{fname}")
    return refs


def delete_field(table_id: str, field_id: str) -> dict:
    r = requests.delete(f"{META}/tables/{table_id}/fields/{field_id}", headers=H, timeout=120)
    return {"status": r.status_code, "body": r.text[:500]}


def rename_field(table_id: str, field_id: str, new_name: str) -> dict:
    r = requests.patch(
        f"{META}/tables/{table_id}/fields/{field_id}",
        headers=H,
        json={"name": new_name},
        timeout=120,
    )
    return {"status": r.status_code, "body": r.text[:500]}


def main() -> int:
    parser = argparse.ArgumentParser(description="C-025 temp field inventory/cleanup (DEV)")
    parser.add_argument("--confirm-write", action="store_true", help="Actually delete fields (destructive)")
    parser.add_argument("--rename", metavar="SUFFIX", help="Rename instead of delete: append SUFFIX to field name")
    parser.add_argument("--table", default="", help="Limit to one table name")
    parser.add_argument("--json-out", default=str(PREVIEW / "c025_temp_fields_inventory.json"))
    args = parser.parse_args()

    tables = fetch_tables()
    inventory: list[dict] = []

    for table in tables:
        tname = table.get("name") or ""
        if args.table and tname != args.table:
            continue
        if tname not in TABLES and args.table == "":
            # focus on C-025 tables by default
            continue
        tid = table.get("id") or ""
        for field in table.get("fields") or []:
            fname = field.get("name") or ""
            category, label = classify_field(fname)
            if not category:
                continue
            inventory.append({
                "table": tname,
                "table_id": tid,
                "id": field.get("id"),
                "name": fname,
                "type": field.get("type"),
                "category": category,
                "label": label,
            })

    target_ids = {row["id"] for row in inventory if row.get("id")}
    target_names = {row["name"] for row in inventory}
    refs = find_references(tables, inventory, target_ids, target_names)

    for row in inventory:
        row["referenced_by"] = refs.get(row["id"], [])
        row["safe_to_delete"] = len(row["referenced_by"]) == 0

    report = {
        "base": DEV,
        "dry_run": not args.confirm_write and not args.rename,
        "count": len(inventory),
        "safe_count": sum(1 for r in inventory if r["safe_to_delete"]),
        "blocked_count": sum(1 for r in inventory if not r["safe_to_delete"]),
        "fields": inventory,
    }

    out_path = Path(args.json_out)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(out_path), "count": report["count"], "safe": report["safe_count"]}, indent=2))

    if args.rename:
        if not args.confirm_write:
            print("Rename requires --confirm-write", file=sys.stderr)
            return 2
        for row in inventory:
            if not row["safe_to_delete"]:
                print(f"SKIP rename (deps): {row['table']}.{row['name']}", file=sys.stderr)
                continue
            new_name = f"{row['name']}{args.rename}"
            result = rename_field(row["table_id"], row["id"], new_name)
            print(json.dumps({"action": "rename", "field": row["name"], "new_name": new_name, **result}))
        return 0

    if args.confirm_write:
        deleted = 0
        skipped = 0
        for row in inventory:
            if not row["safe_to_delete"]:
                print(f"SKIP delete (deps {row['referenced_by']}): {row['table']}.{row['name']}", file=sys.stderr)
                skipped += 1
                continue
            result = delete_field(row["table_id"], row["id"])
            print(json.dumps({"action": "delete", "field": row["name"], **result}))
            if result["status"] in (200, 204):
                deleted += 1
        print(json.dumps({"deleted": deleted, "skipped": skipped}))
        return 0

    print("Dry-run only. Re-run with --confirm-write to delete safe fields.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
