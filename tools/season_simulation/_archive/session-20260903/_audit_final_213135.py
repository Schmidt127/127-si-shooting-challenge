"""Staged post-execute audit for SEASON-SIM-2027-20260902T213135Z-athlete1."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T213135Z-athlete1"
ENROLL = "recLlFgEVhhiCWSRY"
ATHLETE = "recLxhYwSWmlwyHQr"
SAFE = "schmidt@fairfieldbasketballclub.com"
MARKER = f"SEASON-SIM|{RUN}"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "reports" / f"audit-final-{RUN}.json"


def _ids(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        if isinstance(item, str) and item.startswith("rec"):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def _enroll_match(value) -> bool:
    return ENROLL in _ids(value) if isinstance(value, list) else value == ENROLL or ENROLL in str(value or "")


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    ex = json.loads((ROOT / "reports" / f"execute-{RUN}.json").read_text(encoding="utf-8"))
    c = AirtableClient(allow_writes=False)
    report: dict = {
        "run_id": RUN,
        "enrollment_id": ENROLL,
        "athlete_id": ATHLETE,
        "writer_status": ex.get("writer_status") or reg.get("status"),
        "execute_errors": ex.get("errors") or [],
        "stages": {},
        "issues": [],
    }

    # Registry counts
    by_table = Counter(r.get("table") for r in reg.get("records") or [])
    report["registry_by_table"] = dict(by_table)

    # Enrollment / athlete identity + emails
    enr = fields_of(c.get_record("Enrollments", ENROLL))
    ath = fields_of(c.get_record("Athletes", ATHLETE))
    parent = str(enr.get("Parent Email") or "").strip().lower()
    athlete_email = str(enr.get("Athlete Email") or "").strip().lower()
    report["stages"]["identity"] = {
        "parent_email": parent,
        "athlete_email": athlete_email,
        "emails_ok": parent == SAFE and athlete_email == SAFE,
        "athlete_name": f"{ath.get('First Name')} {ath.get('Last Name')}",
        "level": enr.get("Current Level"),
        "streak": enr.get("Current Shooting Streak"),
        "streak_status": enr.get("Current Shooting Streak Status"),
        "total_shots": enr.get("Total Shots Counted") or enr.get("Lifetime Total Shots"),
        "total_xp": enr.get("Total XP") or enr.get("Lifetime XP"),
    }
    if not report["stages"]["identity"]["emails_ok"]:
        report["issues"].append("Unsafe enrollment emails")

    # Submissions
    sub_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Submissions" and "|SUB|" in (r.get("dedupe_key") or "")]
    # prefer create dedupes only
    sub_create = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Submissions"
        and (r.get("dedupe_key") or "").count("|") >= 2
        and "STREAK_ARM" not in (r.get("dedupe_key") or "")
        and "POST" not in (r.get("dedupe_key") or "")
        and "ARM" not in (r.get("dedupe_key") or "")
    ]
    # more reliable: unique submission records from registry create keys
    create_subs = []
    seen = set()
    for r in reg["records"]:
        dk = r.get("dedupe_key") or ""
        if r["table"] != "Submissions":
            continue
        if "|SUB|" in dk or dk.endswith(tuple()):
            pass
        if "STREAK_ARM" in dk or "POST_CREATE" in dk or "DAILY" in dk:
            continue
        if r["record_id"] in seen:
            continue
        # create keys look like ...|SUB|Dxx or similar
        if "|SUB|" in dk or "|D" in dk and "STREAK" not in dk:
            seen.add(r["record_id"])
            create_subs.append(r["record_id"])

    # Fallback: list by enrollment
    live_subs = c.list_records(
        "Submissions",
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        max_records=200,
    )
    countable = 0
    shots = 0
    future = 0
    for r in live_subs:
        f = fields_of(r)
        if str(f.get("Count This Submission?") or "") in {"1", "1.0"} or f.get("Count This Submission?") == 1:
            countable += 1
            try:
                shots += float(f.get("Total Shots Counted") or 0)
            except (TypeError, ValueError):
                pass
        if str(f.get("Activity Date Is Future?") or "") in {"1", "1.0"} or f.get("Activity Date Is Future?") == 1:
            future += 1
    report["stages"]["submissions"] = {
        "live_count": len(live_subs),
        "countable": countable,
        "total_shots_counted": shots,
        "activity_date_is_future_1": future,
    }

    # XP Events by source/bucket
    xp_rows = c.list_records(
        "XP Events",
        formula=f"OR(FIND('{ENROLL}', {{Enrollment Record ID}} & ''), FIND('{ENROLL}', ARRAYJOIN({{Enrollment}})))",
        max_records=500,
    )
    by_source = Counter()
    by_bucket = Counter()
    source_keys = []
    active_xp = 0
    points = 0
    foreign = 0
    for r in xp_rows:
        f = fields_of(r)
        if not (_enroll_match(f.get("Enrollment")) or f.get("Enrollment Record ID") == ENROLL):
            foreign += 1
            continue
        sk = str(f.get("Source Key") or "")
        source_keys.append(sk)
        by_source[str(f.get("XP Source") or f.get("Source") or "unknown")] += 1
        by_bucket[str(f.get("XP Bucket") or "unknown")] += 1
        if f.get("Active?") is True:
            active_xp += 1
            try:
                points += float(f.get("XP Points") or 0)
            except (TypeError, ValueError):
                pass
    dup_keys = [k for k, n in Counter(source_keys).items() if k and n > 1]
    report["stages"]["xp"] = {
        "total_rows": len(xp_rows),
        "active": active_xp,
        "points_active": points,
        "by_source": dict(by_source),
        "by_bucket": dict(by_bucket),
        "duplicate_source_keys": dup_keys,
        "foreign_rows": foreign,
    }
    if dup_keys:
        report["issues"].append(f"Duplicate Source Keys: {dup_keys[:10]}")

    # Streak occurrences
    streak_rows = c.list_records(
        "Streak Occurrences",
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        max_records=50,
    )
    report["stages"]["streak_occurrences"] = {
        "count": len(streak_rows),
        "sample": [
            {
                "id": r["id"],
                "days": fields_of(r).get("Gate Eligible Streak Days")
                or fields_of(r).get("Streak Days"),
                "status": fields_of(r).get("Status"),
            }
            for r in streak_rows[:5]
        ],
    }

    # Achievements / unlocks
    unlocks = c.list_records(
        "Athlete Achievement Unlocks",
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        max_records=100,
    )
    report["stages"]["achievements"] = {
        "unlock_count": len(unlocks),
        "names": [
            fields_of(r).get("Achievement Name")
            or fields_of(r).get("Achievement")
            or r["id"]
            for r in unlocks
        ],
    }

    # WAS / Perfect Week
    was_rows = c.list_records(
        "Weekly Athlete Summary",
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        max_records=50,
    )
    pw = []
    weekly_email = []
    for r in was_rows:
        f = fields_of(r)
        pw.append(
            {
                "id": r["id"],
                "week": f.get("Week - Display") or f.get("Weekly Athlete Summary - Display"),
                "eligible": f.get("Perfect Week Eligible?"),
                "status": f.get("Perfect Week Automation Status"),
                "daily_detail": str(f.get("Perfect Week Daily Check Detail") or "")[:180],
                "build": f.get("Build Weekly Email Now?"),
                "ready": f.get("Weekly Email Ready?"),
                "sent": f.get("Weekly Email Sent?"),
                "send": f.get("Send to Make?"),
                "recipients": f.get("Weekly Email Recipients"),
                "error": f.get("Weekly Email Error"),
            }
        )
        weekly_email.append(
            {
                "id": r["id"],
                "ready": f.get("Weekly Email Ready?"),
                "sent": f.get("Weekly Email Sent?"),
                "recipients": f.get("Weekly Email Recipients"),
            }
        )
    eligible_true = sum(
        1
        for x in pw
        if x["eligible"] in {1, True, "1"} or str(x["eligible"]) == "1"
    )
    report["stages"]["perfect_week"] = {
        "was_count": len(was_rows),
        "eligible_true_count": eligible_true,
        "expected_eligible": 0,
        "rows": pw,
    }
    if eligible_true > 0:
        report["issues"].append(
            "Perfect Week Eligible unexpectedly true — Athlete 1 scenario should be negative"
        )

    # Email handoffs
    email_rows = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=300,
    )
    by_type = Counter()
    by_status = Counter()
    bad_recipients = []
    hub_sent = 0
    for r in email_rows:
        f = fields_of(r)
        by_type[str(f.get("Event Type") or "?")] += 1
        by_status[str(f.get("Status") or "?")] += 1
        recips = str(f.get("Recipients JSON") or "").lower()
        if recips and SAFE not in recips:
            bad_recipients.append(r["id"])
        elif SAFE not in recips and not recips:
            bad_recipients.append(r["id"])
        resp = str(f.get("Hub Response JSON") or "")
        if '"status":"sent"' in resp or "'status': 'sent'" in resp:
            hub_sent += 1
    report["stages"]["email_handoffs"] = {
        "count": len(email_rows),
        "by_event_type": dict(by_type),
        "by_status": dict(by_status),
        "bad_recipient_ids": bad_recipients,
        "hub_sent_deliveries_detected": hub_sent,
        "weekly_count": by_type.get("WEEKLY_ATHLETE_SUMMARY", 0),
        "sample": [
            {
                "id": r["id"],
                "type": fields_of(r).get("Event Type"),
                "status": fields_of(r).get("Status"),
                "recipients": fields_of(r).get("Recipients JSON"),
                "hub_event": fields_of(r).get("Hub Event ID"),
            }
            for r in email_rows[:8]
        ],
    }
    if bad_recipients:
        report["issues"].append(f"Non-allowlisted handoff recipients: {bad_recipients[:5]}")

    # Zoom XP presence
    zoom_att = c.list_records(
        "Zoom Attendance",
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        max_records=20,
    )
    report["stages"]["zoom"] = {
        "attendance_count": len(zoom_att),
        "rows": [
            {
                "id": r["id"],
                "mode": fields_of(r).get("Attendance Mode") or fields_of(r).get("Mode"),
                "status": fields_of(r).get("Attendance Status"),
            }
            for r in zoom_att
        ],
    }

    report["ok"] = not report["issues"] and report["stages"]["identity"]["emails_ok"]
    OUT.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": report["ok"],
        "issues": report["issues"],
        "writer_status": report["writer_status"],
        "submissions": report["stages"]["submissions"],
        "xp": {
            "active": active_xp,
            "points": points,
            "by_source": dict(by_source),
            "dup_keys": len(dup_keys),
        },
        "streak_occurrences": report["stages"]["streak_occurrences"]["count"],
        "achievements": report["stages"]["achievements"]["unlock_count"],
        "pw_eligible_true": eligible_true,
        "emails": report["stages"]["email_handoffs"]["by_event_type"],
        "email_status": report["stages"]["email_handoffs"]["by_status"],
        "level": report["stages"]["identity"].get("level"),
        "streak": report["stages"]["identity"].get("streak"),
    }, indent=2, default=str))
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
