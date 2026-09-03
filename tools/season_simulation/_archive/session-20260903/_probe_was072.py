"""Probe formulas and one WAS row."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of, linked_ids  # noqa: E402

e = "recekm0ke1bihWAc3"
c = AirtableClient(allow_writes=False)
formulas = [
    "FIND('" + e + "', {Enrollment}&'')",
    "FIND('" + e + "', ARRAYJOIN({Enrollment}))",
    "FIND('" + e + "', {Enrollment Record ID} & '')",
]
for f in formulas:
    try:
        rows = c.list_records("Weekly Athlete Summary", formula=f, max_records=3)
        print("OK", f, "->", len(rows), [r["id"] for r in rows[:3]])
    except Exception as ex:
        print("FAIL", f, "->", str(ex)[:250])

r = c.get_record("Weekly Athlete Summary", "rec6jdIPEkloW1rNK")
f = fields_of(r)
keys = sorted(
    k
    for k in f
    if any(
        x in k.lower()
        for x in (
            "email",
            "build",
            "shot",
            "xp",
            "perfect",
            "threshold",
            "week",
            "submission",
            "send",
            "ready",
            "parent",
            "recipient",
            "make",
        )
    )
)
print("keys", keys)
print(
    json.dumps(
        {
            "Enrollment": f.get("Enrollment"),
            "Build": f.get("Build Weekly Email Now?"),
            "Sent": f.get("Weekly Email Sent?"),
            "Make": f.get("Send to Make?"),
            "Ready": f.get("Weekly Email Ready?"),
            "Error": f.get("Weekly Email Error"),
            "shots": f.get("Total Shots This Week"),
            "xp": f.get("XP Earned This Week"),
            "subs": linked_ids(f.get("Submissions")),
            "xp_events": linked_ids(f.get("XP Events")),
            "week": f.get("Week"),
            "week_display": f.get("Week - Display"),
            "parent": f.get("Parent Email - Cleaned"),
            "combined": f.get("Combined Recipient Emails"),
            "threshold": f.get("Threshold XP Status"),
            "threshold_ready": f.get("Threshold XP Ready?"),
        },
        indent=2,
        default=str,
    )
)
