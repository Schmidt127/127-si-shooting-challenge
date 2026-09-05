#!/usr/bin/env python3
"""SC-163 probe: Goal Met Date reliability (read-only unless --apply)."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, list_table, session, txt

BASE = Path(__file__).resolve().parent
PREVIEW = BASE / "_preview"


def flat(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(flat(v) for v in value if v not in (None, ""))
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
    text = flat(value)
    return bool(text) and text.lower() not in {"false", "0", "no"}


def parse_date_key(value) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, list):
        for item in value:
            key = parse_date_key(item)
            if key:
                return key
        return None
    text = str(value).strip()
    if not text:
        return None
    # Airtable date / datetime
    if "T" in text:
        text = text.split("T", 1)[0]
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        return text[:10]
    return text[:10] if len(text) >= 8 else None


def earliest_lookup_date(value) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, list):
        keys = sorted({k for k in (parse_date_key(v) for v in value) if k})
        return keys[0] if keys else None
    return parse_date_key(value)


def count_truthy(value) -> bool:
    if value is True or value == 1:
        return True
    if isinstance(value, (int, float)):
        return value != 0
    text = flat(value).lower()
    return text in {"1", "true", "yes", "checked"}


def compute_first_goal_met_date(
    submissions: list[dict], target: int
) -> dict | None:
    """Return first Activity Date where cumulative counted shots >= target."""
    if target <= 0:
        return None
    eligible = []
    for sub in submissions:
        sf = f(sub)
        if not count_truthy(sf.get("Count This Submission?")):
            continue
        shots = int(num(sf.get("Total Shots Counted")))
        if shots <= 0:
            continue
        date_key = parse_date_key(sf.get("Activity Date"))
        if not date_key:
            continue
        created = sub.get("createdTime") or ""
        eligible.append(
            {
                "id": sub["id"],
                "date_key": date_key,
                "shots": shots,
                "created": created,
            }
        )
    eligible.sort(key=lambda r: (r["date_key"], r["created"], r["id"]))
    running = 0
    for row in eligible:
        before = running
        running += row["shots"]
        if before < target <= running:
            return {
                "date_key": row["date_key"],
                "submission_id": row["id"],
                "before": before,
                "after": running,
                "submission_shots": row["shots"],
            }
    return None


def patch_enrollment(sess, enrollment_id: str, fields: dict) -> None:
    import requests

    from airtable_read import BASE_ID

    url = f"https://api.airtable.com/v0/{BASE_ID}/Enrollments/{enrollment_id}"
    resp = sess.patch(url, json={"fields": fields, "typecast": True}, timeout=60)
    if not resp.ok:
        raise RuntimeError(f"PATCH {enrollment_id}: {resp.status_code} {resp.text[:400]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="SC-163 Goal Met Date probe")
    parser.add_argument("--apply", action="store_true", help="Write blank Goal Met Date only when field is writable")
    parser.add_argument("--enrollment", action="append", default=[], help="Limit to enrollment record id(s)")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

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

    by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for sub in submissions:
        eid = first_id(f(sub).get("Enrollment"))
        if eid:
            by_enrollment[eid].append(sub)

    rows = []
    for en in enrollments:
        ef = f(en)
        eid = en["id"]
        if args.enrollment and eid not in args.enrollment:
            continue
        if not is_active(ef.get("Active?")):
            continue
        shots = int(num(ef.get("Total Shots Counted")))
        target = int(num(ef.get("Target Goal Shots")))
        goal_met = goal_met_truthy(ef.get("Goal Met?")) or (target > 0 and shots >= target)
        lookup_date = earliest_lookup_date(ef.get("Goal Met Date"))
        all_lookup = flat(ef.get("Goal Met Date"))
        computed = compute_first_goal_met_date(by_enrollment.get(eid, []), target)
        computed_date = computed["date_key"] if computed else None

        category = "ok"
        if goal_met and not computed_date:
            category = "met_but_unprovable"
        elif goal_met and not lookup_date:
            category = "met_blank_date"
        elif (not goal_met) and lookup_date:
            category = "date_but_not_met"
        elif goal_met and lookup_date and computed_date and lookup_date > computed_date:
            category = "date_later_than_activity"
        elif goal_met and lookup_date and computed_date and lookup_date != computed_date:
            category = "date_differs_from_activity"
        elif goal_met and lookup_date and computed_date and lookup_date == computed_date:
            category = "aligned"

        rows.append(
            {
                "enrollment_id": eid,
                "name": athlete_label(ef, eid),
                "shots": shots,
                "target": target,
                "goal_met": goal_met,
                "lookup_goal_met_date": lookup_date,
                "lookup_raw": all_lookup[:80],
                "computed_first_date": computed_date,
                "crossing_submission": (computed or {}).get("submission_id"),
                "crossing_before": (computed or {}).get("before"),
                "crossing_after": (computed or {}).get("after"),
                "category": category,
                "would_write": bool(
                    goal_met and computed_date and not lookup_date
                ),
            }
        )

    # Schema note via Meta API
    schema_note = "unknown"
    try:
        meta = sess.get(
            "https://api.airtable.com/v0/meta/bases/appn84sqPw03zEbTT/tables",
            timeout=60,
        )
        meta.raise_for_status()
        for table in meta.json().get("tables", []):
            if table.get("name") != "Enrollments":
                continue
            for field in table.get("fields", []):
                if field.get("name") == "Goal Met Date":
                    schema_note = f"{field.get('type')} id={field.get('id')}"
                    break
    except Exception as exc:  # noqa: BLE001
        schema_note = f"meta_error: {exc}"

    apply_results = []
    if args.apply:
        writable = "date" in schema_note or schema_note.startswith("dateTime")
        if not writable:
            raise SystemExit(
                f"Refuse --apply: Goal Met Date is not a writable date field ({schema_note}). "
                "Convert field type first (see deploy checklist)."
            )
        for row in rows:
            if not row["would_write"]:
                continue
            patch_enrollment(sess, row["enrollment_id"], {"Goal Met Date": row["computed_first_date"]})
            apply_results.append(row)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "goal_met_date_schema": schema_note,
        "active_enrollments": len(rows),
        "counts_by_category": {},
        "would_write_count": sum(1 for r in rows if r["would_write"]),
        "applied_count": len(apply_results),
        "rows": rows,
        "applied": apply_results,
    }
    for row in rows:
        summary["counts_by_category"][row["category"]] = (
            summary["counts_by_category"].get(row["category"], 0) + 1
        )

    out = args.out or (PREVIEW / "SC-163-goal-met-date-dry-run.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps({k: summary[k] for k in summary if k not in {"rows", "applied"}}, indent=2))
    print(f"Wrote {out}")
    for row in rows:
        print(
            f"{row['category']:28} {row['name'][:32]:32} "
            f"shots={row['shots']}/{row['target']} "
            f"lookup={row['lookup_goal_met_date'] or '—'} "
            f"computed={row['computed_first_date'] or '—'}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
