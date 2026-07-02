#!/usr/bin/env python3
"""
Compare June 29 Award Recipients CSV snapshot vs live Airtable (read-only).

The snapshot is treated as truth for weekly cards already sent through 6/29.

  python compare_award_recipients_snapshot.py
"""

from __future__ import annotations

import csv
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import f, first_id, is_active, list_table, session, txt

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_CSV = ROOT / "Award Recipients-Grid view from June 29 FINAL.csv"
PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"
OUT_MD = PREVIEW_DIR / "award-recipients-snapshot-vs-live.md"

# What the June 29 export called the award -> correct catalog name today
SNAPSHOT_AWARD_TO_CATALOG: dict[str, str] = {
    "Homework - Submitted & Satisfactory": "Homework Recognition Award",
    "Level Leaders": "Level Leader Award",
    "Video Submission - Submitted": "Video Submission Recognition Award",
    "Video Submission - Make the Shout out Page": "Shout-Out Video Award",
    "Zoom - Attendance": "Zoom Attendance/Participation Award",
    "Zoom - Random Drawing Winner": "Zoom Drawing — Winner",
    "Zoom - Random Drawing Runner Up": "Zoom Drawing — Runner-Up",
    "Zoom - Random Drawing Third Place": "Zoom Drawing — Third Place",
    "Shots - Conquered Goal": "Conquered Goal Award",
    "Grade Band Award - Overall Achievement": "Grade Band Achievement Award",
    "Special Awards - Dedication": "Dedication Award",
    "Special Award - Random for Incentive": "Random Drawing Incentive Award",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def norm_enroll(s: str) -> str:
    s = str(s or "").strip().strip('"')
    if s.startswith("[") and s.endswith("]"):
        s = s.strip("[]'\"")
    return norm(s)


def flat_lookup(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return norm_enroll(value[0]) if value else ""
    return norm_enroll(str(value))


def flat_athlete(value) -> str:
    if isinstance(value, list) and value:
        return str(value[0]).strip()
    return str(value or "").strip()


def week_num(label: str) -> str:
    m = re.search(r"\d+", label or "")
    return m.group(0) if m else norm(label)


def money(s) -> float:
    try:
        return float(str(s or "0").replace("$", "").replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def date_key(s: str) -> str:
    s = str(s or "")
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{int(m.group(3)):04d}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return norm(s)[:10]


def identity_key(enrollment: str, week: str, date_awarded: str) -> tuple:
    return (norm_enroll(enrollment), week_num(week), date_key(date_awarded))


def catalog_target(snapshot_award: str) -> str:
    return SNAPSHOT_AWARD_TO_CATALOG.get(snapshot_award.strip(), snapshot_award.strip())


def load_snapshot() -> list[dict]:
    rows: list[dict] = []
    with SNAPSHOT_CSV.open(newline="", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if not (r.get("Award") or "").strip():
                continue
            if not (r.get("Enrollment Name Lookup") or "").strip():
                continue
            rows.append(
                {
                    "athlete": (r.get("Athlete Name - Display") or "").strip(),
                    "enrollment": norm_enroll(r.get("Enrollment Name Lookup")),
                    "award": (r.get("Award") or "").strip(),
                    "week": (r.get("Week") or "").strip(),
                    "status": (r.get("Award Status") or "").strip(),
                    "amount": money(r.get("Award Amount")),
                    "date": (r.get("Date Awarded") or "").strip(),
                    "unique_key": (r.get("Award Recipient Unique Key") or "").strip(),
                    "scope": (r.get("Award Scope") or "").strip(),
                    "target_catalog_award": catalog_target((r.get("Award") or "").strip()),
                }
            )
    return rows


def load_live(sess) -> tuple[list[dict], dict[str, str]]:
    award_names: dict[str, str] = {}
    for row in list_table(sess, "Awards", ["Award Name", "Email Display Name"]):
        rf = f(row)
        award_names[row["id"]] = txt(rf.get("Award Name")) or txt(rf.get("Email Display Name"))

    week_names: dict[str, str] = {}
    for row in list_table(sess, "Weeks", ["Week Name", "Name"]):
        rf = f(row)
        week_names[row["id"]] = txt(rf.get("Week Name")) or txt(rf.get("Name"))

    fields = [
        "Enrollment",
        "Award",
        "Week",
        "Award Scope",
        "Award Status",
        "Date Awarded",
        "Award Amount",
        "Award Recipient Display",
        "Award Recipient Unique Key",
        "Athlete Name - Display",
        "Enrollment Name Lookup",
        "Gift Card Needed?",
    ]
    rows: list[dict] = []
    for row in list_table(sess, "Award Recipients", fields):
        rf = f(row)
        award_id = first_id(rf.get("Award"))
        week_id = first_id(rf.get("Week"))
        rows.append(
            {
                "id": row["id"],
                "athlete": flat_athlete(rf.get("Athlete Name - Display")),
                "enrollment": flat_lookup(rf.get("Enrollment Name Lookup")),
                "award": award_names.get(award_id, "(unknown)"),
                "week": week_names.get(week_id, txt(rf.get("Week"))),
                "status": txt(rf.get("Award Status")),
                "amount": money(rf.get("Award Amount")),
                "date": txt(rf.get("Date Awarded"))[:19],
                "unique_key": txt(rf.get("Award Recipient Unique Key")),
                "scope": txt(rf.get("Award Scope")),
                "display": txt(rf.get("Award Recipient Display")),
                "gift_card_needed": is_active(rf.get("Gift Card Needed?")),
            }
        )
    return rows, award_names


def find_dupes(rows: list[dict]) -> list[dict]:
    by_eaw: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        by_eaw[(r["enrollment"], norm(r["award"]), week_num(r["week"]))].append(r)
    return [
        {"enrollment": k[0], "award": k[1], "week": k[2], "rows": v}
        for k, v in sorted(by_eaw.items())
        if len(v) > 1
    ]


def compare(snap: list[dict], live: list[dict]) -> dict:
    live_by_id: dict[tuple, list[dict]] = defaultdict(list)
    for l in live:
        live_by_id[identity_key(l["enrollment"], l["week"], l["date"])].append(l)

    wrong_award: list[dict] = []
    manual_review: list[dict] = []
    matched_live_ids: set[str] = set()

    for s in snap:
        key = identity_key(s["enrollment"], s["week"], s["date"])
        candidates = live_by_id.get(key, [])
        target = s["target_catalog_award"]
        correct = [c for c in candidates if norm(c["award"]) == norm(target)]
        if len(correct) == 1:
            matched_live_ids.add(correct[0]["id"])
            continue
        if len(candidates) == 1:
            c = candidates[0]
            matched_live_ids.add(c["id"])
            if norm(c["award"]) != norm(target):
                wrong_award.append({"snap": s, "live": c, "fix_to": target})
            continue
        if len(candidates) > 1:
            manual_review.append({"snap": s, "candidates": candidates, "fix_to": target})
            continue
        manual_review.append({"snap": s, "candidates": [], "fix_to": target})

    new_rows = [l for l in live if l["id"] not in matched_live_ids and norm(l["status"]) != "cancelled"]

    status_changes = []
    for item in wrong_award:
        s, l = item["snap"], item["live"]
        if norm(s["status"]) != norm(l["status"]):
            status_changes.append({"snap": s, "live": l})

    return {
        "wrong_award": wrong_award,
        "manual_review": manual_review,
        "new_rows": new_rows,
        "status_changes": status_changes,
        "matched_live_ids": matched_live_ids,
    }


def main() -> None:
    if not SNAPSHOT_CSV.exists():
        raise SystemExit(f"Missing snapshot: {SNAPSHOT_CSV}")

    snap = load_snapshot()
    live, _ = load_live(session())
    result = compare(snap, live)
    dupes = find_dupes(live)

    wrong = result["wrong_award"]
    manual = result["manual_review"]
    new_rows = result["new_rows"]
    new_by_status: dict[str, list[dict]] = defaultdict(list)
    for r in new_rows:
        new_by_status[r["status"] or "(blank)"].append(r)

    lines = [
        "# How to fix your Award Recipients table",
        "",
        f"_Compared your **June 29 snapshot** (what you actually sent) to **live Airtable today**. Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}._",
        "",
        "## The big picture (no jargon)",
        "",
        "Your table is mostly fine. The main problem is **not missing gift cards** — it is that when award names were cleaned up, "
        "many old rows had the **Award** field pointed at the **wrong award type**.",
        "",
        "Each row is still the same athlete, same week, same date. You mostly need to **change which award is linked** on that row — "
        "**do not delete** rows for cards you already sent.",
        "",
        f"| | Count |",
        f"| --- | ---: |",
        f"| Rows in June 29 snapshot | {len(snap)} |",
        f"| Rows live now | {len(live)} |",
        f"| Rows with wrong award linked (clear fix) | **{len(wrong)}** |",
        f"| Rows needing you to pick the right match | **{len(manual)}** |",
        f"| New rows since snapshot (expected) | **{len(new_rows)}** |",
        f"| Duplicate athlete+award+week still in live | **{len(dupes)}** |",
        "",
        "---",
        "",
        "## Step-by-step: what to do in Airtable",
        "",
        "### 1. Duplicates — you already fixed these",
        "",
    ]
    if dupes:
        lines.append("There are still duplicate rows. For each, delete or cancel the extra copy:")
        for d in dupes:
            sample = d["rows"][0]
            lines.append(
                f"- **{sample['athlete']}** — {sample['award']} — Week {d['week']} "
                f"({len(d['rows'])} rows)"
            )
    else:
        lines.append("No duplicate athlete + award + week groups found. Good.")
    lines.append("")

    lines.extend(
        [
            "### 2. Fix wrong award links (~99 rows) — **most important**",
            "",
            "Open each row below. Change only the **Award** linked field to the **Fix award link to** value. "
            "Leave athlete, week, date, and **Sent** status alone.",
            "",
            "**Old name cheat sheet** (June 29 export → pick this in Awards today):",
            "",
        ]
    )
    for old, new in sorted(SNAPSHOT_AWARD_TO_CATALOG.items()):
        lines.append(f"- `{old}` → **{new}**")
    lines.append("")
    lines.append("| Athlete | Week | Date sent | Card you sent | Row says now | Fix award link to | Open row |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")
    for item in sorted(wrong, key=lambda x: (x["snap"]["athlete"], x["snap"]["week"], x["snap"]["award"])):
        s, l = item["snap"], item["live"]
        lines.append(
            f"| {s['athlete']} | {s['week']} | {date_key(s['date'])} | {s['award']} | {l['award']} | "
            f"**{item['fix_to']}** | `{l['id']}` |"
        )
    lines.append("")

    lines.extend(
        [
            "### 3. Manual review — same athlete + week + date, multiple rows",
            "",
            "These are places where **more than one award** was sent the same day, or rows got scrambled. "
            "Match each row to what you actually emailed. Change the **Award** link; delete only if you are sure it is a duplicate.",
            "",
        ]
    )
    if manual:
        for item in manual:
            s = item["snap"]
            lines.append(f"**{s['athlete']}** — {s['week']} — snapshot says you sent: **{s['award']}** → link should be **{item['fix_to']}**")
            if item["candidates"]:
                for c in item["candidates"]:
                    lines.append(f"- Live row `{c['id']}` currently: {c['award']} ({c['status']})")
            else:
                lines.append("- No live row found with same athlete + week + date — row may have been deleted")
            lines.append("")
    else:
        lines.append("_None._")
        lines.append("")

    lines.extend(
        [
            "### 4. New rows since June 29 — usually leave alone",
            "",
            "These were added for end-of-season awards, Week 9 cards, Amazon cart, etc. **Do not delete** just because they were not in the Monday export.",
            "",
        ]
    )
    for status in ["In Amazon Cart", "Sent", "Pending", "Cancelled"]:
        items = new_by_status.get(status, [])
        if not items:
            continue
        lines.append(f"**{status}** — {len(items)} rows")
        lines.append("")
        lines.append("| Athlete | Award | Week | Amount |")
        lines.append("| --- | --- | --- | --- |")
        for r in sorted(items, key=lambda x: (x["athlete"], x["week"], x["award"]))[:60]:
            lines.append(f"| {r['athlete']} | {r['award']} | {r['week']} | ${r['amount']:.0f} |")
        if len(items) > 60:
            lines.append(f"| … | {len(items) - 60} more | | |")
        lines.append("")

    lines.extend(
        [
            "---",
            "",
            "## What you do **not** need to fix",
            "",
            "- **Award name wording changed** on rows you already fixed in step 2 — that is the whole point of step 2.",
            "- **Scope** showing Weekly on an old row while the catalog says Overall — leave historical weekly rows alone.",
            "- **Goal Met?** on Enrollment disagreeing with Conquered Goal — separate cleanup (see `goal-conquer-reconciliation.md`).",
            "",
            "## Suggested order of work",
            "",
            "1. Fix the **wrong award link** table (step 2) — work week by week in Airtable.",
            "2. Work through **manual review** (step 3) — mostly Week 5 Zoom batch and Week 8/9 overlap.",
            "3. Leave **new end-of-season rows** (step 4) unless something is obviously wrong.",
            "4. Re-run this script when done to confirm wrong links are down to zero.",
            "",
        ]
    )

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_MD}")
    print(
        f"Snapshot {len(snap)} | Live {len(live)} | Wrong award {len(wrong)} | "
        f"Manual {len(manual)} | New {len(new_rows)} | Dupes {len(dupes)}"
    )


if __name__ == "__main__":
    main()
