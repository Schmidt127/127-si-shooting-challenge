#!/usr/bin/env python3
"""SC-163 pre-conversion inventory (read-only).

Inventories every Enrollment Goal Met Date lookup value, computes the
provable first goal-crossing Activity Date, and writes a snapshot for
migration / rollback evidence.

Does not write Airtable.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, list_table, session, txt
from sc163_goal_met_date_probe import (
    compute_first_goal_met_date,
    earliest_lookup_date,
    flat,
    goal_met_truthy,
    num,
    parse_date_key,
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "audits" / "SC-163-preconversion-snapshot-20260905.json"
ROLLBACK = ROOT / "docs" / "audits" / "SC-163-preconversion-rollback-evidence-20260905.md"


def classify(row: dict) -> str:
    blank = not row["lookup_goal_met_date"]
    if blank and not row["goal_met"]:
        return "blank_and_not_met"
    if blank and row["goal_met"] and row["computed_first_date"]:
        return "blank_but_met_provable"
    if blank and row["goal_met"] and not row["computed_first_date"]:
        return "met_but_unprovable"
    if (
        not blank
        and row["computed_first_date"]
        and row["lookup_goal_met_date"] == row["computed_first_date"]
    ):
        return "nonblank_equal_to_crossing"
    if (
        not blank
        and row["computed_first_date"]
        and row["lookup_goal_met_date"] != row["computed_first_date"]
    ):
        return "nonblank_and_different"
    if not blank and row["goal_met"] and not row["computed_first_date"]:
        return "met_but_unprovable"
    if not blank and not row["goal_met"]:
        return "nonblank_not_met"
    return "other"


def main() -> int:
    sess = session()
    enrollments = list_table(
        sess,
        "Enrollments",
        [
            "Full Athlete Name",
            "Active?",
            "Total Shots Counted",
            "Target Goal Shots",
            "Goal Met?",
            "Goal Met Date",
            "Award Recipients",
        ],
    )
    submissions = list_table(
        sess,
        "Submissions",
        [
            "Enrollment",
            "Activity Date",
            "Total Shots Counted",
            "Count This Submission?",
        ],
    )
    award_recipients = list_table(
        sess,
        "Award Recipients",
        ["Enrollment", "Date Awarded", "Award", "Athlete"],
    )

    awards_by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for award in award_recipients:
        af = f(award)
        eid = first_id(af.get("Enrollment"))
        if not eid:
            continue
        awards_by_enrollment[eid].append(
            {
                "award_recipient_id": award["id"],
                "date_awarded": parse_date_key(af.get("Date Awarded")),
                "award": flat(af.get("Award")),
            }
        )

    by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for sub in submissions:
        eid = first_id(f(sub).get("Enrollment"))
        if eid:
            by_enrollment[eid].append(sub)

    rows = []
    for en in enrollments:
        ef = f(en)
        eid = en["id"]
        shots = int(num(ef.get("Total Shots Counted")))
        target = int(num(ef.get("Target Goal Shots")))
        goal_met = goal_met_truthy(ef.get("Goal Met?")) or (target > 0 and shots >= target)
        lookup_raw = ef.get("Goal Met Date")
        lookup_date = earliest_lookup_date(lookup_raw)
        computed = compute_first_goal_met_date(by_enrollment.get(eid, []), target)
        computed_date = computed["date_key"] if computed else None
        awards = awards_by_enrollment.get(eid, [])
        award_dates = sorted({a["date_awarded"] for a in awards if a.get("date_awarded")})
        row = {
            "enrollment_id": eid,
            "name": athlete_label(ef, eid),
            "active": is_active(ef.get("Active?")),
            "shots": shots,
            "target": target,
            "goal_met": goal_met,
            "lookup_goal_met_date": lookup_date,
            "lookup_raw": flat(lookup_raw)[:160],
            "lookup_value_count": (
                len(lookup_raw)
                if isinstance(lookup_raw, list)
                else (1 if lookup_raw not in (None, "") else 0)
            ),
            "award_recipients": awards,
            "award_dates": award_dates,
            "earliest_award_date": award_dates[0] if award_dates else None,
            "computed_first_date": computed_date,
            "crossing_submission": (computed or {}).get("submission_id"),
            "crossing_before": (computed or {}).get("before"),
            "crossing_after": (computed or {}).get("after"),
        }
        row["category"] = classify(row)
        row["legacy_matches_crossing"] = bool(
            lookup_date and computed_date and lookup_date == computed_date
        )
        row["legacy_differs_from_crossing"] = bool(
            lookup_date and computed_date and lookup_date != computed_date
        )
        rows.append(row)

    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[row["category"]] += 1

    conversion_assessment = {
        "field_id": "fldohCsXsrU4hYqrJ",
        "current_type": "multipleLookupValues",
        "source": "Award Recipients → Date Awarded",
        "target_type": "date (date-only, US local)",
        "expected_behavior": "cleared",
        "confidence": "high",
        "rationale": [
            "Lookup values are computed arrays from linked Award Recipients; they are not stored writable cell values.",
            "Converting the field to a writable date type replaces the computed lookup with an empty writable date field.",
            "Airtable does not materialize lookup arrays into stored date cells during this conversion.",
            "Conversion is not expected to be blocked for lookup → date in the field-type UI.",
            "This assessment is read-only / not live-proven; Mike should verify the field is blank immediately after conversion before paste/backfill.",
        ],
        "not_expected": ["preserved", "conversion_blocked"],
    }

    snapshot = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_id": "appn84sqPw03zEbTT",
        "purpose": "SC-163 pre-conversion Goal Met Date safety snapshot",
        "production_unchanged": True,
        "field": {
            "name": "Goal Met Date",
            "id": "fldohCsXsrU4hYqrJ",
            "type": "multipleLookupValues",
        },
        "total_enrollments": len(rows),
        "active_enrollments": sum(1 for r in rows if r["active"]),
        "inactive_enrollments": sum(1 for r in rows if not r["active"]),
        "nonblank_lookup_count": sum(1 for r in rows if r["lookup_goal_met_date"]),
        "counts": {
            "blank_and_not_met": counts.get("blank_and_not_met", 0),
            "blank_but_met_provable": counts.get("blank_but_met_provable", 0),
            "nonblank_equal_to_crossing": counts.get("nonblank_equal_to_crossing", 0),
            "nonblank_and_different": counts.get("nonblank_and_different", 0),
            "met_but_unprovable": counts.get("met_but_unprovable", 0),
            "nonblank_not_met": counts.get("nonblank_not_met", 0),
            "other": counts.get("other", 0),
        },
        "conversion_assessment": conversion_assessment,
        "nonblank_rows": [r for r in rows if r["lookup_goal_met_date"]],
        "blank_but_met_provable_rows": [
            r for r in rows if r["category"] == "blank_but_met_provable"
        ],
        "met_but_unprovable_rows": [r for r in rows if r["category"] == "met_but_unprovable"],
        "all_rows": rows,
        "legacy_lookup_fingerprint": {
            r["enrollment_id"]: {
                "lookup_goal_met_date": r["lookup_goal_met_date"],
                "award_dates": r["award_dates"],
                "computed_first_date": r["computed_first_date"],
            }
            for r in rows
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    lines = [
        "# SC-163 — Pre-conversion rollback evidence",
        "",
        f"**Generated:** {snapshot['generated_at']}  ",
        f"**Base:** `{snapshot['base_id']}`  ",
        "**Production writes:** none  ",
        "",
        "## Snapshot files",
        "",
        f"- `{OUT.relative_to(ROOT).as_posix()}`",
        "",
        "## Counts",
        "",
        "| Category | Count |",
        "|---|---:|",
    ]
    for key, value in snapshot["counts"].items():
        lines.append(f"| {key} | {value} |")
    lines.extend(
        [
            "",
            f"**Nonblank Goal Met Date lookups:** {snapshot['nonblank_lookup_count']}",
            "",
            "## Conversion expectation",
            "",
            f"- Expected behavior: **{conversion_assessment['expected_behavior']}**",
            f"- Confidence: {conversion_assessment['confidence']}",
            "- Rationale:",
        ]
    )
    for item in conversion_assessment["rationale"]:
        lines.append(f"  - {item}")
    lines.extend(
        [
            "",
            "## Rollback",
            "",
            "1. Keep this snapshot JSON as the pre-conversion authority for lookup/award dates.",
            "2. After conversion, if a stored Goal Met Date equals a snapshot `lookup_goal_met_date` / award date and differs from `computed_first_date`, treat it as **legacy pollution** — clear or replace only with a provable crossing (backfill migration mode).",
            "3. Do **not** convert Goal Met Date back to Award Recipients lookup (reintroduces pollution).",
            "4. If 066 v4.0 was pasted and must roll back automation only, re-paste prior 066 v3.9; leave the writable date field.",
            "",
            "## Provable writes planned after conversion (blanks)",
            "",
        ]
    )
    provable = snapshot["blank_but_met_provable_rows"]
    if not provable:
        lines.append("_None._")
    else:
        lines.append("| Athlete | Enrollment | Computed crossing | Shots/Target |")
        lines.append("|---|---|---|---|")
        for row in provable:
            lines.append(
                f"| {row['name']} | `{row['enrollment_id']}` | {row['computed_first_date']} | "
                f"{row['shots']}/{row['target']} |"
            )

    ROLLBACK.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({k: snapshot[k] for k in snapshot if k not in {"all_rows", "legacy_lookup_fingerprint", "blank_but_met_provable_rows", "met_but_unprovable_rows", "nonblank_rows"}}, indent=2))
    print(f"Wrote {OUT}")
    print(f"Wrote {ROLLBACK}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
