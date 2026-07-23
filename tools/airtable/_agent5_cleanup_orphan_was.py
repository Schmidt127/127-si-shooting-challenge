#!/usr/bin/env python3
"""Agent 5 — delete orphaned Weekly Athlete Summary rows (empty Enrollment).

Background: the 2026-07 empty-base reset deleted Enrollments but left ~390
Weekly Athlete Summary rows whose Enrollment link is now empty. They break the
"one WAS per Enrollment x Week" guarantee and bloat 118/119 full-table scans.

Safety:
- Dry run by default: lists candidates, deletes nothing.
- Requires literal CONFIRM_DELETE as argv[1] to delete.
- Never touches rows that have ANY Enrollment link (Schmidt included).
- Dumps full field JSON of every candidate to evidence file BEFORE deleting.

Authority: SHOOTING_CHALLENGE_COMPLETION_MASTER.md section 1 rules 2 and 5
(old records may be removed freely; PROD is the active construction base).

Usage:
    python tools/airtable/_agent5_cleanup_orphan_was.py            # dry run
    python tools/airtable/_agent5_cleanup_orphan_was.py CONFIRM_DELETE
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import BASE_ID, f, linked_ids, list_table, session  # noqa: E402

WAS_TABLE = "Weekly Athlete Summary"


def main() -> int:
    confirm = len(sys.argv) > 1 and sys.argv[1] == "CONFIRM_DELETE"
    sess = session()

    rows = list_table(sess, WAS_TABLE, [])
    orphans = [rec for rec in rows if not linked_ids(f(rec).get("Enrollment"))]
    keepers = len(rows) - len(orphans)

    print(f"Total WAS rows: {len(rows)}")
    print(f"Orphans (no Enrollment link): {len(orphans)}")
    print(f"Rows kept (Enrollment present): {keepers}")

    out_dir = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "overnight"
        / "communications"
        / "results"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    evidence = out_dir / f"orphan-was-{'deleted' if confirm else 'dryrun'}-{stamp}.json"
    evidence.write_text(
        json.dumps(
            {
                "mode": "CONFIRM_DELETE" if confirm else "dry_run",
                "base": BASE_ID,
                "table": WAS_TABLE,
                "total_rows": len(rows),
                "orphan_count": len(orphans),
                "orphans": orphans,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Evidence written: {evidence}")

    if not confirm:
        print("Dry run only. Re-run with CONFIRM_DELETE to delete orphans.")
        return 0

    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(WAS_TABLE)}"
    deleted = 0
    ids = [rec["id"] for rec in orphans]
    for i in range(0, len(ids), 10):
        batch = ids[i : i + 10]
        resp = sess.delete(url, params=[("records[]", rid) for rid in batch], timeout=120)
        if not resp.ok:
            raise RuntimeError(f"DELETE failed at batch {i}: {resp.status_code} {resp.text[:300]}")
        deleted += len(resp.json().get("records", []))
    print(f"Deleted {deleted} orphaned WAS rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
