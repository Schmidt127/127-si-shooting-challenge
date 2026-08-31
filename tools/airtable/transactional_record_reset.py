#!/usr/bin/env python3
"""Controlled transactional record reset for Production Shooting Challenge.

Record deletion ONLY — never deletes tables, fields, views, or schema.

Safety:
  - Dry-run by default
  - Requires literal CONFIRM_DELETE as argv[1] to delete
  - Hard-aborts if any PRESERVE table appears in the delete plan
  - Never touches Weeks, Config, Program Instance, curriculum, rules, etc.

Usage:
  python tools/airtable/transactional_record_reset.py
  python tools/airtable/transactional_record_reset.py CONFIRM_DELETE
"""

from __future__ import annotations

import json
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
EVIDENCE_DIR = REPO / "docs" / "testing" / "evidence" / "transactional-reset-2026-08-31"

# Dependency-safe deletion order (leaf → root).
DELETE_ORDER: list[str] = [
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
    "Program Homework Assignments",
    "Weekly Athlete Summary",
    "Enrollments",
    "Athletes",
]

# Explicit preserve set — ambiguity defaults to PRESERVE.
PRESERVE_TABLES: set[str] = {
    "Automations",
    "Weeks",
    "Config",
    "Program Instance - Sync",
    "XP Reward Rules",
    "Achievements",
    "Target Goal Shots",
    "Grade Bands",
    "Homework Library",
    "Tutorials & Assets",
    "Awards",  # catalog
    "Levels",
    "Level Gate Rules",
    "Shot Milestones",
    "Zoom Meetings",  # reusable meeting catalog
    "School - Synced",  # sync/config
    "Testing Scenarios",  # ambiguous → PRESERVE
}

# Tables that must NEVER appear in delete plan (subset of PRESERVE for abort).
HARD_ABORT_IF_IN_PLAN: set[str] = {
    "Weeks",
    "Config",
    "Program Instance - Sync",
    "XP Reward Rules",
    "Achievements",
    "Target Goal Shots",
    "Grade Bands",
    "Homework Library",
    "Tutorials & Assets",
    "Automations",
}

# Optional metadata fields to capture when present (best-effort).
META_FIELD_CANDIDATES = [
    "Name",
    "Athlete Name",
    "Primary Name",
    "Title",
    "Program Year",
    "Season",
    "Season Label",
    "Year",
    "Enrollment",
    "Athlete",
    "Week",
    "Program Instance",
    "Source Key",
    "Status",
    "Template Key",
    "Send Key",
]

THROTTLE_S = 0.22


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def meta_tables(sess: requests.Session) -> list[dict[str, Any]]:
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables"
    resp = sess.get(url, timeout=120)
    resp.raise_for_status()
    return resp.json().get("tables", [])


def primary_field_name(table: dict[str, Any]) -> str:
    fields = table.get("fields") or []
    if not fields:
        return "Name"
    return fields[0].get("name") or "Name"


def field_names(table: dict[str, Any]) -> set[str]:
    return {fld.get("name") for fld in (table.get("fields") or []) if fld.get("name")}


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
            # Drop unknown field and retry page from scratch for this table.
            import re

            m = re.search(r'Unknown field name: \\"([^"\\]+)\\"', resp.text)
            if m and m.group(1) in fields:
                fields = [x for x in fields if x != m.group(1)]
                records = []
                offset = None
                continue
            raise RuntimeError(f"GET {table_name}: {resp.text[:400]}")
        if not resp.ok:
            raise RuntimeError(f"GET {table_name}: {resp.status_code} {resp.text[:400]}")
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records


def delete_batch(sess: requests.Session, table_name: str, ids: list[str]) -> tuple[int, str | None]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table_name)}"
    time.sleep(THROTTLE_S)
    resp = sess.delete(url, params=[("records[]", rid) for rid in ids], timeout=180)
    if not resp.ok:
        return 0, f"{resp.status_code} {resp.text[:500]}"
    return len(resp.json().get("records", [])), None


def classify(all_names: set[str]) -> dict[str, Any]:
    delete = [n for n in DELETE_ORDER if n in all_names]
    missing_expected = [n for n in DELETE_ORDER if n not in all_names]
    preserve = sorted(n for n in all_names if n not in set(delete))
    unknown = sorted(n for n in all_names if n not in set(DELETE_ORDER) and n not in PRESERVE_TABLES)
    # Unknowns stay PRESERVE
    preserve_final = sorted(set(preserve) | set(unknown))
    return {
        "delete": delete,
        "preserve": preserve_final,
        "missing_expected_delete_tables": missing_expected,
        "ambiguous_preserved": unknown,
        "not_in_base_user_named": [
            t
            for t in [
                "Coach Summary Queue",
                "Communications Hub",
                "Registration",
            ]
            if t not in all_names
        ],
    }


def record_summary(rec: dict[str, Any], primary: str) -> dict[str, Any]:
    fields = f(rec)
    primary_val = fields.get(primary)
    if isinstance(primary_val, list):
        primary_val = ", ".join(str(x) for x in primary_val[:5])
    elif isinstance(primary_val, dict):
        primary_val = str(primary_val.get("name") or primary_val)

    linked: dict[str, Any] = {}
    for key, val in fields.items():
        if isinstance(val, list) and val and all(isinstance(x, str) and x.startswith("rec") for x in val):
            linked[key] = val[:20]
            if len(val) > 20:
                linked[f"{key}__truncated"] = True
                linked[f"{key}__count"] = len(val)

    program_year = None
    for cand in ("Program Year", "Season", "Season Label", "Year"):
        if cand in fields and fields[cand] not in (None, "", []):
            program_year = fields[cand]
            break

    return {
        "id": rec["id"],
        "primary": primary_val,
        "program_year": program_year,
        "linked": linked,
        "meta": {
            k: fields[k]
            for k in META_FIELD_CANDIDATES
            if k in fields and k != primary and fields[k] not in (None, "", [])
        },
    }


def main() -> int:
    confirm = len(sys.argv) > 1 and sys.argv[1] == "CONFIRM_DELETE"
    mode = "CONFIRM_DELETE" if confirm else "dry_run"
    sess = session()
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = utc_stamp()

    print(f"Mode: {mode}")
    print(f"Base: {BASE_ID}")
    print("Refreshing live schema…")
    tables = meta_tables(sess)
    by_name = {t["name"]: t for t in tables}
    all_names = set(by_name)
    plan = classify(all_names)

    # Safety: delete plan must not include hard-abort tables
    bad = set(plan["delete"]) & HARD_ABORT_IF_IN_PLAN
    if bad:
        print(f"ABORT: delete plan includes protected tables: {sorted(bad)}")
        return 2
    overlap = set(plan["delete"]) & set(plan["preserve"])
    if overlap:
        print(f"ABORT: tables in both delete and preserve: {sorted(overlap)}")
        return 2

    schema_snapshot = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "table_count": len(tables),
        "tables": [
            {
                "id": t["id"],
                "name": t["name"],
                "primary_field": primary_field_name(t),
                "field_count": len(t.get("fields") or []),
                "field_ids": [fld.get("id") for fld in (t.get("fields") or [])],
            }
            for t in tables
        ],
        "classification": plan,
    }
    schema_path = EVIDENCE_DIR / f"01-schema-refresh-{stamp}.json"
    schema_path.write_text(json.dumps(schema_snapshot, indent=2), encoding="utf-8")
    print(f"Schema refresh: {schema_path}")

    # Enumerate DELETE tables
    delete_manifest: dict[str, Any] = {
        "mode": mode,
        "base_id": BASE_ID,
        "captured_at": stamp,
        "tables": {},
        "totals": {"tables": 0, "records": 0},
    }

    print("\n=== PRESERVE table counts (read-only) ===")
    preserve_counts: dict[str, int] = {}
    for name in plan["preserve"]:
        primary = primary_field_name(by_name[name])
        rows = list_all_records(sess, name, fields=[primary])
        preserve_counts[name] = len(rows)
        print(f"  PRESERVE {name}: {len(rows)}")

    print("\n=== DELETE table enumeration ===")
    for name in plan["delete"]:
        table = by_name[name]
        primary = primary_field_name(table)
        nameset = field_names(table)
        want = [primary] + [c for c in META_FIELD_CANDIDATES if c in nameset and c != primary]
        # Dedupe preserving order
        seen: set[str] = set()
        fields_req: list[str] = []
        for x in want:
            if x not in seen:
                seen.add(x)
                fields_req.append(x)
        rows = list_all_records(sess, name, fields=fields_req)
        summaries = [record_summary(r, primary) for r in rows]
        delete_manifest["tables"][name] = {
            "table_id": table["id"],
            "primary_field": primary,
            "record_count": len(summaries),
            "records": summaries,
        }
        delete_manifest["totals"]["tables"] += 1
        delete_manifest["totals"]["records"] += len(summaries)
        print(f"  DELETE {name}: {len(summaries)}")

    delete_manifest["preserve_counts_before"] = preserve_counts
    delete_manifest["classification"] = plan

    # Abort if dry-run somehow included preserve
    for pname in HARD_ABORT_IF_IN_PLAN:
        if pname in delete_manifest["tables"]:
            print(f"ABORT: protected table in delete manifest: {pname}")
            return 2

    manifest_path = EVIDENCE_DIR / f"02-pre-delete-manifest-{stamp}.json"
    manifest_path.write_text(json.dumps(delete_manifest, indent=2, default=str), encoding="utf-8")
    print(f"\nPre-delete manifest: {manifest_path}")
    print(f"Total DELETE records planned: {delete_manifest['totals']['records']}")

    dry_path = EVIDENCE_DIR / f"03-dry-run-{stamp}.json"
    dry_report = {
        "mode": mode,
        "safe_to_delete": True,
        "abort_reasons": [],
        "delete_counts": {
            n: delete_manifest["tables"][n]["record_count"] for n in plan["delete"]
        },
        "preserve_counts": preserve_counts,
        "protected_tables_in_plan": [],
        "notes": [
            "Coach Summary Queue not present in base (no-op).",
            "Communications Hub is external (not an Airtable table); Email Handoff Queue is the transactional queue.",
            "Ambiguous tables classified PRESERVE: " + ", ".join(plan["ambiguous_preserved"] or ["(none)"]),
            "Program Homework Assignments included in DELETE per Mike authorization (Homework Library preserved).",
            "Payment Transactions included in DELETE per Mike explicit authorization for this reset.",
            "No external sends; API record delete only.",
        ],
    }
    for pname in HARD_ABORT_IF_IN_PLAN:
        if pname in dry_report["delete_counts"]:
            dry_report["safe_to_delete"] = False
            dry_report["abort_reasons"].append(f"protected table in plan: {pname}")
            dry_report["protected_tables_in_plan"].append(pname)

    dry_path.write_text(json.dumps(dry_report, indent=2), encoding="utf-8")
    print(f"Dry-run report: {dry_path}")
    print(f"safe_to_delete={dry_report['safe_to_delete']}")

    if not dry_report["safe_to_delete"]:
        print("ABORT: dry-run failed safety checks.")
        return 2

    if not confirm:
        print("\nDry run complete. Re-run with CONFIRM_DELETE to delete records.")
        return 0

    # EXECUTE DELETE
    deletion_report: dict[str, Any] = {
        "mode": mode,
        "started_at": stamp,
        "base_id": BASE_ID,
        "tables": {},
        "totals": {"deleted": 0, "failed": 0},
        "failures": [],
    }
    print("\n=== EXECUTING DELETION ===")
    for name in plan["delete"]:
        ids = [r["id"] for r in delete_manifest["tables"][name]["records"]]
        deleted = 0
        failed_batches: list[dict[str, Any]] = []
        print(f"Deleting {name}: {len(ids)} records…")
        for i in range(0, len(ids), 10):
            batch = ids[i : i + 10]
            n, err = delete_batch(sess, name, batch)
            if err:
                failed_batches.append({"offset": i, "ids": batch, "error": err})
                deletion_report["totals"]["failed"] += len(batch)
                print(f"  FAIL batch @{i}: {err}")
                # Continue other batches / tables when safe
                continue
            deleted += n
            deletion_report["totals"]["deleted"] += n
        deletion_report["tables"][name] = {
            "planned": len(ids),
            "deleted": deleted,
            "failed_batches": failed_batches,
        }
        print(f"  -> deleted {deleted}/{len(ids)}")

    deletion_report["finished_at"] = utc_stamp()
    del_path = EVIDENCE_DIR / f"04-deletion-report-{stamp}.json"
    del_path.write_text(json.dumps(deletion_report, indent=2), encoding="utf-8")
    print(f"Deletion report: {del_path}")

    # Post-delete verification
    print("\n=== POST-DELETE VERIFICATION ===")
    post: dict[str, Any] = {
        "captured_at": utc_stamp(),
        "delete_remaining": {},
        "preserve_counts_after": {},
        "weeks_sample": [],
        "automation_075_check": {},
        "field_id_unchanged": True,
        "schema_table_count": None,
    }

    tables_after = meta_tables(sess)
    post["schema_table_count"] = len(tables_after)
    by_after = {t["name"]: t for t in tables_after}
    # Field ID integrity
    before_fields = {
        t["name"]: set(t.get("field_ids") or []) for t in schema_snapshot["tables"]
    }
    for t in tables_after:
        after_ids = {fld.get("id") for fld in (t.get("fields") or [])}
        if after_ids != before_fields.get(t["name"]):
            post["field_id_unchanged"] = False
            post.setdefault("field_id_diffs", []).append(t["name"])

    for name in plan["delete"]:
        primary = primary_field_name(by_after[name])
        rows = list_all_records(sess, name, fields=[primary])
        post["delete_remaining"][name] = len(rows)
        print(f"  remaining {name}: {len(rows)}")

    for name in plan["preserve"]:
        primary = primary_field_name(by_after[name])
        rows = list_all_records(sess, name, fields=[primary])
        post["preserve_counts_after"][name] = len(rows)
        delta = rows and preserve_counts.get(name)
        print(
            f"  preserve {name}: {len(rows)} (before {preserve_counts.get(name)})"
        )

    # Weeks detail
    weeks = list_all_records(sess, "Weeks", fields=None)
    for w in weeks:
        fields = f(w)
        post["weeks_sample"].append(
            {
                "id": w["id"],
                "fields_keys": sorted(fields.keys()),
                "name": fields.get("Name") or fields.get("Week Name") or list(fields.values())[:1],
                "Config - Lnk": fields.get("Config - Lnk"),
                "Program Instance": fields.get("Program Instance"),
            }
        )

    # Automations 075 check
    if "Automations" in by_after:
        autos = list_all_records(sess, "Automations", fields=None)
        codes = []
        for a in autos:
            fields = f(a)
            code = str(fields.get("Automation Code") or fields.get("Code") or "")
            name = str(fields.get("Name") or "")
            codes.append({"id": a["id"], "name": name, "code": code, "status": fields.get("Status")})
        hit_075 = [
            c
            for c in codes
            if c["code"].strip() == "075"
            or c["name"].startswith("075")
            or " 075 " in f" {c['name']} "
        ]
        post["automation_075_check"] = {
            "automation_rows": len(codes),
            "matches_075": hit_075,
            "075_absent_or_retired": len(hit_075) == 0,
        }
        print(f"  Automations rows: {len(codes)}; 075 matches: {len(hit_075)}")

    post_path = EVIDENCE_DIR / f"05-post-delete-verification-{stamp}.json"
    post_path.write_text(json.dumps(post, indent=2, default=str), encoding="utf-8")
    print(f"Post-delete verification: {post_path}")

    nonzero = {k: v for k, v in post["delete_remaining"].items() if v}
    if nonzero:
        print(f"WARNING: non-zero remaining in delete tables: {nonzero}")
        return 1

    print("\nReset complete. All transactional tables at 0 records.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
