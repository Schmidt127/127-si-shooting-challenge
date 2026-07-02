#!/usr/bin/env python3
"""Snapshot for Lincoln + Jackson Newcomer — shots, XP, submissions (read-only)."""

from __future__ import annotations

from airtable_read import f, first_id, linked_ids, list_table, session, txt

NEWCOMERS = {
    "rec8Z5KzsNif6mtpG": "Lincoln Newcomer",
    "recmhY61iU2AwEiMI": "Jackson Newcomer",
}


def main() -> None:
    sess = session()
    enrollments = list_table(
        sess,
        "Enrollments",
        [
            "Lifetime XP Earned",
            "Lifetime XP Total",
            "Total Shots Counted",
            "Total Submissions",
            "Current Level - Public Facing Display",
        ],
    )
    by_id = {r["id"]: r for r in enrollments}

    subs = list_table(
        sess,
        "Submissions",
        ["Enrollment", "Activity Date", "Shot Total", "Total Shots Counted", "Count This Submission?", "XP Events", "XP Award Status"],
    )

    print("=" * 60)
    print("NEWCOMER BROTHERS STATUS")
    print("=" * 60)

    for eid, label in NEWCOMERS.items():
        enr = by_id.get(eid)
        if not enr:
            print(f"\n{label}: enrollment {eid} NOT FOUND")
            continue
        ef = f(enr)
        print(f"\n{label} ({eid})")
        print(f"  Level:        {txt(ef.get('Current Level - Public Facing Display'))}")
        print(f"  Shots:        {ef.get('Total Shots Counted')}")
        print(f"  Submissions:  {ef.get('Total Submissions')}")
        print(f"  Lifetime XP:  {ef.get('Lifetime XP Earned') or ef.get('Lifetime XP Total')}")

        recent = []
        for sub in subs:
            if first_id(f(sub).get("Enrollment")) != eid:
                continue
            sf = f(sub)
            ad = str(sf.get("Activity Date", ""))[:10]
            if ad < "2026-06-20":
                continue
            xp_linked = linked_ids(sf.get("XP Events"))
            recent.append(
                (
                    ad,
                    sf.get("Shot Total"),
                    sf.get("Total Shots Counted"),
                    sf.get("Count This Submission?"),
                    txt(sf.get("XP Award Status")),
                    len(xp_linked),
                    sub["id"],
                )
            )
        recent.sort()
        print(f"  Recent subs (Jun 20+): {len(recent)}")
        for row in recent:
            ad, shot, counted, cts, status, nxp, sid = row
            flag = " OK" if nxp else " ** NO XP **"
            print(f"    {ad}  shots={shot}  counted={counted}  cts={cts}  {status}  xp_events={nxp}{flag}  {sid}")

    print("\nIf any row shows NO XP: python tools/airtable/fix_post_audit_repairs.py --write")


if __name__ == "__main__":
    main()
