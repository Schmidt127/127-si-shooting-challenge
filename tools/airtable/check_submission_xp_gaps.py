#!/usr/bin/env python3
"""List counted submissions on active enrollments that have no SUBMISSION_XP event."""

from __future__ import annotations

from airtable_read import athlete_label, f, first_id, is_active, linked_ids, list_table, session, txt


def main() -> None:
    sess = session()
    enrollments = list_table(sess, "Enrollments", ["Active?", "Full Athlete Name", "Athlete First Name"])
    active = {r["id"] for r in enrollments if is_active(f(r).get("Active?"))}
    names = {r["id"]: athlete_label(f(r), r["id"]) for r in enrollments}

    xp = list_table(sess, "XP Events", ["Source Key", "Submission"])
    xp_keys = {txt(f(x).get("Source Key")) for x in xp}
    xp_by_sub = {first_id(f(x).get("Submission")): x["id"] for x in xp if first_id(f(x).get("Submission"))}

    subs = list_table(
        sess,
        "Submissions",
        ["Enrollment", "Activity Date", "Count This Submission?", "Total Shots Counted", "XP Events", "XP Award Status"],
    )

    gaps = []
    for sub in subs:
        sf = f(sub)
        if float(sf.get("Count This Submission?") or 0) != 1:
            continue
        if float(sf.get("Total Shots Counted") or 0) <= 0:
            continue
        eid = first_id(sf.get("Enrollment"))
        if eid not in active:
            continue
        sid = sub["id"]
        key = f"SUBMISSION_XP|{sid}"
        if key in xp_keys or sid in xp_by_sub or linked_ids(sf.get("XP Events")):
            continue
        gaps.append(
            {
                "athlete": names.get(eid, eid),
                "enrollment_id": eid,
                "submission_id": sid,
                "activity_date": str(sf.get("Activity Date", ""))[:10],
                "xp_award_status": txt(sf.get("XP Award Status")),
            }
        )

    print("=" * 60)
    print("SUBMISSION XP GAPS (090A-style)")
    print("=" * 60)
    if not gaps:
        print("PASS — no gaps found.")
        return
    print(f"FAIL — {len(gaps)} submission(s) missing XP:\n")
    for row in gaps:
        print(
            f"  {row['athlete']}\n"
            f"    submission: {row['submission_id']}  date: {row['activity_date']}\n"
            f"    enrollment: {row['enrollment_id']}  XP Award Status: {row['xp_award_status']}"
        )
    print("\nFix: python tools/airtable/fix_post_audit_repairs.py --write")


if __name__ == "__main__":
    main()
