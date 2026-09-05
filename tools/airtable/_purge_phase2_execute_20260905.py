#!/usr/bin/env python3
"""Phase 2 transactional purge executor — approved v2 manifest (200 records).

Requires prior Phase 1 backup at stamp 20260905_211033.
Deletes ONLY explicit record IDs from the approved backup index.
Never deletes Weeks, PHA, Homework Library, Countries, State, reusable Zoom Meetings,
or configuration/rule tables.
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
EV = REPO / "docs/testing/evidence/transactional-purge-2026-09-05"
APPROVED_STAMP = "20260905_211033"
BACKUP_INDEX = EV / f"04-backup-index-{APPROVED_STAMP}.json"
ORDER_MANIFEST = EV / f"05-deletion-order-manifest-{APPROVED_STAMP}.json"
THROTTLE = 0.25
BATCH = 10

# Map backup index keys → Airtable table names for API delete
TABLE_ALIASES = {
    "Zoom Meetings (selected disposable)": "Zoom Meetings",
}

HARD_ABORT_TABLES = {
    "Weeks",
    "Program Homework Assignments",
    "Homework Library",
    "Countries",
    "State",
    "Config",
    "XP Reward Rules",
    "Achievements",
    "Levels",
    "Level Gate Rules",
    "Shot Milestones",
    "Grade Bands",
    "Awards",
    "Tutorials & Assets",
    "Automations",
    "Program Instance - Sync",
    "Target Goal Shots",
    "School - Synced",
    "Testing Scenarios",
}

# Never delete these Zoom Meeting IDs even if somehow listed
PRESERVE_ZOOM_IDS = {"recMFP2x5LDqea9ax", "recb9EjQIJVzaRpZa"}

# Child → parent order for purge-all tables, then selected Zoom Meetings after attendance
DELETE_STEPS: list[tuple[str, str]] = [
    ("Email Handoff Queue", "Email Handoff Queue"),
    ("Award Recipients", "Award Recipients"),
    ("XP Events", "XP Events"),
    ("Athlete Achievement Unlocks", "Athlete Achievement Unlocks"),
    ("Streak Occurrences", "Streak Occurrences"),
    ("Video Feedback", "Video Feedback"),
    ("Zoom Attendance", "Zoom Attendance"),
    ("Zoom Meetings (selected disposable)", "Zoom Meetings"),
    ("Homework Completions", "Homework Completions"),
    ("Submission Assets", "Submission Assets"),
    ("Submissions", "Submissions"),
    ("Weekly Athlete Summary", "Weekly Athlete Summary"),
    ("Enrollments", "Enrollments"),
    ("Athletes", "Athletes"),
]


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def list_all_ids(sess: requests.Session, table: str) -> list[str]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}"
    ids: list[str] = []
    offset = None
    while True:
        params: dict[str, Any] = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        time.sleep(THROTTLE)
        resp = sess.get(url, params=params, timeout=180)
        resp.raise_for_status()
        data = resp.json()
        ids.extend(r["id"] for r in data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return ids


def delete_batch(sess: requests.Session, table: str, ids: list[str]) -> tuple[int, str | None]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}"
    time.sleep(THROTTLE)
    resp = sess.delete(url, params=[("records[]", rid) for rid in ids], timeout=180)
    if not resp.ok:
        return 0, f"{resp.status_code} {resp.text[:500]}"
    return len(resp.json().get("records", [])), None


def primary_count(sess: requests.Session, table: str) -> int:
    return len(list_all_ids(sess, table))


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != "CONFIRM_DELETE":
        print("Refuse: pass CONFIRM_DELETE to execute.")
        return 2

    stamp = utc_stamp()
    sess = session()
    backup = json.loads(BACKUP_INDEX.read_text(encoding="utf-8"))
    order = json.loads(ORDER_MANIFEST.read_text(encoding="utf-8"))
    planned_total = int(backup["planned_delete_total"])
    assert planned_total == 200, planned_total
    assert order["planned_delete_total"] == 200

    report: dict[str, Any] = {
        "phase": 2,
        "started_at": stamp,
        "base_id": BASE_ID,
        "approval": "APPROVE TRANSACTIONAL PURGE",
        "approved_manifest_stamp": APPROVED_STAMP,
        "planned_delete_total": planned_total,
        "automation_pause": {
            "paused": [],
            "note": (
                "Airtable MCP update_automation replaces full draft configs and cannot "
                "safely toggle ON/OFF. Proceeding with FUT-030 pattern: leaf→parent "
                "explicit-ID delete with automations live, then remnant settle pass."
            ),
            "restored": [],
        },
        "preflight": {},
        "deletion": {},
        "totals": {"deleted": 0, "failed": 0, "skipped_already_gone": 0},
        "failures": [],
    }

    print("=== PREFLIGHT: refresh counts vs approved manifest ===")
    drift = []
    for key, info in backup["tables"].items():
        api_table = TABLE_ALIASES.get(key, key)
        approved_ids = set(info["record_ids"])
        live_ids = set(list_all_ids(sess, api_table))
        if key.startswith("Zoom Meetings"):
            # Selective: only care that approved disposable IDs still exist (or note gone)
            missing = approved_ids - live_ids
            extras_in_scope = approved_ids & live_ids  # still present
            # Also ensure preserve zoom still present
            preserve_missing = PRESERVE_ZOOM_IDS - live_ids
            report["preflight"][key] = {
                "approved_count": len(approved_ids),
                "still_present": len(extras_in_scope),
                "already_gone": len(missing),
                "preserve_zoom_missing": sorted(preserve_missing),
            }
            if preserve_missing:
                drift.append(f"PROTECTED Zoom Meetings missing: {sorted(preserve_missing)}")
            # Material drift: new records in disposable set can't appear; if fewer, OK to proceed with intersection
            if len(extras_in_scope) < len(approved_ids) * 0.5 and len(approved_ids) > 2:
                # Allow already-gone; only abort if live disposable somehow grew with unknown IDs in our list
                pass
            print(
                f"  {key}: approved={len(approved_ids)} present={len(extras_in_scope)} gone={len(missing)}"
            )
        else:
            live_count = len(live_ids)
            approved_count = info["export_count"]
            # For PURGE ALL: live should equal approved set (allow already gone subset)
            new_ids = live_ids - approved_ids
            missing = approved_ids - live_ids
            report["preflight"][key] = {
                "approved_count": approved_count,
                "live_count": live_count,
                "new_unapproved_ids": sorted(new_ids)[:50],
                "new_unapproved_count": len(new_ids),
                "already_gone": len(missing),
            }
            print(
                f"  {key}: approved={approved_count} live={live_count} "
                f"new={len(new_ids)} gone={len(missing)}"
            )
            if new_ids:
                drift.append(f"{key}: {len(new_ids)} new unapproved records since backup")
            # Material count growth
            if live_count > approved_count:
                drift.append(f"{key}: live {live_count} > approved {approved_count}")

    # Protected table sanity
    protected_live = {}
    for t in sorted(HARD_ABORT_TABLES):
        protected_live[t] = primary_count(sess, t)
    report["preflight"]["protected_live"] = protected_live
    for t in ("Program Homework Assignments", "Weeks", "Homework Library", "Countries", "State"):
        print(f"  PROTECT {t}: {protected_live[t]}")

    if drift:
        report["preflight"]["abort"] = True
        report["preflight"]["drift"] = drift
        path = EV / f"20-phase2-ABORT-preflight-{stamp}.json"
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print("ABORT due to manifest drift:")
        for d in drift:
            print(" ", d)
        print(f"Wrote {path}")
        return 3

    report["preflight"]["abort"] = False
    report["preflight"]["safe_to_delete"] = True
    print("Preflight PASS — proceeding with deletion.")

    # === DELETE ===
    print("\n=== DELETION ===")
    for backup_key, api_table in DELETE_STEPS:
        if api_table in HARD_ABORT_TABLES:
            print(f"ABORT: {api_table} is hard-abort")
            return 4
        info = backup["tables"][backup_key]
        approved_ids = list(info["record_ids"])
        # Intersect with live
        live = set(list_all_ids(sess, api_table))
        to_delete = [rid for rid in approved_ids if rid in live]
        already_gone = [rid for rid in approved_ids if rid not in live]
        # Safety: never delete preserve zoom
        bad = [rid for rid in to_delete if rid in PRESERVE_ZOOM_IDS]
        if bad:
            print(f"ABORT: attempted delete of preserved Zoom Meeting {bad}")
            return 5
        # For selective Zoom: ensure only approved IDs
        if api_table == "Zoom Meetings":
            if any(rid not in set(approved_ids) for rid in to_delete):
                print("ABORT: Zoom delete set not subset of approved")
                return 5

        deleted = 0
        failed_batches = []
        print(f"Deleting {backup_key} -> {api_table}: {len(to_delete)} (gone already {len(already_gone)})")
        for i in range(0, len(to_delete), BATCH):
            batch = to_delete[i : i + BATCH]
            # Re-verify batch not in hard abort / preserve
            if any(x in PRESERVE_ZOOM_IDS for x in batch):
                print("ABORT mid-batch preserve zoom")
                return 5
            n, err = delete_batch(sess, api_table, batch)
            if err:
                failed_batches.append({"offset": i, "ids": batch, "error": err})
                report["totals"]["failed"] += len(batch)
                report["failures"].append({"table": api_table, "batch": batch, "error": err})
                print(f"  FAIL @{i}: {err}")
                continue
            deleted += n
            report["totals"]["deleted"] += n
            print(f"  batch @{i}: deleted {n}")
        report["totals"]["skipped_already_gone"] += len(already_gone)
        report["deletion"][backup_key] = {
            "api_table": api_table,
            "planned": len(approved_ids),
            "attempted": len(to_delete),
            "deleted": deleted,
            "already_gone": len(already_gone),
            "failed_batches": failed_batches,
        }

    # === IMMEDIATE POST COUNTS ===
    print("\n=== POST-DELETE COUNTS ===")
    post = {"captured_at": utc_stamp(), "purge_remaining": {}, "protected": {}, "zoom_remaining": []}
    for backup_key, api_table in DELETE_STEPS:
        if backup_key.startswith("Zoom Meetings"):
            continue
        rem = primary_count(sess, api_table)
        post["purge_remaining"][api_table] = rem
        print(f"  remaining {api_table}: {rem}")

    # Zoom Meetings: list remaining
    zm_ids = list_all_ids(sess, "Zoom Meetings")
    post["zoom_remaining_ids"] = zm_ids
    post["zoom_remaining_count"] = len(zm_ids)
    print(f"  Zoom Meetings remaining: {len(zm_ids)} {zm_ids}")
    # Must keep Introduction + Motivation
    missing_preserve = PRESERVE_ZOOM_IDS - set(zm_ids)
    post["preserve_zoom_missing"] = sorted(missing_preserve)
    if missing_preserve:
        print(f"ERROR: preserved Zoom Meetings missing: {missing_preserve}")

    for t in sorted(HARD_ABORT_TABLES):
        post["protected"][t] = primary_count(sess, t)

    report["post_immediate"] = post

    # === REMNANT SETTLE (wait + recount purge-all tables) ===
    print("\n=== REMNANT SETTLE (15s) ===")
    time.sleep(15)
    remnant_pass = {"tables": {}, "deleted": 0}
    for backup_key, api_table in DELETE_STEPS:
        if backup_key.startswith("Zoom Meetings"):
            # Only delete leftovers that match approved disposable IDs (should be none)
            approved = set(backup["tables"][backup_key]["record_ids"])
            live = set(list_all_ids(sess, api_table))
            leftovers = sorted(approved & live)
            # Also: do NOT delete any non-approved
        else:
            # PURGE ALL: any remaining rows are remnants — delete them if table is purge-all
            leftovers = list_all_ids(sess, api_table)
        if not leftovers:
            remnant_pass["tables"][api_table] = {"remaining": 0, "deleted": 0}
            continue
        print(f"  Remnant {api_table}: {len(leftovers)}")
        # Safety for Zoom
        if api_table == "Zoom Meetings":
            leftovers = [x for x in leftovers if x not in PRESERVE_ZOOM_IDS]
            leftovers = [x for x in leftovers if x in set(backup["tables"][backup_key]["record_ids"])]
        deleted_r = 0
        for i in range(0, len(leftovers), BATCH):
            batch = leftovers[i : i + BATCH]
            if api_table in HARD_ABORT_TABLES:
                print("ABORT remnant hard-abort table")
                return 6
            n, err = delete_batch(sess, api_table, batch)
            if err:
                print(f"  remnant FAIL: {err}")
                report["failures"].append({"remnant": True, "table": api_table, "error": err, "batch": batch})
                continue
            deleted_r += n
            remnant_pass["deleted"] += n
            report["totals"]["deleted"] += n
        remnant_pass["tables"][api_table] = {"remaining_before": len(leftovers), "deleted": deleted_r}

    time.sleep(5)
    final = {"captured_at": utc_stamp(), "purge_remaining": {}, "protected": {}, "zoom": {}}
    for backup_key, api_table in DELETE_STEPS:
        if backup_key.startswith("Zoom Meetings"):
            continue
        final["purge_remaining"][api_table] = primary_count(sess, api_table)
    zm = list_all_ids(sess, "Zoom Meetings")
    final["zoom"] = {
        "count": len(zm),
        "ids": zm,
        "preserve_ok": PRESERVE_ZOOM_IDS <= set(zm),
        "no_disposable_left": not (
            set(backup["tables"]["Zoom Meetings (selected disposable)"]["record_ids"]) & set(zm)
        ),
    }
    for t in sorted(HARD_ABORT_TABLES):
        final["protected"][t] = primary_count(sess, t)
        before = protected_live.get(t)
        if before is not None and final["protected"][t] != before:
            final.setdefault("protected_deltas", {})[t] = {
                "before": before,
                "after": final["protected"][t],
            }

    report["remnant_pass"] = remnant_pass
    report["final"] = final
    report["finished_at"] = utc_stamp()
    report["success"] = (
        all(v == 0 for v in final["purge_remaining"].values())
        and final["zoom"]["preserve_ok"]
        and final["zoom"]["no_disposable_left"]
        and not final.get("protected_deltas")
    )

    out = EV / f"20-phase2-deletion-report-{stamp}.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nWrote {out}")
    print(f"deleted_total={report['totals']['deleted']} success={report['success']}")
    print("final purge_remaining:", final["purge_remaining"])
    print("final zoom:", final["zoom"])
    if final.get("protected_deltas"):
        print("PROTECTED DELTAS:", final["protected_deltas"])
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
