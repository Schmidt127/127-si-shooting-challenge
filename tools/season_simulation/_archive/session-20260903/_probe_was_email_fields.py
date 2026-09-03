"""Confirm which subject/html fields 072 would write vs formula defaults."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

c = AirtableClient(allow_writes=False)
tables = c.meta_tables()
was = next(t for t in tables if t["name"] == "Weekly Athlete Summary")
interesting = []
for f in was["fields"]:
    n = f["name"]
    if any(
        x in n.lower()
        for x in (
            "email",
            "build",
            "send to make",
            "ready",
            "subject",
            "html",
            "payload",
            "recipient",
            "revision",
        )
    ):
        interesting.append(
            {
                "name": n,
                "type": f["type"],
                "id": f["id"],
            }
        )
print(json.dumps(interesting, indent=2))

r = fields_of(c.get_record("Weekly Athlete Summary", "recZE2SgkrnwG7Ogw"))
for n in [
    "Email Subject",
    "Weekly Email Subject",
    "Weekly Email HTML",
    "Weekly Email Text",
    "Weekly Email Recipients",
    "Weekly Email Payload JSON",
    "Weekly Email Ready?",
    "Weekly Email Sent?",
    "Weekly Email Error",
    "Weekly Email Revision",
    "Build Weekly Email Now?",
    "Send to Make?",
]:
    print(f"{n!r}: {r.get(n)!r}")
