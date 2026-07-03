#!/usr/bin/env python3
"""Stage approved final summary HTML onto latest Weekly Athlete Summary per Active? enrollment."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests

from airtable_read import BASE_ID, athlete_label, f, first_id, is_active, session, txt
from preview_final_email import (
    FINAL_EMAIL_REVISION,
    MIN_SHOTS_FOR_FINAL_EMAIL,
    build_preview,
    clear_table_cache,
    enrollment_total_shots,
    get_table,
    html_to_text,
    list_active_enrollments,
    qualifies_for_final_email,
)

DENVER = ZoneInfo("America/Denver")

WAS_TABLE = "Weekly Athlete Summary"
WAS_FIELDS = {
    "enrollment": "Enrollment",
    "week": "Week",
    "subject": "Weekly Email Subject",
    "html": "Weekly Email HTML",
    "text": "Weekly Email Text",
    "payload": "Weekly Email Payload JSON",
    "recipients": "Weekly Email Recipients",
    "week_label": "Weekly Email Week Label",
    "revision": "Weekly Email Revision",
    "last_built": "Weekly Email Last Built At",
    "ready": "Weekly Email Ready?",
    "sent": "Weekly Email Sent?",
    "error": "Weekly Email Error",
}


def week_sort_ts(week_fields: dict) -> float:
    start = week_fields.get("Start Date")
    if isinstance(start, str) and start:
        return datetime.fromisoformat(start.replace("Z", "+00:00")).timestamp()
    try:
        return float(week_fields.get("Week Number") or 0)
    except (TypeError, ValueError):
        return 0.0


def recipients_csv(enrollment_fields: dict) -> str:
    emails: list[str] = []
    for field in ("Parent Email - Cleaned", "Athlete Email - Cleaned"):
        value = txt(enrollment_fields.get(field))
        if value and value not in emails:
            emails.append(value)
    return ", ".join(emails)


def latest_was_by_enrollment(sess: requests.Session) -> dict[str, dict]:
    weeks = {w["id"]: f(w) for w in get_table(sess, "Weeks", ["Week Name", "Start Date", "Week Number"])}
    grouped: dict[str, list[dict]] = defaultdict(list)
    for was in get_table(sess, WAS_TABLE, [WAS_FIELDS["enrollment"], WAS_FIELDS["week"]]):
        enrollment_id = first_id(f(was).get(WAS_FIELDS["enrollment"]))
        if enrollment_id:
            grouped[enrollment_id].append(was)

    latest: dict[str, dict] = {}
    for enrollment_id, rows in grouped.items():
        latest[enrollment_id] = max(
            rows,
            key=lambda row: week_sort_ts(weeks.get(first_id(f(row).get(WAS_FIELDS["week"])), {})),
        )
    return latest


def patch_was_records(sess: requests.Session, updates: list[dict]) -> None:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(WAS_TABLE)}"
    for index in range(0, len(updates), 10):
        batch = updates[index : index + 10]
        resp = sess.patch(url, json={"records": batch}, timeout=180)
        if not resp.ok:
            raise RuntimeError(f"PATCH {WAS_TABLE} failed: {resp.status_code} {resp.text[:500]}")


def stage_all(sess: requests.Session, *, confirm_write: bool, preview_one: str = "") -> dict:
    clear_table_cache()
    latest_was = latest_was_by_enrollment(sess)
    enrollments = list_active_enrollments(sess)
    if preview_one:
        enrollments = [row for row in enrollments if row["id"] == preview_one]

    report = {
        "revision": FINAL_EMAIL_REVISION,
        "dryRun": not confirm_write,
        "activeEnrollmentCount": len(enrollments),
        "stagedCount": 0,
        "skippedCount": 0,
        "errorCount": 0,
        "staged": [],
        "skipped": [],
        "errors": [],
    }

    pending_updates: list[dict] = []
    built_at = datetime.now(DENVER).isoformat()

    for enrollment in enrollments:
        enrollment_id = enrollment["id"]
        athlete_name = athlete_label(f(enrollment), enrollment_id)
        ef = f(enrollment)
        if not qualifies_for_final_email(ef):
            report["skippedCount"] += 1
            shots = enrollment_total_shots(ef)
            report["skipped"].append(
                {
                    "enrollmentId": enrollment_id,
                    "athleteName": athlete_name,
                    "reason": "shots_at_or_below_minimum",
                    "totalShotsCounted": shots,
                    "minimumRequired": MIN_SHOTS_FOR_FINAL_EMAIL,
                }
            )
            print(f"SKIP {athlete_name} ({shots} shots, need > {MIN_SHOTS_FOR_FINAL_EMAIL})")
            continue
        was = latest_was.get(enrollment_id)
        if not was:
            report["skippedCount"] += 1
            report["skipped"].append({"enrollmentId": enrollment_id, "athleteName": athlete_name, "reason": "missing_weekly_summary"})
            continue

        recipient_csv = recipients_csv(f(enrollment))
        if not recipient_csv:
            report["skippedCount"] += 1
            report["skipped"].append({"enrollmentId": enrollment_id, "athleteName": athlete_name, "reason": "missing_recipients"})
            continue

        try:
            preview = build_preview(sess, enrollment_id)
            payload = {
                "script": "stage_final_emails_to_was.py",
                "revision": FINAL_EMAIL_REVISION,
                "enrollmentId": enrollment_id,
                "enrollmentName": preview["enrollmentName"],
                "latestWeeklySummaryId": was["id"],
                "recipientsCsv": recipient_csv,
                "counts": preview["counts"],
                "validation": preview["validation"],
            }
            fields = {
                WAS_FIELDS["subject"]: preview["subject"],
                WAS_FIELDS["html"]: preview["htmlOut"],
                WAS_FIELDS["text"]: html_to_text(preview["htmlOut"]),
                WAS_FIELDS["payload"]: json.dumps(payload, indent=2),
                WAS_FIELDS["recipients"]: recipient_csv,
                WAS_FIELDS["week_label"]: "Final Challenge Summary",
                WAS_FIELDS["revision"]: FINAL_EMAIL_REVISION,
                WAS_FIELDS["last_built"]: built_at,
                WAS_FIELDS["ready"]: True,
                WAS_FIELDS["error"]: "",
            }
            pending_updates.append({"id": was["id"], "fields": fields})
            report["staged"].append(
                {
                    "enrollmentId": enrollment_id,
                    "athleteName": preview["enrollmentName"],
                    "weeklySummaryId": was["id"],
                    "subject": preview["subject"],
                    "recipientsCsv": recipient_csv,
                }
            )
            report["stagedCount"] += 1
            print(f"STAGE {preview['enrollmentName']} -> WAS {was['id']}")
        except Exception as exc:
            report["errorCount"] += 1
            report["errors"].append({"enrollmentId": enrollment_id, "athleteName": athlete_name, "error": str(exc)})
            print(f"ERROR {athlete_name}: {exc}")

    if confirm_write and pending_updates:
        patch_was_records(sess, pending_updates)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage final summary email packages onto latest WAS rows.")
    parser.add_argument("--confirm-write", action="store_true", help="Write to Airtable. Default is dry-run.")
    parser.add_argument("--enrollment-id", default="", help="Stage only one enrollment (rec...).")
    parser.add_argument("--report-out", default="", help="Optional JSON report path.")
    args = parser.parse_args()

    sess = session()
    report = stage_all(sess, confirm_write=args.confirm_write, preview_one=args.enrollment_id)
    print("===== STAGE FINAL EMAILS TO WAS =====")
    print(json.dumps({k: v for k, v in report.items() if k not in {"staged", "skipped", "errors"}}, indent=2))
    if report["skipped"]:
        print(f"Skipped ({len(report['skipped'])}):")
        for row in report["skipped"][:15]:
            print(f"  - {row['athleteName']}: {row['reason']}")
    if report["errors"]:
        print(f"Errors ({len(report['errors'])}):")
        for row in report["errors"][:15]:
            print(f"  - {row['athleteName']}: {row['error']}")

    if args.report_out:
        path = args.report_out
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)
        print(f"Wrote {path}")

    if not args.confirm_write:
        print("Dry-run only. Re-run with --confirm-write to update WAS rows.")


if __name__ == "__main__":
    main()
