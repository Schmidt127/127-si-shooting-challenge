"""Fetch live XP for Perfect athlete on failed 010724Z run."""
from __future__ import annotations

import json
import sys
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


def main() -> None:
    reg = load_registry(REG_DIR, f"{RUN}__athlete1-perfect")
    eid = reg.enrollment_id
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    enr = fields_of(c.get_record("Enrollments", eid))
    keys = [k for k in enr if any(x in k for x in ("XP", "Level", "Streak", "Gate", "Perfect"))]
    print("enrollment", eid)
    print(json.dumps({k: enr.get(k) for k in keys}, indent=2, default=str))

    xp = c.list_records(
        "XP Events",
        formula=f"FIND('{eid}', {{Source Key}} & '')",
        max_records=500,
    )
    print("xp_count", len(xp))
    if xp:
        sample = fields_of(xp[0])
        print("sample_keys", list(sample.keys())[:40])
        print(
            "sample",
            {
                k: sample.get(k)
                for k in (
                    "Source Key",
                    "XP Points",
                    "Points",
                    "Active?",
                    "Status",
                    "Enrollment",
                )
            },
        )
    buckets = actual_xp_buckets_from_events(xp)
    print("buckets", buckets, "total", sum_points(buckets))
    prefixes = Counter()
    for r in xp:
        sk = str(fields_of(r).get("Source Key") or "")
        prefixes[sk.split("|")[0]] += 1
    print("prefixes", dict(prefixes))

    # streaks
    streaks = c.list_records(
        "Streak Occurrences",
        formula=f"FIND('{eid}', {{Streak Occurrence Key}} & '')",
        max_records=50,
    )
    print("streaks", len(streaks))
    for r in streaks[:15]:
        f = fields_of(r)
        print(" ", f.get("Streak Occurrence Key"), f.get("Status") or f.get("Occurrence Status"))


if __name__ == "__main__":
    main()
