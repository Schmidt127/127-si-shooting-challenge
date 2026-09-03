"""Deeper follow-up audit after weekly send arm."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T213135Z-athlete1"
ENROLL = "recLlFgEVhhiCWSRY"
SAFE = "schmidt@fairfieldbasketballclub.com"
OUT = Path(__file__).resolve().parent / "reports" / f"audit-followup-{RUN}.json"


def main() -> int:
    c = AirtableClient(allow_writes=False)
    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=300,
    )
    by_type = Counter(str(fields_of(r).get("Event Type")) for r in emails)
    by_status = Counter(str(fields_of(r).get("Status")) for r in emails)
    weekly = [r for r in emails if fields_of(r).get("Event Type") == "WEEKLY_ATHLETE_SUMMARY"]
    weekly_detail = []
    bad = []
    for r in weekly:
        f = fields_of(r)
        recip = str(f.get("Recipients JSON") or "").lower()
        if SAFE not in recip:
            bad.append(r["id"])
        weekly_detail.append(
            {
                "id": r["id"],
                "status": f.get("Status"),
                "recipients": f.get("Recipients JSON"),
                "hub_event": f.get("Hub Event ID"),
                "hub_sent": '"status":"sent"' in str(f.get("Hub Response JSON") or ""),
                "error": f.get("Last Error"),
            }
        )

    streak_xp = c.list_records(
        "XP Events",
        formula=(
            f"AND(FIND('{ENROLL}', {{Enrollment Record ID}} & ''),"
            f"FIND('Streak', {{XP Source}} & ''))"
        ),
        max_records=50,
    )
    milestone_xp = c.list_records(
        "XP Events",
        formula=(
            f"AND(FIND('{ENROLL}', {{Enrollment Record ID}} & ''),"
            f"FIND('Milestone', {{XP Source}} & ''))"
        ),
        max_records=50,
    )
    zoom_xp = c.list_records(
        "XP Events",
        formula=(
            f"AND(FIND('{ENROLL}', {{Enrollment Record ID}} & ''),"
            f"FIND('Zoom', {{XP Source}} & ''))"
        ),
        max_records=20,
    )
    video_xp = c.list_records(
        "XP Events",
        formula=(
            f"AND(FIND('{ENROLL}', {{Enrollment Record ID}} & ''),"
            f"FIND('Video', {{XP Source}} & ''))"
        ),
        max_records=20,
    )
    hw_xp = c.list_records(
        "XP Events",
        formula=(
            f"AND(FIND('{ENROLL}', {{Enrollment Record ID}} & ''),"
            f"FIND('Homework', {{XP Source}} & ''))"
        ),
        max_records=50,
    )

    # Streak occurrences — try several field shapes
    streak_occ = []
    for formula in [
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
    ]:
        try:
            rows = c.list_records("Streak Occurrences", formula=formula, max_records=50)
            streak_occ.append({"formula": formula, "count": len(rows), "ids": [r["id"] for r in rows]})
        except Exception as exc:  # noqa: BLE001
            streak_occ.append({"formula": formula, "error": str(exc)})

    unlocks = []
    for formula in [
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
    ]:
        try:
            rows = c.list_records("Athlete Achievement Unlocks", formula=formula, max_records=100)
            unlocks.append(
                {
                    "formula": formula,
                    "count": len(rows),
                    "names": [
                        fields_of(r).get("Achievement Name")
                        or str(fields_of(r).get("Achievement"))
                        for r in rows
                    ],
                }
            )
        except Exception as exc:  # noqa: BLE001
            unlocks.append({"formula": formula, "error": str(exc)})

    enr = fields_of(c.get_record("Enrollments", ENROLL))
    was_ids = [
        "recgQqg8r80fjv1dn",
        "recfkvvmdRFIxHsIm",
        "rectxe6f5WLSUgLSP",
        "rechzgsCsJNPC1ymj",
        "rec0o5g8jtFq0Myqy",
        "rec3i1GFvJA2FsSEW",
    ]
    was_state = []
    for wid in was_ids:
        f = fields_of(c.get_record("Weekly Athlete Summary", wid))
        was_state.append(
            {
                "id": wid,
                "ready": f.get("Weekly Email Ready?"),
                "sent": f.get("Weekly Email Sent?"),
                "send": f.get("Send to Make?"),
                "build": f.get("Build Weekly Email Now?"),
                "recipients": f.get("Weekly Email Recipients"),
                "pw_eligible": f.get("Perfect Week Eligible?"),
                "pw_status": f.get("Perfect Week Automation Status"),
                "pw_detail": str(f.get("Perfect Week Daily Check Detail") or "")[:160],
            }
        )

    report = {
        "emails_total": len(emails),
        "by_type": dict(by_type),
        "by_status": dict(by_status),
        "weekly_detail": weekly_detail,
        "weekly_bad_recipients": bad,
        "streak_xp_count": len(streak_xp),
        "streak_xp_sources": Counter(str(fields_of(r).get("XP Source")) for r in streak_xp),
        "milestone_xp_count": len(milestone_xp),
        "zoom_xp": [
            {
                "id": r["id"],
                "source": fields_of(r).get("XP Source"),
                "points": fields_of(r).get("XP Points"),
                "active": fields_of(r).get("Active?"),
            }
            for r in zoom_xp
        ],
        "video_xp_count": len(video_xp),
        "homework_xp_count": len(hw_xp),
        "streak_occurrences": streak_occ,
        "unlocks": unlocks,
        "enrollment": {
            "level": enr.get("Current Level"),
            "level_name": enr.get("Current Level Name") or enr.get("Level Name"),
            "streak": enr.get("Current Shooting Streak"),
            "streak_status": enr.get("Current Shooting Streak Status"),
            "parent": enr.get("Parent Email"),
            "athlete": enr.get("Athlete Email"),
        },
        "weekly_was": was_state,
    }
    OUT.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps({
        "emails_total": report["emails_total"],
        "by_type": report["by_type"],
        "by_status": report["by_status"],
        "weekly": [(w["id"], w["status"], w["hub_sent"]) for w in weekly_detail],
        "streak_xp": dict(report["streak_xp_sources"]),
        "milestone_xp": report["milestone_xp_count"],
        "zoom_xp": report["zoom_xp"],
        "video_xp": report["video_xp_count"],
        "hw_xp": report["homework_xp_count"],
        "streak_occ": report["streak_occurrences"],
        "unlocks": report["unlocks"],
        "enrollment": report["enrollment"],
        "was_sent": [(w["id"], w["sent"], w["pw_eligible"], w["pw_status"]) for w in was_state],
    }, indent=2, default=str))
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
