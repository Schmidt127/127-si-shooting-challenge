"""Post-cleanup leftover check for T202049Z."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient  # noqa: E402

ENROLL = "recekm0ke1bihWAc3"
ATHLETE = "recGTljTSqelacjyp"


def main() -> int:
    c = AirtableClient(allow_writes=False)
    for table, rid in [("Enrollments", ENROLL), ("Athletes", ATHLETE)]:
        try:
            c.get_record(table, rid)
            print(f"STILL_EXISTS {table} {rid}")
        except Exception as exc:  # noqa: BLE001
            print(f"GONE {table} {rid} ({type(exc).__name__})")

    checks = [
        ("XP Events", f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')"),
        ("Email Handoff Queue", f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')"),
        ("Streak Occurrences", f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))"),
        ("Athlete Achievement Unlocks", f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))"),
    ]
    for table, formula in checks:
        try:
            rows = c.list_records(table, formula=formula, max_records=20)
            print(f"{table}: {len(rows)}")
        except Exception as exc:  # noqa: BLE001
            print(f"{table}: ERR {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
