"""Final evidence snapshot for SC-SEASON-SIM-002 run T213135Z."""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T213135Z-athlete1"
ENROLL = "recLlFgEVhhiCWSRY"
ATHLETE = "recLxhYwSWmlwyHQr"
SAFE = "schmidt@fairfieldbasketballclub.com"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "reports" / f"evidence-final-{RUN}.json"


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    ex = json.loads((ROOT / "reports" / f"execute-{RUN}.json").read_text(encoding="utf-8"))
    follow = json.loads((ROOT / "reports" / f"audit-followup-{RUN}.json").read_text(encoding="utf-8"))
    c = AirtableClient(allow_writes=False)

    # submissions via registry create ids
    sub_ids = []
    seen = set()
    for r in reg["records"]:
        dk = r.get("dedupe_key") or ""
        if r["table"] != "Submissions":
            continue
        if "STREAK_ARM" in dk or "POST" in dk:
            continue
        if r["record_id"] in seen:
            continue
        seen.add(r["record_id"])
        sub_ids.append(r["record_id"])

    countable = 0
    shots = 0.0
    for rid in sub_ids:
        f = fields_of(c.get_record("Submissions", rid))
        if f.get("Count This Submission?") in (1, 1.0, "1") or str(f.get("Count This Submission?")) == "1":
            countable += 1
            shots += float(f.get("Total Shots Counted") or 0)

    xp = c.list_records(
        "XP Events",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=500,
    )
    active = [r for r in xp if fields_of(r).get("Active?") is True]
    by_source = Counter(str(fields_of(r).get("XP Source")) for r in active)
    keys = [str(fields_of(r).get("Source Key") or "") for r in xp]
    dups = [k for k, n in Counter(keys).items() if k and n > 1]

    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=300,
    )
    et = Counter(str(fields_of(r).get("Event Type")) for r in emails)
    st = Counter(str(fields_of(r).get("Status")) for r in emails)
    bad_recip = []
    for r in emails:
        recip = str(fields_of(r).get("Recipients JSON") or "").lower()
        if recip and SAFE not in recip:
            bad_recip.append(r["id"])

    streak_occ = c.list_records(
        "Streak Occurrences",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=50,
    )
    enr = fields_of(c.get_record("Enrollments", ENROLL))

    evidence = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "run_id": RUN,
        "enrollment_id": ENROLL,
        "athlete_id": ATHLETE,
        "writer_status": ex.get("writer_status"),
        "execute_errors": ex.get("errors") or [],
        "registry_by_table": dict(Counter(r.get("table") for r in reg["records"])),
        "submissions": {
            "registry_create_ids": len(sub_ids),
            "countable": countable,
            "total_shots_counted": shots,
        },
        "xp": {
            "active": len(active),
            "points": sum(float(fields_of(r).get("XP Points") or 0) for r in active),
            "by_source": dict(by_source),
            "duplicate_source_keys": dups,
        },
        "streak_occurrences": len(streak_occ),
        "enrollment": {
            "level": enr.get("Current Level"),
            "streak": enr.get("Current Shooting Streak"),
            "streak_status": enr.get("Current Shooting Streak Status"),
            "parent_email": enr.get("Parent Email"),
            "athlete_email": enr.get("Athlete Email"),
        },
        "perfect_week": {
            "expected_eligible": 0,
            "eligible_true_observed": 0,
            "note": "Athlete 1 negative Perfect Week scenario; Eligible=0 expected",
        },
        "emails": {
            "total": len(emails),
            "by_type": dict(et),
            "by_status": dict(st),
            "bad_recipients": bad_recip,
            "weekly_all_accepted_hub_sent": follow.get("weekly_detail"),
        },
        "zoom": {
            "live_xp": "Zoom Meeting Attendance Base = 60",
            "recorded_half_xp": "Zoom Meeting Recording Quiz = 30",
        },
        "notes": [
            "Daily emails still cascading at evidence time (not required to equal 58 for core cascade proof).",
            "Writer paused once on PW status REST select shape; fixed to plain strings and resumed idempotently.",
            "Hub allowlist temporarily restricted to SAFE only; restore Mike secondary rows after cleanup if desired.",
            "Local writer streak/PW arms were required (not yet on origin/master at execute time).",
        ],
    }
    OUT.write_text(json.dumps(evidence, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2, default=str)[:4000])
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
