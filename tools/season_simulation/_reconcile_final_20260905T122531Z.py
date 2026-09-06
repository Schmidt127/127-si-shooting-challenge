"""Final reconcile before cleanup — SEASON-SIM-2027-20260905T122531Z-athlete1."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260905T122531Z-athlete1"
ENROLL = "recmImoXTlKb5NWSY"
ATHLETE = "recMuAvqA0zH1eGFj"
SAFE = "schmidt@fairfieldbasketballclub.com"
OUT = ROOT / "reports" / f"reconcile-final-{RUN}.json"
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    c = AirtableClient(allow_writes=False)
    report: dict = {
        "run_id": RUN,
        "enrollment_id": ENROLL,
        "athlete_id": ATHLETE,
        "expected": {
            "submissions": 58,
            "miss_days": 3,
            "shots": 13906,
            "homework_completions": 18,
            "video_feedback_creates": 4,
            "perfect_week_eligible": 0,
            "email_recipient": SAFE,
        },
        "actual": {},
        "discrepancies": [],
        "email_safety": {},
        "extras_for_cleanup": {},
    }

    enr = fields_of(c.get_record("Enrollments", ENROLL))
    parent = str(enr.get("Parent Email") or "").strip().lower()
    athlete_email = str(enr.get("Athlete Email") or "").strip().lower()
    report["actual"]["identity"] = {
        "parent_email": parent,
        "athlete_email": athlete_email,
        "total_shots": enr.get("Total Shots Counted"),
        "streak": enr.get("Current Shooting Streak"),
        "streak_status": enr.get("Current Shooting Streak Status"),
    }
    if parent != SAFE or athlete_email != SAFE:
        report["discrepancies"].append(f"Unsafe enrollment emails: {parent=} {athlete_email=}")

    sub_ids = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Submissions" and "|SUB|D" in (r.get("dedupe_key") or "")
    ]
    countable = 0
    future = 0
    same_day = 0
    for rid in sub_ids:
        f = fields_of(c.get_record("Submissions", rid))
        if f.get("Count This Submission?") in (1, True) or str(f.get("Count This Submission?")) in {"1", "1.0"}:
            countable += 1
        if f.get("Activity Date Is Future?") in (1, True) or str(f.get("Activity Date Is Future?")) in {"1", "1.0"}:
            future += 1
        if f.get("Submitted Same Day?") in (1, True) or str(f.get("Submitted Same Day?")) in {"1", "1.0"}:
            same_day += 1
    report["actual"]["submissions"] = {
        "create_count": len(sub_ids),
        "countable": countable,
        "future_1": future,
        "same_day_1": same_day,
    }
    if len(sub_ids) != 58:
        report["discrepancies"].append(f"Submission create count {len(sub_ids)} != 58")
    if countable != 58:
        report["discrepancies"].append(f"Countable {countable} != 58")
    if future != 0:
        report["discrepancies"].append(f"Activity Date Is Future?=1 on {future} rows")
    if same_day not in (57, 58):
        report["discrepancies"].append(f"Submitted Same Day count {same_day} (expected 57)")

    shots = enr.get("Total Shots Counted")
    if shots != 13906:
        report["discrepancies"].append(f"Total Shots Counted {shots} != 13906")

    # XP via MCP-style filter — use REST formula FIND on enrollment id in Source Key too
    xp_rows = c.list_records(
        "XP Events",
        fields=["Source Key", "XP Points", "Active?", "Enrollment"],
        formula=f"OR(FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}&'')), FIND('{ENROLL}', {{Source Key}}&''))",
    )
    prefixes = Counter()
    active_n = 0
    submission_xp_keys = set()
    for row in xp_rows:
        f = fields_of(row)
        sk = str(f.get("Source Key") or "")
        prefixes[sk.split("|")[0] if sk else ""] += 1
        if f.get("Active?") is True:
            active_n += 1
        if sk.startswith("SUBMISSION_XP|"):
            submission_xp_keys.add(sk)
    report["actual"]["xp"] = {
        "total_rows": len(xp_rows),
        "active": active_n,
        "by_prefix": dict(prefixes),
        "submission_xp_unique": len(submission_xp_keys),
    }
    if len(submission_xp_keys) < 58:
        report["discrepancies"].append(
            f"SUBMISSION_XP unique keys {len(submission_xp_keys)} < 58 (cascade may still be incomplete or some skipped)"
        )

    streaks = c.list_records(
        "Streak Occurrences",
        fields=["Enrollment"],
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}&''))",
    )
    report["actual"]["streaks"] = {"count": len(streaks)}
    if len(streaks) < 1:
        report["discrepancies"].append("No Streak Occurrences for enrollment")

    unlocks = c.list_records(
        "Athlete Achievement Unlocks",
        fields=["Enrollment"],
        formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}&''))",
    )
    report["actual"]["unlocks"] = {"count": len(unlocks)}

    was_ids = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Weekly Athlete Summary" and "|WAS|" in (r.get("dedupe_key") or "") and "REQUEUE" not in (r.get("dedupe_key") or "")
    ]
    pw = 0
    for rid in sorted(set(was_ids)):
        f = fields_of(c.get_record("Weekly Athlete Summary", rid))
        val = f.get("Perfect Week Eligible?")
        if val in (1, True) or str(val) in {"1", "1.0", "true", "True"}:
            pw += 1
    report["actual"]["perfect_week"] = {"was": len(set(was_ids)), "eligible": pw}
    if pw != 0:
        report["discrepancies"].append(f"Perfect Week Eligible={pw} (expected 0)")

    hc = sum(1 for r in reg["records"] if r["table"] == "Homework Completions")
    vf = sum(1 for r in reg["records"] if r["table"] == "Video Feedback" and "ARM" not in (r.get("dedupe_key") or "").upper())
    report["actual"]["homework_registry"] = hc
    report["actual"]["video_feedback_registry_rows"] = vf
    if hc != 18:
        report["discrepancies"].append(f"Homework Completions registry {hc} != 18")

    # Emails — all statuses for this enrollment
    queue = c.list_records(
        "Email Handoff Queue",
        fields=["Handoff Key", "Status", "Recipients JSON", "Enrollment Record ID", "Event Type", "Template Key"],
        formula=f"OR({{Enrollment Record ID}}='{ENROLL}', FIND('{ENROLL}', {{Recipients JSON}}&''), FIND('{ENROLL}', {{Handoff Key}}&''))",
    )
    all_emails: set[str] = set()
    bad = []
    by_status = Counter()
    by_event = Counter()
    for row in queue:
        f = fields_of(row)
        recipients = str(f.get("Recipients JSON") or "")
        emails = {e.lower() for e in EMAIL_RE.findall(recipients)}
        all_emails |= emails
        by_status[str(f.get("Status") or "")] += 1
        by_event[str(f.get("Event Type") or "")] += 1
        for e in emails:
            if e != SAFE:
                bad.append({"id": row["id"], "email": e, "key": f.get("Handoff Key")})
    report["email_safety"] = {
        "handoff_count": len(queue),
        "all_recipients": sorted(all_emails),
        "bad_recipients": bad,
        "by_status": dict(by_status),
        "by_event": dict(by_event),
        "all_allowlisted": not bad and (not all_emails or all_emails == {SAFE}),
    }
    if bad:
        report["discrepancies"].append(f"NON-ALLOWLISTED EMAIL RECIPIENTS: {bad}")
        report["STOP"] = True

    # Extras owned by enrollment but not always in registry (for cleanup note)
    report["extras_for_cleanup"] = {
        "xp_event_ids": [r["id"] for r in xp_rows],
        "streak_ids": [r["id"] for r in streaks],
        "unlock_ids": [r["id"] for r in unlocks],
        "email_handoff_ids": [r["id"] for r in queue],
        "note": "Cleanup CLI deletes registry-scoped rows; enrollment-scoped XP/streaks/unlocks/emails may need extras pass",
    }

    report["ok_for_cleanup"] = not report.get("STOP") and parent == SAFE
    report["pass"] = len(report["discrepancies"]) == 0
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "pass": report["pass"],
        "ok_for_cleanup": report["ok_for_cleanup"],
        "STOP": report.get("STOP"),
        "discrepancies": report["discrepancies"],
        "email_safety": report["email_safety"],
        "actual": report["actual"],
    }, indent=2))
    print(f"Wrote {OUT}")
    if report.get("STOP"):
        return 2
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
