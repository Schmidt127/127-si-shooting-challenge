"""Inspect residual XP Events matching failed-run enrollment IDs."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402

ENROLLMENTS = [
    "rec9pIjQFyKwgAJLG",
    "recjZLSqtwvewN2Pn",
    "rectTQCRGIaK4W0IF",
]


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    rows_out = []
    for eid in ENROLLMENTS:
        rows = c.list_records(
            "XP Events",
            formula=f"FIND('{eid}', {{Source Key}} & '')",
            max_records=20,
        )
        for r in rows:
            f = fields_of(r)
            rows_out.append(
                {
                    "id": r.get("id"),
                    "enrollment_query": eid,
                    "Source Key": f.get("Source Key"),
                    "XP Reason Debug": f.get("XP Reason Debug"),
                    "XP Reason Public": f.get("XP Reason Public"),
                    "Active?": f.get("Active?"),
                    "Enrollment": f.get("Enrollment"),
                    "Points": f.get("Points") or f.get("XP Points"),
                    "XP Type": f.get("XP Type") or f.get("Type"),
                }
            )
    print(json.dumps(rows_out, indent=2, default=str))


if __name__ == "__main__":
    main()
