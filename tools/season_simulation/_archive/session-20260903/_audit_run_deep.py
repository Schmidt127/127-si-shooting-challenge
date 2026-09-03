"""Deep read-only audit pass 2 for season sim run."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import (  # noqa: E402
    AirtableClient,
    as_number,
    fields_of,
    is_truthy,
    linked_ids,
    txt,
)

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
ATHLETE = "recGTljTSqelacjyp"
SAFE = "schmidt@fairfieldbasketballclub.com"
ROOT = Path(__file__).resolve().parent


def try_list(c: AirtableClient, table: str, formula: str, max_records: int = 500):
    try:
        rows = c.list_records(table, formula=formula, max_records=max_records)
        return rows, None
    except Exception as exc:  # noqa: BLE001
        return [], str(exc)


def main() -> int:
    c = AirtableClient(allow_writes=False)
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    out: dict = {"run_id": RUN, "sections": {}}

    # Enrollment snapshot
    ef = fields_of(c.get_record("Enrollments", ENROLL))
    keep = {
        k: ef[k]
        for k in sorted(ef)
        if any(
            x in k.lower()
            for x in (
                "xp",
                "level",
                "gate",
                "streak",
                "shot",
                "parent",
                "email",
                "perfect",
                "active",
                "current",
                "meets",
                "grade",
                "video",
                "homework",
                "zoom",
                "total",
                "submission",
            )
        )
    }
    out["sections"]["enrollment"] = keep

    # XP Events — multiple strategies
    xp_all: list[dict] = []
    strategies = [
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment Record ID}}))",
        f"FIND('{ENROLL}', {{Source Key}})",
        f"FIND('SEASON-SIM', {{Source Key}})",
    ]
    strat_results = {}
    for formula in strategies:
        rows, err = try_list(c, "XP Events", formula)
        strat_results[formula] = {"count": len(rows), "error": err}
        if rows and not xp_all:
            xp_all = rows
        elif rows and formula.startswith("FIND('SEASON-SIM"):
            # keep separate
            out["sections"]["xp_season_sim_any"] = [
                {
                    "id": r["id"],
                    "Source Key": fields_of(r).get("Source Key"),
                    "Enrollment": linked_ids(fields_of(r).get("Enrollment")),
                    "XP Points": fields_of(r).get("XP Points"),
                }
                for r in rows[:30]
            ]

    # Also by submission Source Key samples + all if needed
    sub_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Submissions"]
    hw_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Homework Completions"]
    vf_ids = sorted(
        {r["record_id"] for r in reg["records"] if r["table"] == "Video Feedback"}
    )
    za_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Zoom Attendance"]

    linked_by_source: list[dict] = []
    for rid in sub_ids + hw_ids + vf_ids + za_ids:
        rows, err = try_list(c, "XP Events", f"FIND('{rid}', {{Source Key}})", 20)
        for r in rows:
            if r["id"] not in {x["id"] for x in linked_by_source}:
                linked_by_source.append(r)

    # Merge enrollment-linked
    if not xp_all:
        xp_all = linked_by_source
    else:
        seen = {r["id"] for r in xp_all}
        for r in linked_by_source:
            if r["id"] not in seen:
                xp_all.append(r)

    # Date window + enrollment filter
    date_rows, date_err = try_list(
        c,
        "XP Events",
        "AND(IS_AFTER({XP Activity Date}, '2027-04-30'), IS_BEFORE({XP Activity Date}, '2027-07-02'))",
        500,
    )
    date_linked = []
    for r in date_rows:
        f = fields_of(r)
        eids = linked_ids(f.get("Enrollment"))
        erid = f.get("Enrollment Record ID")
        erids = erid if isinstance(erid, list) else ([erid] if erid else [])
        erids = [str(x) for x in erids]
        if ENROLL in eids or ENROLL in erids:
            date_linked.append(r)

    by_prefix = Counter()
    by_source = Counter()
    by_bucket = Counter()
    details = []
    for r in xp_all:
        f = fields_of(r)
        sk = str(f.get("Source Key") or "")
        by_prefix[sk.split("|")[0] if sk else "(empty)"] += 1
        by_source[txt(f.get("XP Source"))] += 1
        by_bucket[txt(f.get("XP Bucket"))] += 1
        details.append(
            {
                "id": r["id"],
                "Source Key": sk,
                "XP Points": f.get("XP Points"),
                "XP Source": txt(f.get("XP Source")),
                "XP Bucket": txt(f.get("XP Bucket")),
                "XP Award Status": f.get("XP Award Status"),
                "Active?": f.get("Active?"),
                "Processed": f.get("Processed"),
                "XP Reason Public": (f.get("XP Reason Public") or "")[:80],
            }
        )

    out["sections"]["xp"] = {
        "strategies": strat_results,
        "count": len(xp_all),
        "by_source_key_prefix": dict(by_prefix),
        "by_xp_source": dict(by_source),
        "by_bucket": dict(by_bucket),
        "date_window_total": len(date_rows),
        "date_window_error": date_err,
        "date_window_linked_to_enroll": len(date_linked),
        "details": details,
    }

    # Streak Occurrences
    streak_rows, streak_err = try_list(
        c, "Streak Occurrences", f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))"
    )
    if not streak_rows:
        streak_rows, streak_err2 = try_list(
            c, "Streak Occurrences", f"FIND('{ATHLETE}', ARRAYJOIN({{Athlete}}))"
        )
        streak_err = streak_err or streak_err2
    # also by source key
    if not streak_rows:
        for rid in sub_ids[:10]:
            rows, _ = try_list(
                c, "Streak Occurrences", f"FIND('{rid}', {{Source Key}} & '' )", 20
            )
            streak_rows.extend(rows)
    out["sections"]["streaks"] = {
        "count": len(streak_rows),
        "error": streak_err,
        "sample": [
            {k: fields_of(r).get(k) for k in list(fields_of(r).keys())[:15]}
            for r in streak_rows[:10]
        ],
    }

    # Unlocks again
    unlocks, unlock_err = try_list(
        c,
        "Athlete Achievement Unlocks",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
    )
    if not unlocks:
        unlocks, unlock_err = try_list(
            c,
            "Athlete Achievement Unlocks",
            f"FIND('{ATHLETE}', ARRAYJOIN({{Athlete}}))",
        )
    out["sections"]["unlocks"] = {
        "count": len(unlocks),
        "error": unlock_err,
        "ids": [r["id"] for r in unlocks],
        "sample_fields": [fields_of(r) for r in unlocks[:5]],
    }

    # Email Handoff Queue
    email_formulas = [
        f"{{Enrollment Record ID}}='{ENROLL}'",
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{ENROLL}', {{Payload JSON}})",
        f"FIND('{SAFE}', {{Recipients JSON}})",
        f"FIND('{RUN}', {{Payload JSON}})",
        f"FIND('{RUN}', {{Handoff Key}})",
        f"FIND('SEASON-SIM', {{Handoff Key}})",
    ]
    email_hits = {}
    all_email: dict[str, dict] = {}
    for formula in email_formulas:
        rows, err = try_list(c, "Email Handoff Queue", formula, 300)
        email_hits[formula] = {"count": len(rows), "error": err}
        for r in rows:
            all_email[r["id"]] = r

    recip_all = set()
    status_c = Counter()
    event_c = Counter()
    unsafe = []
    email_details = []
    for r in all_email.values():
        f = fields_of(r)
        status_c[txt(f.get("Status"))] += 1
        event_c[txt(f.get("Event Type"))] += 1
        recip_raw = f.get("Recipients JSON") or ""
        recip_all.add(str(recip_raw)[:200])
        # parse recipients
        try:
            parsed = json.loads(recip_raw) if isinstance(recip_raw, str) and recip_raw.startswith("[") else recip_raw
        except json.JSONDecodeError:
            parsed = recip_raw
        emails_found = []
        blob = json.dumps(parsed) if not isinstance(parsed, str) else parsed
        if SAFE in blob.lower():
            emails_found.append(SAFE)
        # any other emails
        import re

        for m in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", blob):
            emails_found.append(m.lower())
            if m.lower() != SAFE:
                unsafe.append({"id": r["id"], "email": m.lower(), "event": f.get("Event Type")})
        email_details.append(
            {
                "id": r["id"],
                "Status": txt(f.get("Status")),
                "Event Type": txt(f.get("Event Type")),
                "Handoff Key": f.get("Handoff Key"),
                "Source Table": f.get("Source Table"),
                "Source Record ID": f.get("Source Record ID"),
                "Send to Hub?": f.get("Send to Hub?"),
                "Test Mode?": f.get("Test Mode?"),
                "Hub Error": f.get("Hub Error"),
                "Last Error": f.get("Last Error"),
                "recipients_parsed": sorted(set(emails_found)),
            }
        )

    out["sections"]["email_handoff"] = {
        "strategies": email_hits,
        "unique_rows": len(all_email),
        "by_status": dict(status_c),
        "by_event_type": dict(event_c),
        "unsafe_recipients": unsafe,
        "details": email_details,
    }

    # WAS detail per row
    was_ids = sorted(
        {
            r["record_id"]
            for r in reg["records"]
            if r["table"] == "Weekly Athlete Summary" and r.get("record_id")
        }
        | set((reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or [])
    )
    was_details = []
    for i in range(0, len(was_ids), 20):
        part = was_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in part) + ")"
        rows, err = try_list(c, "Weekly Athlete Summary", formula, 100)
        for r in rows:
            f = fields_of(r)
            was_details.append(
                {
                    "id": r["id"],
                    "Week": linked_ids(f.get("Week")),
                    "Total Shots Counted": f.get("Total Shots Counted"),
                    "Total Makes Counted": f.get("Total Makes Counted"),
                    "Submission Count": f.get("Submission Count")
                    or f.get("Counted Submission Count"),
                    "Perfect Week Eligible?": f.get("Perfect Week Eligible?"),
                    "Perfect Week Daily Requirement Met?": f.get(
                        "Perfect Week Daily Requirement Met?"
                    )
                    or f.get("Perfect Week Daily Requirement Met? Calculated"),
                    "Perfect Week Daily Check Status": f.get(
                        "Perfect Week Daily Check Status"
                    ),
                    "Perfect Week Automation Status": f.get(
                        "Perfect Week Automation Status"
                    ),
                    "Perfect Week Automation Error": f.get(
                        "Perfect Week Automation Error"
                    ),
                    "Perfect Week Calculation Queue?": f.get(
                        "Perfect Week Calculation Queue?"
                    ),
                    "Perfect Week Video Requirement Met?": f.get(
                        "Perfect Week Video Requirement Met?"
                    ),
                    "Perfect Week Homework Requirement Met?": f.get(
                        "Perfect Week Homework Requirement Met?"
                    ),
                    "Perfect Week Zoom Requirement Met?": f.get(
                        "Perfect Week Zoom Requirement Met?"
                    ),
                    "Build Weekly Email?": f.get("Build Weekly Email?"),
                    "Ready to Send Weekly Email?": f.get("Ready to Send Weekly Email?"),
                    "Weekly Email Status": f.get("Weekly Email Status")
                    or f.get("Email Status"),
                    "Goal Record": linked_ids(f.get("Goal Record")),
                    "Enrollment": linked_ids(f.get("Enrollment")),
                    "Grade Band": linked_ids(f.get("Grade Band"))
                    or f.get("Grade Band"),
                }
            )
    out["sections"]["was_details"] = was_details

    # Homework / Video / Zoom ready flags
    hw_details = []
    for i in range(0, len(hw_ids), 20):
        part = hw_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in part) + ")"
        rows, _ = try_list(c, "Homework Completions", formula, 100)
        for r in rows:
            f = fields_of(r)
            interesting = {
                k: f[k]
                for k in f
                if any(
                    x in k.lower()
                    for x in ("xp", "ready", "status", "email", "award", "active", "queue")
                )
            }
            hw_details.append({"id": r["id"], **interesting})
    out["sections"]["homework_details"] = hw_details

    vf_details = []
    if vf_ids:
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in vf_ids) + ")"
        rows, _ = try_list(c, "Video Feedback", formula, 50)
        for r in rows:
            f = fields_of(r)
            interesting = {
                k: f[k]
                for k in f
                if any(
                    x in k.lower()
                    for x in (
                        "xp",
                        "ready",
                        "status",
                        "email",
                        "award",
                        "posted",
                        "feedback",
                        "active",
                        "queue",
                    )
                )
            }
            vf_details.append({"id": r["id"], **interesting})
    out["sections"]["video_details"] = vf_details

    za_details = []
    if za_ids:
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in za_ids) + ")"
        rows, _ = try_list(c, "Zoom Attendance", formula, 20)
        for r in rows:
            f = fields_of(r)
            interesting = {
                k: f[k]
                for k in f
                if any(
                    x in k.lower()
                    for x in (
                        "xp",
                        "ready",
                        "status",
                        "credit",
                        "meeting",
                        "duration",
                        "award",
                        "type",
                        "mode",
                    )
                )
            }
            za_details.append({"id": r["id"], **interesting})
    out["sections"]["zoom_details"] = za_details

    # Submission automation readiness sample
    sub_ready = Counter()
    week_assigned = Counter()
    for i in range(0, len(sub_ids), 20):
        part = sub_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in part) + ")"
        rows, _ = try_list(c, "Submissions", formula, 100)
        for r in rows:
            f = fields_of(r)
            sub_ready[str(f.get("Ready for Weekly Summary?"))] += 1
            week_assigned[str(bool(linked_ids(f.get("Week"))))] += 1
            # XP related if any
            for k in f:
                if "xp" in k.lower() or "base xp" in k.lower():
                    sub_ready[f"field:{k}={f[k]}"] += 1
    out["sections"]["submission_automation"] = {
        "ready_for_weekly_summary": dict(sub_ready),
        "has_week_link": dict(week_assigned),
    }

    # Same-day exception day
    same_day_fail = []
    for i in range(0, len(sub_ids), 20):
        part = sub_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in part) + ")"
        rows, _ = try_list(c, "Submissions", formula, 100)
        for r in rows:
            f = fields_of(r)
            if as_number(f.get("Submitted Same Day?")) != 1:
                same_day_fail.append(
                    {
                        "id": r["id"],
                        "Activity Date": f.get("Activity Date"),
                        "Submitted Same Day?": f.get("Submitted Same Day?"),
                        "Perfect Week Grace Eligible?": f.get(
                            "Perfect Week Grace Eligible?"
                        ),
                        "Perfect Week Countable Submission?": f.get(
                            "Perfect Week Countable Submission?"
                        ),
                        "Perfect Week Manual Exception?": f.get(
                            "Perfect Week Manual Exception?"
                        ),
                        "Season Sim Test Submitted At": f.get(
                            "Season Sim Test Submitted At"
                        ),
                    }
                )
    out["sections"]["same_day_exceptions"] = same_day_fail

    path = ROOT / "reports" / f"audit-deep-{RUN}.json"
    path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    summary = {
        "path": str(path),
        "xp_count": out["sections"]["xp"]["count"],
        "xp_by_prefix": out["sections"]["xp"]["by_source_key_prefix"],
        "streaks": out["sections"]["streaks"]["count"],
        "unlocks": out["sections"]["unlocks"]["count"],
        "email_rows": out["sections"]["email_handoff"]["unique_rows"],
        "email_status": out["sections"]["email_handoff"]["by_status"],
        "email_events": out["sections"]["email_handoff"]["by_event_type"],
        "unsafe": out["sections"]["email_handoff"]["unsafe_recipients"],
        "was_count": len(out["sections"]["was_details"]),
        "enrollment_level": {
            k: keep.get(k)
            for k in (
                "Current Level",
                "Level Status",
                "Gate Passes",
                "Meets Gate: Submissions",
                "Meets Gate: Homework",
                "Meets Gate: Videos",
                "Meets Gate: Streak",
                "Meets Gate: Zoom Meetings",
            )
            if k in keep or True
        },
        "same_day_fail_count": len(same_day_fail),
    }
    print(json.dumps(summary, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
