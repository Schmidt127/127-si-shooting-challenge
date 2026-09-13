"""Delete residual sim XP Events missed by initial cleanup discover race."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402

IDS = ["recSg8V0kLdodyS8M", "reciiIPB2jy5hUCIs", "recdlJsPukKRKMIYX"]
ENROLLMENTS = [
    "rec9pIjQFyKwgAJLG",
    "recjZLSqtwvewN2Pn",
    "rectTQCRGIaK4W0IF",
]


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=True)
    for rid in IDS:
        r = c.get_record("XP Events", rid)
        print("before", rid, fields_of(r).get("Source Key"))
    deleted = c.delete_records("XP Events", IDS)
    print("deleted_result", deleted)

    remaining = {}
    for eid in ENROLLMENTS:
        rows = c.list_records(
            "XP Events",
            formula=f"FIND('{eid}', {{Source Key}} & '')",
            max_records=5,
        )
        remaining[eid] = [fields_of(r).get("Source Key") for r in rows]

    public_hits = c.list_records(
        "XP Events",
        formula="FIND('20260912T222521Z', {XP Reason Public} & '')",
        max_records=20,
    )
    debug_hits = c.list_records(
        "XP Events",
        formula="FIND('20260912T222521Z', {XP Reason Debug} & '')",
        max_records=20,
    )
    print(
        json.dumps(
            {
                "xp_remaining_by_enrollment": remaining,
                "public_marker_hits": [
                    fields_of(r).get("Source Key") for r in public_hits
                ],
                "debug_marker_hits": [
                    fields_of(r).get("Source Key") for r in debug_hits
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
