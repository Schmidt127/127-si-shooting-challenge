#!/usr/bin/env python3
"""
Goal Conquer reconciliation — read-only.

Matches Enrollment Goal Met? / shot line vs Conquered Goal Award Recipient rows
using the rule: the full target is a one-time pinnacle; the manual recipient row
is the fulfillment record.

  python audit_goal_conquer_reconciliation.py
  python audit_goal_conquer_reconciliation.py --out _preview/goal-conquer-reconciliation.md
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, list_table, session, txt

PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"


def flat_field(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(flat_field(v) for v in value if v not in (None, ""))
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "").strip()
    return str(value).strip()


def num(value) -> float:
    if isinstance(value, list):
        return num(value[0]) if value else 0.0
    try:
        return float(str(value or 0).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def goal_met_truthy(value) -> bool:
    text = flat_field(value)
    return bool(text) and text.lower() not in {"false", "0", "no"}


def md_table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return "_No rows._\n"
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(c).replace("|", "\\|") for c in row) + " |")
    return "\n".join(lines) + "\n"


def load_conquered_award_ids(sess) -> set[str]:
    ids: set[str] = set()
    for row in list_table(sess, "Awards", ["Award Name"]):
        if "conquered goal" in txt(f(row).get("Award Name")).lower():
            ids.add(row["id"])
    return ids


def build_report(sess) -> str:
    conquered_ids = load_conquered_award_ids(sess)
    weeks = {w["id"]: txt(f(w).get("Week Name")) for w in list_table(sess, "Weeks", ["Week Name"])}

    recipients_by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for row in list_table(
        sess,
        "Award Recipients",
        ["Enrollment", "Award", "Week", "Award Scope", "Award Status", "Date Awarded"],
    ):
        rf = f(row)
        aid = first_id(rf.get("Award"))
        if aid not in conquered_ids:
            continue
        if txt(rf.get("Award Status")).lower() == "cancelled":
            continue
        eid = first_id(rf.get("Enrollment"))
        if not eid:
            continue
        recipients_by_enrollment[eid].append(
            {
                "id": row["id"],
                "week": weeks.get(first_id(rf.get("Week")), ""),
                "scope": txt(rf.get("Award Scope")),
                "status": txt(rf.get("Award Status")),
                "date": flat_field(rf.get("Date Awarded"))[:10],
            }
        )

    enrollments: list[dict] = []
    for row in list_table(
        sess,
        "Enrollments",
        [
            "Full Athlete Name",
            "Active?",
            "Total Shots Counted",
            "Target Goal Shots",
            "Goal Met?",
            "Goal Met Date",
        ],
    ):
        ef = f(row)
        if not is_active(ef.get("Active?")):
            continue
        shots = int(num(ef.get("Total Shots Counted")))
        target = int(num(ef.get("Target Goal Shots")))
        eid = row["id"]
        rows = recipients_by_enrollment.get(eid, [])
        enrollments.append(
            {
                "id": eid,
                "name": athlete_label(ef, eid),
                "shots": shots,
                "target": target,
                "goal_met_now": goal_met_truthy(ef.get("Goal Met?")),
                "goal_met_date": flat_field(ef.get("Goal Met Date"))[:40],
                "conquered_rows": rows,
                "goal_conquered": bool(rows) or (target > 0 and shots >= target),
            }
        )

    need_row = [e for e in enrollments if e["goal_met_now"] and not e["conquered_rows"]]
    row_only = [e for e in enrollments if e["conquered_rows"] and not e["goal_met_now"]]
    aligned = [e for e in enrollments if e["conquered_rows"] and e["goal_met_now"]]
    neither = [e for e in enrollments if not e["conquered_rows"] and not e["goal_met_now"]]

    dup_rows: list[list[str]] = []
    seen: dict[tuple, list[str]] = defaultdict(list)
    for eid, rows in recipients_by_enrollment.items():
        name = next((e["name"] for e in enrollments if e["id"] == eid), eid)
        for r in rows:
            key = (eid, r["week"], r["date"], r["status"])
            seen[key].append(r["id"])
    for key, ids in seen.items():
        if len(ids) > 1:
            eid, week, date, status = key
            name = next((e["name"] for e in enrollments if e["id"] == eid), eid)
            dup_rows.append([name, week or "—", date or "—", status, ", ".join(ids)])

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        "# Goal Conquer Reconciliation",
        "",
        f"_Generated {now} — read-only._",
        "",
        "## How to read this report",
        "",
        "- **Goal Met?** on Enrollment = live shot line vs target **today** (rollup can move).",
        "- **Conquered Goal Award Recipient** = your manual record that they hit the pinnacle and the gift card was logged.",
        "- **Rule:** an athlete only conquers the full target **once**; the recipient row is the permanent fulfillment log.",
        "- **Goal Met Date** lookup currently pulls dates from **all** award recipients — use Conquered Goal rows for gift-card truth until a filtered field exists.",
        "",
        "## Summary (active enrollments)",
        "",
        f"- Active enrollments: **{len(enrollments)}**",
        f"- Goal Met? true today: **{sum(1 for e in enrollments if e['goal_met_now'])}**",
        f"- Conquered Goal recipient rows: **{sum(len(e['conquered_rows']) for e in enrollments)}** athletes with **{len([r for rs in recipients_by_enrollment.values() for r in rs])}** rows",
        f"- Aligned (row + Goal Met? today): **{len(aligned)}**",
        f"- **Need manual award row** (Goal Met? today, no row): **{len(need_row)}**",
        f"- **Row is fulfillment truth** (row exists, Goal Met? blank today): **{len(row_only)}**",
        f"- Neither row nor Goal Met? today: **{len(neither)}**",
        "",
        "## Cleanup: create Conquered Goal recipient + Date Awarded",
        "",
        "_These athletes meet the shot target on today’s line but have no Conquered Goal row yet._",
        "",
        md_table(
            ["Athlete", "Shots", "Target", "Goal Met Date lookup"],
            [[e["name"], str(e["shots"]), str(e["target"]), e["goal_met_date"] or "—"] for e in sorted(need_row, key=lambda x: x["name"])],
        ),
        "",
        "## Cleanup: trust existing row (do not delete if card was sent)",
        "",
        "_Recipient row exists; Goal Met? is blank because today’s rollup is below target. Under the once-only pinnacle rule, treat the row as the conquer record unless the card was never sent._",
        "",
        md_table(
            ["Athlete", "Shots", "Target", "Week", "Status", "Date Awarded", "Recipient ID"],
            [
                [
                    e["name"],
                    str(e["shots"]),
                    str(e["target"]),
                    r["week"] or "—",
                    r["status"],
                    r["date"] or "—",
                    r["id"][:12],
                ]
                for e in sorted(row_only, key=lambda x: x["name"])
                for r in e["conquered_rows"]
            ],
        ),
        "",
        "## Aligned",
        "",
        md_table(
            ["Athlete", "Shots", "Target", "Week", "Status", "Date"],
            [
                [
                    e["name"],
                    str(e["shots"]),
                    str(e["target"]),
                    r["week"] or "—",
                    r["status"],
                    r["date"] or "—",
                ]
                for e in sorted(aligned, key=lambda x: x["name"])
                for r in e["conquered_rows"]
            ],
        ),
        "",
        "## Duplicate Conquered Goal rows (same athlete + week + date)",
        "",
        md_table(["Athlete", "Week", "Date", "Status", "Record IDs"], dup_rows),
        "",
        "## Recommended Airtable views",
        "",
        "1. **Need Conquered Goal award** — Enrollment: Goal Met? is not empty AND no linked Conquered Goal recipient (or use this report).",
        "2. **Conquered Goal fulfillment** — Award Recipients filtered to Conquered Goal award.",
        "3. **Duplicate weekly award** — Award Recipients: group by Enrollment + Award + Week; flag count > 1.",
        "",
        "## Optional schema (when ready)",
        "",
        "- **Goal Conquered?** — true if Conquered Goal recipient exists OR shots ≥ target.",
        "- **Conquered Goal Date** — lookup `Date Awarded` from Conquered Goal recipients only.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(PREVIEW_DIR / "goal-conquer-reconciliation.md"))
    args = parser.parse_args()

    sess = session()
    report = build_report(sess)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
