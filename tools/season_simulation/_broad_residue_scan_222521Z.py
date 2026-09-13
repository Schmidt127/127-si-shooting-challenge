"""Broad post-cleanup residue scan for failed run marker / enrollments."""
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
TOKEN = "20260912T222521Z"
MARKER = "SEASON-SIM|SEASON-SIM-2027-20260912T222521Z-threeathlete"


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    scans = []

    checks = [
        ("XP Events", "Source Key", TOKEN),
        ("XP Events", "XP Reason Public", TOKEN),
        ("XP Events", "XP Reason Debug", TOKEN),
        ("Submissions", "Video Upload Note", TOKEN),
        ("Email Handoff Queue", "Handoff Key", TOKEN),
        ("Email Handoff Queue", "Recipients JSON", TOKEN),
        ("Email Handoff Queue", "Enrollment Record ID", TOKEN),
        ("Streak Occurrences", "Streak Occurrence Key", TOKEN),
        ("Zoom Meetings", "Name", TOKEN),
        ("Zoom Meetings", "Zoom Meeting Key", TOKEN),
        ("Weekly Athlete Summary", "Name", TOKEN),
        ("Athlete Achievement Unlocks", "Milestone Source Key", TOKEN),
        ("Video Feedback", "Name", TOKEN),
        ("Homework Completions", "Name", TOKEN),
    ]
    for table, field, needle in checks:
        try:
            rows = c.list_records(
                table,
                formula=f"FIND('{needle}', {{{field}}} & '')",
                max_records=10,
            )
            scans.append(
                {
                    "table": table,
                    "field": field,
                    "needle": needle,
                    "count": len(rows),
                    "sample_ids": [r.get("id") for r in rows[:3]],
                }
            )
        except Exception as exc:  # noqa: BLE001
            scans.append(
                {
                    "table": table,
                    "field": field,
                    "needle": needle,
                    "error": str(exc)[:180],
                }
            )

    for eid in ENROLLMENTS:
        for table, formula in (
            ("XP Events", f"FIND('{eid}', {{Source Key}} & '')"),
            (
                "Email Handoff Queue",
                f"OR({{Enrollment Record ID}}='{eid}', FIND('{eid}', {{Recipients JSON}} & ''))",
            ),
            (
                "Streak Occurrences",
                f"OR(FIND('{eid}', ARRAYJOIN({{Enrollment}}) & ''), FIND('{eid}', {{Streak Occurrence Key}} & ''))",
            ),
            (
                "Athlete Achievement Unlocks",
                f"FIND('{eid}', {{Milestone Source Key}} & '')",
            ),
            (
                "Weekly Athlete Summary",
                f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & '')",
            ),
            (
                "Submissions",
                f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & '')",
            ),
            (
                "Zoom Attendance",
                f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & '')",
            ),
        ):
            try:
                rows = c.list_records(table, formula=formula, max_records=5)
                scans.append(
                    {
                        "kind": "enrollment_residue",
                        "table": table,
                        "enrollment": eid,
                        "count": len(rows),
                        "sample": [fields_of(r).get("Source Key") or fields_of(r).get("Handoff Key") or fields_of(r).get("Milestone Source Key") or r.get("id") for r in rows[:3]],
                    }
                )
            except Exception as exc:  # noqa: BLE001
                scans.append(
                    {
                        "kind": "enrollment_residue",
                        "table": table,
                        "enrollment": eid,
                        "error": str(exc)[:180],
                    }
                )

    nonzero = [
        s
        for s in scans
        if s.get("count")
        or s.get("error")
    ]
    print(
        json.dumps(
            {
                "marker": MARKER,
                "nonzero_or_error": nonzero,
                "all_zero": len(nonzero) == 0,
                "scan_count": len(scans),
            },
            indent=2,
            default=str,
        )
    )


if __name__ == "__main__":
    main()
