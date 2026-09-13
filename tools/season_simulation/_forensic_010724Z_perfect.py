"""Deep forensic for SEASON-SIM-2027-20260913T010724Z Perfect athlete."""
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
EID = "recFcH7qLPzzso9s3"


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    reg = load_registry(REG_DIR, f"{RUN}__athlete1-perfect")

    # All XP via enrollment link
    xp = c.list_records(
        "XP Events",
        formula=f"OR(FIND('{EID}', {{Source Key}} & ''), FIND('{EID}', ARRAYJOIN({{Enrollment}}) & ''), {{Enrollment Record ID}}='{EID}')",
        max_records=500,
    )
    buckets = actual_xp_buckets_from_events(xp)
    prefixes = Counter()
    for r in xp:
        f = fields_of(r)
        sk = str(f.get("Source Key") or "")
        prefixes[sk.split("|")[0] if sk else "?"] += 1
    print(
        json.dumps(
            {
                "xp_count": len(xp),
                "buckets": buckets,
                "bucket_total": sum_points(buckets),
                "prefixes": dict(prefixes),
            },
            indent=2,
        )
    )

    # Homework completions
    hw_ids = [
        r.record_id
        for r in reg.records
        if r.table == "Homework Completions" and r.record_id
    ]
    pending = 0
    linked = 0
    awarded = 0
    no_was = 0
    samples = []
    for i in range(0, len(hw_ids), 10):
        chunk = hw_ids[i : i + 10]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        rows = c.list_records("Homework Completions", formula=formula, max_records=20)
        for r in rows:
            f = fields_of(r)
            was = f.get("Weekly Athlete Summary Link") or f.get(
                "Weekly Athlete Summary"
            )
            status = f.get("Award Status") or f.get("Homework Award Status")
            needed = f.get("Homework XP Reconciliation Needed?") or f.get(
                "Homework XP Reconciliation Needed"
            )
            if was:
                linked += 1
            else:
                no_was += 1
            if str(status).lower() in {"awarded", "complete", "done"}:
                awarded += 1
            if needed in (1, True, "1") or str(status).lower() == "pending":
                pending += 1
            if len(samples) < 5:
                samples.append(
                    {
                        "id": r["id"],
                        "was": was,
                        "status": status,
                        "needed": needed,
                        "keys": [k for k in f if "Award" in k or "Reconcile" in k or "Weekly" in k or "WAS" in k][
                            :12
                        ],
                    }
                )
    print(
        json.dumps(
            {
                "hw_registry": len(hw_ids),
                "hw_linked_was": linked,
                "hw_no_was": no_was,
                "hw_awarded": awarded,
                "hw_pendingish": pending,
                "samples": samples,
            },
            indent=2,
            default=str,
        )
    )

    # Streak occurrences via enrollment link
    streaks = c.list_records(
        "Streak Occurrences",
        formula=f"OR(FIND('{EID}', ARRAYJOIN({{Enrollment}}) & ''), FIND('{EID}', {{Streak Occurrence Key}} & ''))",
        max_records=50,
    )
    print("streak_count", len(streaks))
    for r in streaks:
        f = fields_of(r)
        print(
            " ",
            f.get("Streak Occurrence Key"),
            f.get("Status"),
            f.get("Occurrence Status"),
            f.get("Streak Length") or f.get("Threshold Days") or f.get("Days"),
        )

    # Email handoffs
    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"OR({{Enrollment Record ID}}='{EID}', FIND('{EID}', {{Recipients JSON}} & ''))",
        max_records=300,
    )
    statuses = Counter(str(fields_of(r).get("Status") or "?") for r in emails)
    keys = Counter(str(fields_of(r).get("Handoff Key") or "") for r in emails)
    dups = {k: n for k, n in keys.items() if n > 1 and k}
    print(
        json.dumps(
            {
                "email_count": len(emails),
                "email_statuses": dict(statuses),
                "dup_handoff_keys": len(dups),
                "dup_sample": list(dups.items())[:5],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
