#!/usr/bin/env python3
"""Phase 1 read-only inventory + full backup for transactional purge.

Does NOT delete. Writes evidence under docs/testing/evidence/transactional-purge-2026-09-05/.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import BASE_ID, f, session  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
EVIDENCE = REPO / "docs" / "testing" / "evidence" / "transactional-purge-2026-09-05"
THROTTLE_S = 0.22

# Leaf → parent. PHA intentionally ABSENT (preserve curriculum schedule).
DELETE_ORDER = [
    "Email Handoff Queue",
    "Award Recipients",
    "Payment Transactions",
    "XP Events",
    "Athlete Achievement Unlocks",
    "Streak Occurrences",
    "Video Feedback",
    "Zoom Attendance",
    "Homework Completions",
    "Final Reflection Quiz Submissions",
    "Submission Assets",
    "Submissions",
    "Weekly Athlete Summary",
    "Enrollments",
    "Athletes",
    "Registrations",
]

PRESERVE_CONFIGURATION = {
    "Automations",
    "Config",
    "Program Instance - Sync",
    "XP Reward Rules",
    "Grade Bands",
    "Levels",
    "Level Gate Rules",
    "Shot Milestones",
    "Achievements",
    "Target Goal Shots",
    "School - Synced",
}

PRESERVE_REUSABLE = {
    "Weeks",
    "Homework Library",
    "Program Homework Assignments",
    "Tutorials & Assets",
    "Awards",
    "Zoom Meetings",
    "Testing Scenarios",
}

# Known FUT-030 delete set minus PHA (preserved this run).
KNOWN_TRANSACTIONAL = set(DELETE_ORDER)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def meta_tables(sess: requests.Session) -> list[dict[str, Any]]:
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables"
    resp = sess.get(url, timeout=120)
    resp.raise_for_status()
    return resp.json().get("tables", [])


def primary_field_name(table: dict[str, Any]) -> str:
    fields = table.get("fields") or []
    return (fields[0].get("name") if fields else None) or "Name"


def sanitize_attachment(val: Any) -> Any:
    """Strip temporary signed URLs; keep metadata only."""
    if not isinstance(val, list):
        return val
    out = []
    for item in val:
        if not isinstance(item, dict):
            out.append(item)
            continue
        cleaned = {
            k: v
            for k, v in item.items()
            if k
            in (
                "id",
                "filename",
                "size",
                "type",
                "width",
                "height",
                "thumbnails",
            )
        }
        # Drop nested thumbnail URLs
        thumbs = cleaned.get("thumbnails")
        if isinstance(thumbs, dict):
            cleaned["thumbnails"] = {
                size: {k: v for k, v in meta.items() if k != "url"}
                if isinstance(meta, dict)
                else meta
                for size, meta in thumbs.items()
            }
        out.append(cleaned)
    return out


def sanitize_fields(fields: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in fields.items():
        if isinstance(v, list) and v and isinstance(v[0], dict) and (
            "url" in v[0] or "filename" in v[0]
        ):
            out[k] = sanitize_attachment(v)
        else:
            out[k] = v
    return out


def list_all_records(
    sess: requests.Session,
    table_name: str,
    fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table_name)}"
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while True:
        params: dict[str, Any] = {"pageSize": 100}
        if fields:
            for i, name in enumerate(fields):
                params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        time.sleep(THROTTLE_S)
        resp = sess.get(url, params=params, timeout=180)
        if resp.status_code == 422 and fields and "UNKNOWN_FIELD_NAME" in resp.text:
            m = re.search(r'Unknown field name: \\"([^"\\]+)\\"', resp.text)
            if m and m.group(1) in fields:
                fields = [x for x in fields if x != m.group(1)]
                records = []
                offset = None
                continue
            raise RuntimeError(f"GET {table_name}: {resp.text[:500]}")
        if not resp.ok:
            raise RuntimeError(f"GET {table_name}: {resp.status_code} {resp.text[:500]}")
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records


def classify_table(name: str, count: int, known_names: set[str]) -> tuple[str, str]:
    if name in PRESERVE_CONFIGURATION:
        return "PRESERVE CONFIGURATION", "Rules, inventory, sync, or operational configuration"
    if name in PRESERVE_REUSABLE:
        return "PRESERVE REUSABLE CONTENT", "Curriculum, schedule, catalogs, or reusable reference"
    if name in KNOWN_TRANSACTIONAL:
        if count == 0:
            return "EMPTY TRANSACTIONAL TABLE", "Transactional table currently empty; keep structure"
        return "PURGE ALL RECORDS", "Athlete/workflow transactional records (test/disposable)"
    # New / unexpected tables
    return (
        "AMBIGUOUS — MIKE DECISION REQUIRED",
        "Not in FUT-030 preserve/delete sets — do not delete without explicit decision",
    )


def link_map(tables: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {t["id"]: t["name"] for t in tables}
    edges = []
    for t in tables:
        for fld in t.get("fields") or []:
            if fld.get("type") != "multipleRecordLinks":
                continue
            opts = fld.get("options") or {}
            linked = opts.get("linkedTableId")
            edges.append(
                {
                    "from_table": t["name"],
                    "from_table_id": t["id"],
                    "field": fld.get("name"),
                    "field_id": fld.get("id"),
                    "to_table": by_id.get(linked, linked),
                    "to_table_id": linked,
                    "is_reversed": bool(opts.get("isReversed")),
                    "prefers_single": bool(opts.get("prefersSingleRecordLink")),
                }
            )
    return edges


def main() -> int:
    sess = session()
    stamp = utc_stamp()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "tables").mkdir(exist_ok=True)

    print(f"Base: {BASE_ID}")
    print(f"Stamp: {stamp}")
    print(f"Evidence: {EVIDENCE}")

    tables = meta_tables(sess)
    by_name = {t["name"]: t for t in tables}
    all_names = set(by_name)
    edges = link_map(tables)

    schema_path = EVIDENCE / f"01-schema-{stamp}.json"
    schema_path.write_text(
        json.dumps(
            {
                "captured_at": stamp,
                "base_id": BASE_ID,
                "origin_master_note": "see companion SUMMARY",
                "table_count": len(tables),
                "tables": [
                    {
                        "id": t["id"],
                        "name": t["name"],
                        "primary_field": primary_field_name(t),
                        "field_count": len(t.get("fields") or []),
                        "fields": [
                            {
                                "id": fld.get("id"),
                                "name": fld.get("name"),
                                "type": fld.get("type"),
                            }
                            for fld in (t.get("fields") or [])
                        ],
                    }
                    for t in tables
                ],
                "link_edges": edges,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Schema: {schema_path}")

    inventory: dict[str, Any] = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "tables": {},
        "totals": {
            "tables": 0,
            "records": 0,
            "planned_delete": 0,
            "planned_preserve": 0,
        },
    }

    # Count every table (primary field only for speed)
    print("\n=== COUNT ALL TABLES ===")
    for name in sorted(all_names):
        table = by_name[name]
        primary = primary_field_name(table)
        rows = list_all_records(sess, name, fields=[primary])
        count = len(rows)
        classification, rationale = classify_table(name, count, all_names)
        inventory["tables"][name] = {
            "table_id": table["id"],
            "primary_field": primary,
            "record_count": count,
            "classification": classification,
            "rationale": rationale,
            "planned_delete_count": count if classification == "PURGE ALL RECORDS" else 0,
            "planned_preserve_count": (
                count
                if classification
                in (
                    "PRESERVE CONFIGURATION",
                    "PRESERVE REUSABLE CONTENT",
                    "EMPTY TRANSACTIONAL TABLE",
                    "AMBIGUOUS — MIKE DECISION REQUIRED",
                    "PURGE SELECTED TEST/ATHLETE RECORDS",
                )
                else 0
            ),
        }
        # EMPTY transactional: preserve structure, delete 0
        if classification == "EMPTY TRANSACTIONAL TABLE":
            inventory["tables"][name]["planned_preserve_count"] = 0
            inventory["tables"][name]["planned_delete_count"] = 0
            inventory["tables"][name]["expected_post_purge_count"] = 0
        elif classification == "PURGE ALL RECORDS":
            inventory["tables"][name]["expected_post_purge_count"] = 0
            inventory["tables"][name]["planned_preserve_count"] = 0
        else:
            inventory["tables"][name]["expected_post_purge_count"] = count

        inventory["totals"]["tables"] += 1
        inventory["totals"]["records"] += count
        inventory["totals"]["planned_delete"] += inventory["tables"][name]["planned_delete_count"]
        inventory["totals"]["planned_preserve"] += inventory["tables"][name]["planned_preserve_count"]
        print(f"  {classification[:28]:28} {name}: {count}")

    # Full export for PURGE ALL tables
    print("\n=== FULL BACKUP OF PURGE TARGETS ===")
    backup_index: dict[str, Any] = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "tables": {},
        "validation": {},
    }
    purge_names = [
        n
        for n, info in inventory["tables"].items()
        if info["classification"] == "PURGE ALL RECORDS"
    ]
    # Stable deletion order first, then any extras
    ordered_purge = [n for n in DELETE_ORDER if n in purge_names]
    for n in sorted(purge_names):
        if n not in ordered_purge:
            ordered_purge.append(n)

    snapshot_records: dict[str, list[dict[str, Any]]] = {}
    for name in ordered_purge:
        table = by_name[name]
        print(f"  Exporting {name}…")
        rows = list_all_records(sess, name, fields=None)
        cleaned = []
        for rec in rows:
            cleaned.append(
                {
                    "id": rec["id"],
                    "createdTime": rec.get("createdTime"),
                    "table_name": name,
                    "table_id": table["id"],
                    "fields": sanitize_fields(f(rec)),
                }
            )
        snapshot_records[name] = cleaned
        table_json = EVIDENCE / "tables" / f"{name.replace(' ', '_').replace('/', '-')}.json"
        table_csv = EVIDENCE / "tables" / f"{name.replace(' ', '_').replace('/', '-')}.csv"
        table_json.write_text(json.dumps(cleaned, indent=2, default=str), encoding="utf-8")

        # Flatten CSV: id, createdTime, then JSON of fields
        with table_csv.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.writer(fh)
            writer.writerow(["id", "createdTime", "table_id", "fields_json"])
            for row in cleaned:
                writer.writerow(
                    [
                        row["id"],
                        row.get("createdTime"),
                        row["table_id"],
                        json.dumps(row["fields"], default=str),
                    ]
                )

        live_count = inventory["tables"][name]["record_count"]
        export_count = len(cleaned)
        backup_index["tables"][name] = {
            "table_id": table["id"],
            "live_count": live_count,
            "export_count": export_count,
            "match": live_count == export_count,
            "json": str(table_json.relative_to(REPO)).replace("\\", "/"),
            "csv": str(table_csv.relative_to(REPO)).replace("\\", "/"),
            "record_ids": [r["id"] for r in cleaned],
        }
        print(f"    live={live_count} export={export_count} match={live_count == export_count}")

    full_snapshot = EVIDENCE / f"02-full-delete-snapshot-{stamp}.json"
    full_snapshot.write_text(
        json.dumps(
            {
                "captured_at": stamp,
                "base_id": BASE_ID,
                "deletion_order": ordered_purge,
                "records_by_table": snapshot_records,
                "totals": {
                    "tables": len(ordered_purge),
                    "records": sum(len(v) for v in snapshot_records.values()),
                },
            },
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )

    # Sample identity for athlete/enrollment/registration groups
    identity: dict[str, Any] = {"Athletes": [], "Enrollments": [], "Registrations": []}
    for tname in ("Athletes", "Enrollments", "Registrations"):
        if tname not in by_name:
            continue
        if inventory["tables"].get(tname, {}).get("classification") != "PURGE ALL RECORDS":
            # still sample if present
            pass
        rows = snapshot_records.get(tname) or []
        if not rows and inventory["tables"].get(tname, {}).get("record_count", 0) > 0:
            rows_raw = list_all_records(sess, tname, fields=None)
            rows = [
                {
                    "id": r["id"],
                    "createdTime": r.get("createdTime"),
                    "fields": sanitize_fields(f(r)),
                }
                for r in rows_raw
            ]
        for row in rows:
            fields = row.get("fields") or {}
            identity.setdefault(tname, []).append(
                {
                    "id": row["id"],
                    "createdTime": row.get("createdTime"),
                    "preview": {
                        k: fields.get(k)
                        for k in list(fields.keys())[:25]
                        if fields.get(k) not in (None, "", [])
                    },
                }
            )

    # Season sim residual probes
    residual_probes: dict[str, Any] = {}
    for tname in (
        "Athletes",
        "Enrollments",
        "Submissions",
        "XP Events",
        "Email Handoff Queue",
        "Zoom Meetings",
    ):
        if tname not in by_name:
            residual_probes[tname] = {"present": False}
            continue
        residual_probes[tname] = {
            "present": True,
            "count": inventory["tables"][tname]["record_count"],
        }

    backup_index["validation"] = {
        "all_exports_match_live": all(
            info.get("match") for info in backup_index["tables"].values()
        )
        if backup_index["tables"]
        else True,
        "export_table_count": len(backup_index["tables"]),
        "export_record_total": sum(
            info["export_count"] for info in backup_index["tables"].values()
        ),
        "inventory_planned_delete": inventory["totals"]["planned_delete"],
    }

    # Deletion order manifest
    deletion_manifest = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "child_to_parent_order": ordered_purge
        + [
            n
            for n in DELETE_ORDER
            if n in all_names
            and inventory["tables"][n]["classification"] == "EMPTY TRANSACTIONAL TABLE"
        ],
        "empty_transactional_tables": [
            n
            for n, info in inventory["tables"].items()
            if info["classification"] == "EMPTY TRANSACTIONAL TABLE"
        ],
        "purge_all_tables": ordered_purge,
        "preserve_configuration": sorted(PRESERVE_CONFIGURATION & all_names),
        "preserve_reusable": sorted(PRESERVE_REUSABLE & all_names),
        "ambiguous": [
            n
            for n, info in inventory["tables"].items()
            if info["classification"].startswith("AMBIGUOUS")
        ],
        "not_in_base_expected_names": [
            n for n in DELETE_ORDER + sorted(PRESERVE_CONFIGURATION | PRESERVE_REUSABLE) if n not in all_names
        ],
        "hard_abort_if_deleted": sorted(
            PRESERVE_CONFIGURATION
            | {
                "Weeks",
                "Homework Library",
                "Program Homework Assignments",
                "Tutorials & Assets",
            }
        ),
        "pha_policy": "PRESERVE — do not delete Program Homework Assignments (unlike FUT-030)",
        "payment_transactions_policy": "PURGE ALL if present — transactional payment rows, not pricing config",
        "zoom_meetings_policy": "PRESERVE reusable meeting catalog; purge Zoom Attendance only",
    }

    inventory_path = EVIDENCE / f"03-inventory-classification-{stamp}.json"
    inventory_path.write_text(json.dumps(inventory, indent=2), encoding="utf-8")

    backup_path = EVIDENCE / f"04-backup-index-{stamp}.json"
    backup_path.write_text(json.dumps(backup_index, indent=2), encoding="utf-8")

    order_path = EVIDENCE / f"05-deletion-order-manifest-{stamp}.json"
    order_path.write_text(json.dumps(deletion_manifest, indent=2), encoding="utf-8")

    identity_path = EVIDENCE / f"06-identity-groups-{stamp}.json"
    identity_path.write_text(json.dumps(identity, indent=2, default=str), encoding="utf-8")

    residual_path = EVIDENCE / f"07-season-sim-residual-probe-{stamp}.json"
    residual_path.write_text(json.dumps(residual_probes, indent=2), encoding="utf-8")

    print(f"\nInventory: {inventory_path}")
    print(f"Backup index: {backup_path}")
    print(f"Deletion order: {order_path}")
    print(f"Full snapshot: {full_snapshot}")
    print(f"Planned delete: {inventory['totals']['planned_delete']}")
    print(f"Backup match: {backup_index['validation']['all_exports_match_live']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
