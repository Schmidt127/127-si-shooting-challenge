"""Poll remaining settlement for Perfect athlete 010724Z."""
from __future__ import annotations

import json
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.business_reconciliation import (  # noqa: E402
    actual_xp_buckets_from_events,
    sum_points,
)
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402
from season_simulation.run_registry import load_registry  # noqa: E402

RUN = "SEASON-SIM-2027-20260913T010724Z-threeathlete"
REG_DIR = Path(__file__).resolve().parent / "run_registries"
EID = "recFcH7qLPzzso9s3"


def snapshot(c: AirtableClient, reg) -> dict:
    enr = fields_of(c.get_record("Enrollments", EID))
    xp = c.list_records(
        "XP Events",
        formula=(
            f"OR(FIND('{EID}', {{Source Key}} & ''), "
            f"FIND('{EID}', ARRAYJOIN({{Enrollment}}) & ''), "
            f"{{Enrollment Record ID}}='{EID}')"
        ),
        max_records=500,
    )
    buckets = actual_xp_buckets_from_events(xp)
    prefixes = Counter(
        str(fields_of(r).get("Source Key") or "").split("|")[0] for r in xp
    )
    hw_ids = [
        r.record_id
        for r in reg.records
        if r.table == "Homework Completions" and r.record_id
    ]
    pending = awarded = 0
    for i in range(0, len(hw_ids), 15):
        chunk = hw_ids[i : i + 15]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        for r in c.list_records("Homework Completions", formula=formula, max_records=20):
            st = str(fields_of(r).get("Award Status") or "")
            if st.lower() == "awarded":
                awarded += 1
            elif st.lower() == "pending":
                pending += 1
    streak_ids = list(enr.get("Streak Occurrences") or [])
    streak_keys = []
    for i in range(0, len(streak_ids), 10):
        chunk = streak_ids[i : i + 10]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        for r in c.list_records("Streak Occurrences", formula=formula, max_records=20):
            f = fields_of(r)
            streak_keys.append(
                {
                    "id": r["id"],
                    "key": f.get("Streak Occurrence Key"),
                    "status": f.get("Status") or f.get("Occurrence Status"),
                }
            )
    return {
        "lifetime_xp": enr.get("Lifetime XP Earned") or enr.get("Lifetime XP Total"),
        "public_level": enr.get("Current Level - Public Facing Display"),
        "level_status": enr.get("Level Status"),
        "current_streak": enr.get("Current Shooting Streak"),
        "longest_streak": enr.get("Longest Streak Days"),
        "gate_debug": enr.get("Gate Debug Summary"),
        "buckets": buckets,
        "bucket_total": sum_points(buckets),
        "prefixes": dict(prefixes),
        "hw_awarded": awarded,
        "hw_pending": pending,
        "streak_occurrences": streak_keys,
    }


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    reg = load_registry(REG_DIR, f"{RUN}__athlete1-perfect")
    for i in range(6):
        snap = snapshot(c, reg)
        print(f"--- poll {i} ---")
        print(
            json.dumps(
                {
                    "lifetime_xp": snap["lifetime_xp"],
                    "hw_awarded": snap["hw_awarded"],
                    "hw_pending": snap["hw_pending"],
                    "buckets": snap["buckets"],
                    "longest": snap["longest_streak"],
                    "current": snap["current_streak"],
                    "streak_n": len(snap["streak_occurrences"]),
                    "streak_keys": [s["key"] for s in snap["streak_occurrences"]],
                    "level": snap["public_level"],
                    "gate": snap["gate_debug"],
                },
                indent=2,
            )
        )
        if snap["hw_pending"] == 0 and snap["buckets"]["Homework XP"] >= 630:
            break
        if i < 5:
            time.sleep(30)
    out = Path(__file__).resolve().parent / "reports" / "_poll_010724Z_perfect.json"
    out.write_text(json.dumps(snap, indent=2, default=str), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
