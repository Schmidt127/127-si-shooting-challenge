#!/usr/bin/env python3
"""Arm final summary emails on WAS by checking Send to Make? (triggers automation 074)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import quote

import requests

from airtable_read import BASE_ID, session, txt
from preview_final_email import FINAL_EMAIL_REVISION, get_table

WAS_TABLE = "Weekly Athlete Summary"
FIELDS = {
    "revision": "Weekly Email Revision",
    "ready": "Weekly Email Ready?",
    "sent": "Weekly Email Sent?",
    "send": "Send to Make?",
    "subject": "Weekly Email Subject",
    "recipients": "Weekly Email Recipients",
    "html": "Weekly Email HTML",
    "week_label": "Weekly Email Week Label",
    "error": "Weekly Email Error",
}


def patch_was(sess: requests.Session, updates: list[dict]) -> None:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(WAS_TABLE)}"
    for index in range(0, len(updates), 10):
        batch = updates[index : index + 10]
        resp = sess.patch(url, json={"records": batch}, timeout=180)
        if not resp.ok:
            raise RuntimeError(f"PATCH {WAS_TABLE} failed: {resp.status_code} {resp.text[:500]}")


def load_candidates(sess: requests.Session, revision: str, enrollment_id: str = "") -> list[dict]:
    field_names = list(FIELDS.values())
    rows = get_table(sess, WAS_TABLE, field_names)
    out = []
    for row in rows:
        rf = row.get("fields", {})
        if txt(rf.get(FIELDS["revision"])) != revision:
            continue
        if enrollment_id:
            from airtable_read import first_id

            if first_id(rf.get("Enrollment")) != enrollment_id:
                continue
        out.append({"id": row["id"], "fields": rf})
    return out


def evaluate(row: dict) -> tuple[str, dict]:
    rf = row["fields"]
    was_id = row["id"]
    subject = txt(rf.get(FIELDS["subject"]))
    recipients = txt(rf.get(FIELDS["recipients"]))
    html = txt(rf.get(FIELDS["html"]))
    ready = bool(rf.get(FIELDS["ready"]))
    sent = bool(rf.get(FIELDS["sent"]))
    armed = bool(rf.get(FIELDS["send"]))

    if sent:
        return "blocked_already_sent", {"weeklySummaryId": was_id, "subject": subject}
    if not ready:
        return "blocked_not_ready", {"weeklySummaryId": was_id, "subject": subject}
    if not subject or not recipients or not html:
        return "blocked_missing_package", {"weeklySummaryId": was_id, "subject": subject}
    if armed:
        return "already_armed", {"weeklySummaryId": was_id, "subject": subject}
    return "eligible", {"weeklySummaryId": was_id, "subject": subject}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Check Send to Make? on staged final-summary WAS rows (fires automation 074)."
    )
    parser.add_argument("--confirm-arm", action="store_true", help="Write Send to Make? = true. Default is dry-run.")
    parser.add_argument("--revision", default=FINAL_EMAIL_REVISION)
    parser.add_argument("--enrollment-id", default="", help="Arm only one enrollment's WAS row.")
    parser.add_argument("--report-out", default="")
    args = parser.parse_args()

    sess = session()
    candidates = load_candidates(sess, args.revision, args.enrollment_id)
    report = {
        "revision": args.revision,
        "dryRun": not args.confirm_arm,
        "candidateCount": len(candidates),
        "armedCount": 0,
        "eligibleCount": 0,
        "skippedCount": 0,
        "eligible": [],
        "skipped": [],
    }

    pending: list[dict] = []
    for row in sorted(candidates, key=lambda r: txt(r["fields"].get(FIELDS["subject"]))):
        status, info = evaluate(row)
        info["status"] = status
        if status == "eligible":
            report["eligibleCount"] += 1
            report["eligible"].append(info)
            pending.append({"id": row["id"], "fields": {FIELDS["send"]: True}})
            print(f"ARM {info['subject']} ({row['id']})")
        else:
            report["skippedCount"] += 1
            report["skipped"].append(info)
            print(f"SKIP {info.get('subject') or row['id']}: {status}")

    if args.confirm_arm and pending:
        patch_was(sess, pending)
        report["armedCount"] = len(pending)

    print("===== ARM FINAL EMAILS (074 trigger) =====")
    print(json.dumps({k: v for k, v in report.items() if k not in {"eligible", "skipped"}}, indent=2))
    if not args.confirm_arm:
        print("Dry-run only. Re-run with --confirm-arm to check Send to Make? on eligible rows.")
        print("Ensure automation 074 is ON and sendMode is Live (not Test) before arming all rows.")
    else:
        print(f"Armed {report['armedCount']} row(s). Automation 074 should fire for each.")

    if args.report_out:
        Path(args.report_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Wrote {args.report_out}")


if __name__ == "__main__":
    main()
