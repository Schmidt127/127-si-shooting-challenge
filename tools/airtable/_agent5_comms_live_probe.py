#!/usr/bin/env python3
"""Agent 5 overnight communications probe — READ ONLY.

Verifies, against PROD (appn84sqPw03zEbTT), using only GET requests:
- Weekly Athlete Summary uniqueness (one row per Enrollment x Week)
- Weekly email field states (Ready/Sent/Build/Send to Make/Subject/Recipients/HTML)
- Schmidt live submission recuuTBgstSTGg2E3 -> WAS -> XP Event linkage
- XP Event dedupe keys for the Schmidt enrollment
- Weeks seeding

Writes JSON evidence to docs/overnight/communications/results/live-probe-<ts>.json
Never mutates Airtable. Never sends email.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import (  # noqa: E402
    f,
    linked_ids,
    list_table,
    session,
    txt,
)

SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
LIVE_SUBMISSION = "recuuTBgstSTGg2E3"

WAS_TABLE = "Weekly Athlete Summary"

EMAIL_FIELDS = [
    "Weekly Email Ready?",
    "Weekly Email Sent?",
    "Build Weekly Email Now?",
    "Send to Make?",
    "Weekly Email Subject",
    "Weekly Email Recipients",
    "Weekly Email HTML",
    "Weekly Email Text",
    "Weekly Email Sent At",
    "Weekly Email Error",
    "Weekly Email Revision",
    "Weekly Email Week Label",
    "Weekly Email Last Built At",
    "sendMode",
    "Summary Key",
]


def main() -> int:
    sess = session()
    report: dict = {
        "probe": "agent5-communications-live-probe",
        "read_only": True,
        "base": "appn84sqPw03zEbTT (PROD)",
        "ran_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    # --- Weekly Athlete Summary: uniqueness + email states -------------
    was_rows = list_table(sess, WAS_TABLE, [])
    pair_map: dict[tuple[str, str], list[str]] = {}
    email_states = []
    for rec in was_rows:
        fields = f(rec)
        enr = (linked_ids(fields.get("Enrollment")) or [""])[0]
        week = (linked_ids(fields.get("Week")) or [""])[0]
        pair_map.setdefault((enr, week), []).append(rec["id"])
        email_states.append(
            {
                "id": rec["id"],
                "enrollment": enr,
                "week": week,
                **{
                    k: (fields.get(k) if not isinstance(fields.get(k), str) or len(str(fields.get(k))) < 200
                        else f"<{len(str(fields.get(k)))} chars>")
                    for k in EMAIL_FIELDS
                    if k in fields
                },
                "field_names_present": sorted(fields.keys()),
            }
        )
    duplicates = {
        f"{enr}|{week}": ids
        for (enr, week), ids in pair_map.items()
        if len(ids) > 1
    }
    missing_links = [
        ids for (enr, week), ids in pair_map.items() if not enr or not week
    ]
    report["weekly_athlete_summary"] = {
        "total_rows": len(was_rows),
        "unique_enrollment_week_pairs": len(pair_map),
        "duplicate_pairs": duplicates,
        "rows_missing_enrollment_or_week": missing_links,
        "rows": email_states,
    }

    # --- Weeks ----------------------------------------------------------
    weeks = list_table(sess, "Weeks", [])
    report["weeks"] = [
        {
            "id": rec["id"],
            "name": txt(f(rec).get("Week Name") or f(rec).get("Name")),
            "start": f(rec).get("Start Date"),
            "end": f(rec).get("End Date"),
            "week_start_key": f(rec).get("Week Start Key"),
            "week_end_key": f(rec).get("Week End Key"),
        }
        for rec in weeks
    ]

    # --- Schmidt enrollment ----------------------------------------------
    enrollments = list_table(sess, "Enrollments", [])
    for rec in enrollments:
        if rec["id"] == SCHMIDT_ENROLLMENT:
            fields = f(rec)
            report["schmidt_enrollment"] = {
                "id": rec["id"],
                "active": fields.get("Active?"),
                "parent_email_cleaned": txt(fields.get("Parent Email - Cleaned")),
                "athlete_email_cleaned": txt(fields.get("Athlete Email - Cleaned")),
                "full_name": txt(fields.get("Full Athlete Name")),
                "grade_band": txt(fields.get("Grade Band")),
            }
            break
    else:
        report["schmidt_enrollment"] = {"error": "NOT FOUND"}
    report["enrollment_count"] = len(enrollments)

    # --- Live submission ---------------------------------------------------
    submissions = list_table(sess, "Submissions", [])
    report["submission_count"] = len(submissions)
    for rec in submissions:
        if rec["id"] == LIVE_SUBMISSION:
            fields = f(rec)
            report["live_submission"] = {
                "id": rec["id"],
                "enrollment": linked_ids(fields.get("Enrollment")),
                "week": linked_ids(fields.get("Week")),
                "activity_date": fields.get("Activity Date"),
                "activity_date_key": fields.get("Activity Date Key"),
                "count_this": fields.get("Count This Submission?"),
                "xp_events": linked_ids(fields.get("XP Events")),
                "weekly_summary": linked_ids(
                    fields.get("Weekly Athlete Summary")
                    or fields.get("Weekly Athlete Summaries")
                ),
                "shots_fields": {
                    k: v for k, v in fields.items() if "shot" in k.lower()
                },
            }
            break
    else:
        report["live_submission"] = {"error": f"{LIVE_SUBMISSION} NOT FOUND"}

    # --- XP Events for Schmidt ------------------------------------------
    xp_events = list_table(sess, "XP Events", [])
    schmidt_xp = []
    source_keys: dict[str, list[str]] = {}
    for rec in xp_events:
        fields = f(rec)
        key = txt(fields.get("Source Key"))
        if key:
            source_keys.setdefault(key, []).append(rec["id"])
        if SCHMIDT_ENROLLMENT in linked_ids(fields.get("Enrollment")):
            schmidt_xp.append(
                {
                    "id": rec["id"],
                    "points": fields.get("XP Points"),
                    "source": txt(fields.get("XP Source")),
                    "bucket": txt(fields.get("XP Bucket")),
                    "source_key": key,
                    "week": linked_ids(fields.get("Week")),
                    "submission": linked_ids(fields.get("Submission")),
                    "active": fields.get("Active?"),
                }
            )
    dup_source_keys = {k: v for k, v in source_keys.items() if len(v) > 1}
    report["xp_events"] = {
        "total": len(xp_events),
        "schmidt_rows": schmidt_xp,
        "duplicate_source_keys": dup_source_keys,
    }

    out_dir = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "overnight"
        / "communications"
        / "results"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"live-probe-{stamp}.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Wrote {out_path}")
    print(
        json.dumps(
            {
                "was_rows": report["weekly_athlete_summary"]["total_rows"],
                "duplicate_pairs": report["weekly_athlete_summary"]["duplicate_pairs"],
                "weeks": len(report["weeks"]),
                "enrollments": report["enrollment_count"],
                "submissions": report["submission_count"],
                "schmidt_xp_count": len(schmidt_xp),
                "duplicate_source_keys": dup_source_keys,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
