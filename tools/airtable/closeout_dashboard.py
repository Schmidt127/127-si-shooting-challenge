#!/usr/bin/env python3
"""
Shooting Challenge 2025-2026 — WHERE ARE WE? (read-only)

Run this first. It prints plain-English status and quick health checks.

  python tools/airtable/closeout_dashboard.py

Other check scripts (also read-only):
  python tools/airtable/check_submission_xp_gaps.py
  python tools/airtable/check_final_email_staging.py
  python tools/airtable/check_newcomer_status.py
  python tools/airtable/run_final_090_audits.py   # full audit pass (slower)
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from airtable_read import (
    athlete_label,
    f,
    first_id,
    is_active,
    linked_ids,
    list_table,
    session,
    txt,
)

NEWCOMER_IDS = {
    "rec8Z5KzsNif6mtpG": "Lincoln Newcomer",
    "recmhY61iU2AwEiMI": "Jackson Newcomer",
}


def print_where_we_are() -> None:
    print(
        """
================================================================================
WHERE WE ARE — 2025-2026 Shooting Challenge close-out
================================================================================

The season is ending. We are in the "prove data is correct, then send wrap-up
emails and awards" phase. Nothing here turns off the challenge or sends email.

PHASE                          STATUS (last known)
-----------------------------  -----------------------------------------------
1. Data integrity (090 audits)   Mostly DONE — XP/submissions/homework clean
2. Newcomer shot backfill        DONE — Lincoln/Jackson Jun 26-30 submissions
3. Awards (top 3, Keep Shooting) PREVIEW files in tools/airtable/_preview/
4. Final summary EMAIL (090G)    IN PROGRESS — build in Airtable, not sent yet
5. Turn off Fillout / deactivate NOT DONE — do last

WHAT YOU RUN FROM YOUR MACHINE (needs PAT in tools/airtable/.env):
  closeout_dashboard.py          <- you are here (quick overview)
  check_submission_xp_gaps.py    any counted submission missing XP?
  check_final_email_staging.py   is final email HTML built on each athlete?
  check_newcomer_status.py       Lincoln + Jackson shots/XP snapshot
  run_final_090_audits.py        full 7-audit pass (takes ~30 sec)

WHAT STILL HAPPENS IN AIRTABLE (extension scripts, not Python):
  repair-final-090g-build-final-challenge-summary-email.js
    -> stages HTML onto Weekly Athlete Summary (DRY_RUN off, CONFIRM_BUILD on)
  Then staff reviews HTML, sets Send to Make?, automation 074 sends email.

================================================================================
"""
    )


def check_xp_rollup(sess) -> tuple[int, int]:
    enrollments = list_table(sess, "Enrollments", ["Active?", "Lifetime XP Earned", "XP Events"])
    xp_events = list_table(sess, "XP Events", ["XP Points", "Active?", "Duplicate Status"])
    xp_by_id = {r["id"]: r for r in xp_events}
    mismatches = 0
    for rec in enrollments:
        if not is_active(f(rec).get("Active?")):
            continue
        ef = f(rec)
        rollup = float(ef.get("Lifetime XP Earned") or 0)
        computed = 0.0
        for xid in linked_ids(ef.get("XP Events")):
            xp = xp_by_id.get(xid)
            if not xp:
                continue
            xf = f(xp)
            if not is_active(xf.get("Active?")):
                continue
            if xf.get("Duplicate Status") == "Duplicate - Remove":
                continue
            computed += float(xf.get("XP Points") or 0)
        if abs(computed - rollup) > 0:
            mismatches += 1
    active = sum(1 for r in enrollments if is_active(f(r).get("Active?")))
    return active, mismatches


def check_submission_xp_gaps(sess) -> tuple[int, list[tuple[str, str, str]]]:
    subs = list_table(
        sess,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Total Shots Counted", "XP Events", "XP Award Status"],
    )
    xp = list_table(sess, "XP Events", ["Source Key", "Submission"])
    xp_by_key = {txt(f(x).get("Source Key")): x["id"] for x in xp if txt(f(x).get("Source Key"))}
    enrollments = list_table(sess, "Enrollments", ["Active?", "Full Athlete Name", "Athlete First Name"])
    active = {r["id"] for r in enrollments if is_active(f(r).get("Active?"))}
    names = {r["id"]: athlete_label(f(r), r["id"]) for r in enrollments}
    gaps: list[tuple[str, str, str]] = []
    for sub in subs:
        sf = f(sub)
        if num(sf.get("Count This Submission?")) != 1:
            continue
        if float(sf.get("Total Shots Counted") or 0) <= 0:
            continue
        eid = first_id(sf.get("Enrollment"))
        if eid not in active:
            continue
        key = f"SUBMISSION_XP|{sub['id']}"
        linked = linked_ids(sf.get("XP Events"))
        has_xp = key in xp_by_key or sub["id"] in {
            first_id(f(x).get("Submission")) for x in xp if first_id(f(x).get("Submission"))
        }
        if not has_xp and not linked:
            gaps.append((names.get(eid, eid), sub["id"], eid))
    return len(gaps), gaps


def num(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def check_email_staging(sess) -> dict[str, int]:
    enrollments = list_table(
        sess,
        "Enrollments",
        ["Active?", "Full Athlete Name", "Athlete First Name", "Parent Email - Cleaned", "Athlete Email - Cleaned"],
    )
    active_ids = {r["id"] for r in enrollments if is_active(f(r).get("Active?"))}
    has_email = {
        r["id"]: bool(txt(f(r).get("Parent Email - Cleaned")) or txt(f(r).get("Athlete Email - Cleaned")))
        for r in enrollments
        if r["id"] in active_ids
    }

    was = list_table(
        sess,
        "Weekly Athlete Summary",
        [
            "Enrollment",
            "Weekly Email Subject",
            "Weekly Email HTML",
            "Weekly Email Ready?",
            "Weekly Email Sent?",
            "Weekly Email Recipients",
        ],
    )
    by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for row in was:
        eid = first_id(f(row).get("Enrollment"))
        if eid in active_ids:
            by_enrollment[eid].append(row)

    counts = {
        "active": len(active_ids),
        "no_was": 0,
        "no_email_on_file": 0,
        "final_built": 0,
        "final_ready_not_sent": 0,
        "final_sent": 0,
        "has_was_not_final": 0,
    }
    for eid in active_ids:
        rows = by_enrollment.get(eid, [])
        if not rows:
            counts["no_was"] += 1
            continue
        if not has_email.get(eid):
            counts["no_email_on_file"] += 1
        final_rows = [
            r
            for r in rows
            if "final" in txt(f(r).get("Weekly Email Subject")).lower()
            and txt(f(r).get("Weekly Email HTML"))
        ]
        if final_rows:
            counts["final_built"] += 1
            any_sent = any(is_active(f(r).get("Weekly Email Sent?")) for r in final_rows)
            any_ready = any(is_active(f(r).get("Weekly Email Ready?")) for r in final_rows)
            if any_sent:
                counts["final_sent"] += 1
            elif any_ready:
                counts["final_ready_not_sent"] += 1
        else:
            counts["has_was_not_final"] += 1
    return counts


def main() -> None:
    print_where_we_are()
    sess = session()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Live checks at {now}\n")

    active, xp_bad = check_xp_rollup(sess)
    print(f"[XP rollup]  {active - xp_bad}/{active} enrollments match Lifetime XP Earned")
    if xp_bad:
        print(f"             FAIL: {xp_bad} mismatch(es) — run run_final_090_audits.py")

    gap_count, gaps = check_submission_xp_gaps(sess)
    print(f"[Submission XP] {gap_count} counted submission(s) missing XP event")
    if gaps:
        for name, sid, _ in gaps[:10]:
            print(f"             - {name}: {sid}")
        if len(gaps) > 10:
            print(f"             ... +{len(gaps) - 10} more")
        print("             FIX: python tools/airtable/fix_post_audit_repairs.py --write")

    email = check_email_staging(sess)
    print(f"\n[Final email staging] (active enrollments: {email['active']})")
    print(f"  No Weekly Athlete Summary at all:     {email['no_was']}  (likely zero-activity athletes)")
    print(f"  Has WAS but no Final HTML built yet:  {email['has_was_not_final']}")
    print(f"  Final summary HTML built:             {email['final_built']}")
    print(f"  Final built, ready, not sent:         {email['final_ready_not_sent']}")
    print(f"  Final already sent:                   {email['final_sent']}")
    print(f"  Missing parent/athlete email:           {email['no_email_on_file']}")

    # Newcomers one-liner
    print("\n[Newcomers] run: python tools/airtable/check_newcomer_status.py")

    print("\n" + "=" * 80)
    print("NEXT STEP (pick one):")
    if gap_count:
        print("  1. Fix submission XP gaps (command above)")
    elif email["final_built"] < email["active"] - email["no_was"]:
        print("  1. In Airtable: run 090G repair script with CONFIRM_BUILD (3 batches of 25)")
        print("  2. Then: python tools/airtable/check_final_email_staging.py")
    else:
        print("  1. Review final email HTML in Airtable, then send via Make (074)")
        print("  2. Paste awards from tools/airtable/_preview/*.tsv")
    print("  Full audit anytime: python tools/airtable/run_final_090_audits.py")
    print("=" * 80)


if __name__ == "__main__":
    main()
