#!/usr/bin/env python3
"""Check final challenge summary email staging on Weekly Athlete Summary (read-only)."""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, list_table, session, txt

PREVIEW = Path(__file__).resolve().parent / "_preview"


def main() -> None:
    sess = session()
    enrollments = list_table(
        sess,
        "Enrollments",
        ["Active?", "Full Athlete Name", "Athlete First Name", "Parent Email - Cleaned", "Athlete Email - Cleaned"],
    )
    active_rows = [r for r in enrollments if is_active(f(r).get("Active?"))]

    was = list_table(
        sess,
        "Weekly Athlete Summary",
        [
            "Enrollment",
            "Week",
            "Weekly Email Subject",
            "Weekly Email HTML",
            "Weekly Email Ready?",
            "Weekly Email Sent?",
            "Weekly Email Recipients",
            "Weekly Email Revision",
        ],
    )
    by_eid: dict[str, list[dict]] = defaultdict(list)
    for row in was:
        eid = first_id(f(row).get("Enrollment"))
        if eid:
            by_eid[eid].append(row)

    buckets = {
        "no_was": [],
        "no_email": [],
        "not_built": [],
        "built_ready": [],
        "built_not_ready": [],
        "sent": [],
    }

    for enr in active_rows:
        eid = enr["id"]
        ef = f(enr)
        name = athlete_label(ef, eid)
        parent = txt(ef.get("Parent Email - Cleaned"))
        athlete = txt(ef.get("Athlete Email - Cleaned"))
        rows = by_eid.get(eid, [])

        if not rows:
            buckets["no_was"].append((name, eid))
            continue
        if not parent and not athlete:
            buckets["no_email"].append((name, eid))
            continue

        final = [
            r
            for r in rows
            if "final" in txt(f(r).get("Weekly Email Subject")).lower()
        ]
        if not final or not any(txt(f(r).get("Weekly Email HTML")) for r in final):
            buckets["not_built"].append((name, eid, len(rows)))
            continue

        best = final[0]
        bf = f(best)
        if is_active(bf.get("Weekly Email Sent?")):
            buckets["sent"].append((name, eid, best["id"]))
        elif is_active(bf.get("Weekly Email Ready?")) and txt(bf.get("Weekly Email HTML")):
            recips = txt(bf.get("Weekly Email Recipients"))
            buckets["built_ready"].append((name, eid, best["id"], recips or "(recipients empty)"))
        else:
            buckets["built_not_ready"].append((name, eid, best["id"]))

    print("=" * 60)
    print("FINAL EMAIL STAGING CHECK")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Active enrollments: {len(active_rows)}")
    print("=" * 60)

    def section(title: str, items: list, fmt) -> None:
        print(f"\n{title}: {len(items)}")
        for item in items[:15]:
            print("  " + fmt(item))
        if len(items) > 15:
            print(f"  ... +{len(items) - 15} more")

    section("No Weekly Athlete Summary (skip final email)", buckets["no_was"], lambda x: f"{x[0]}  {x[1]}")
    section("No email on file", buckets["no_email"], lambda x: f"{x[0]}  {x[1]}")
    section("Has WAS but Final HTML not built yet", buckets["not_built"], lambda x: f"{x[0]}  ({x[2]} WAS rows)  {x[1]}")
    section("Final built, NOT ready", buckets["built_not_ready"], lambda x: f"{x[0]}  WAS {x[2]}")
    section("Final built + READY (review then send)", buckets["built_ready"], lambda x: f"{x[0]}  WAS {x[2]}  recipients: {x[3]}")
    section("Final already SENT", buckets["sent"], lambda x: f"{x[0]}  WAS {x[2]}")

    # Export TSV for staff
    PREVIEW.mkdir(exist_ok=True)
    out = PREVIEW / "final-email-staging-status.tsv"
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["status", "athlete", "enrollment_id", "was_id", "note"])
        for name, eid in buckets["no_was"]:
            w.writerow(["no_was", name, eid, "", ""])
        for name, eid in buckets["no_email"]:
            w.writerow(["no_email", name, eid, "", ""])
        for name, eid, n in buckets["not_built"]:
            w.writerow(["not_built", name, eid, "", f"{n} WAS rows"])
        for name, eid, wid in buckets["built_not_ready"]:
            w.writerow(["built_not_ready", name, eid, wid, ""])
        for name, eid, wid, rec in buckets["built_ready"]:
            w.writerow(["built_ready", name, eid, wid, rec])
        for name, eid, wid in buckets["sent"]:
            w.writerow(["sent", name, eid, wid, ""])
    print(f"\nExported: {out}")

    need_build = len(buckets["not_built"])
    if need_build:
        print(f"\nACTION: Run 090G Airtable script (CONFIRM_BUILD) for ~{need_build} athletes still missing Final HTML.")
    elif buckets["built_ready"]:
        print("\nACTION: Review HTML in Airtable, set Send to Make?, run automation 074.")


if __name__ == "__main__":
    main()
