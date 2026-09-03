"""Identify hardcoded 072 recordId and confirm armed WAS never received writeback."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of, linked_ids  # noqa: E402

HARDCODED = "reczxTIpVI8ZJLex0"
c = AirtableClient(allow_writes=False)

try:
    r = c.get_record("Weekly Athlete Summary", HARDCODED)
    f = fields_of(r)
    print(
        json.dumps(
            {
                "exists": True,
                "id": HARDCODED,
                "Enrollment": linked_ids(f.get("Enrollment")),
                "Week": linked_ids(f.get("Week")),
                "week_display": f.get("Week - Display"),
                "Build": f.get("Build Weekly Email Now?"),
                "Ready": f.get("Weekly Email Ready?"),
                "Sent": f.get("Weekly Email Sent?"),
                "Make": f.get("Send to Make?"),
                "Error": f.get("Weekly Email Error"),
                "Subject": f.get("Weekly Email Subject"),
                "LastBuilt": f.get("Weekly Email Last Built At"),
                "Revision": f.get("Weekly Email Revision"),
                "HTML_len": len(str(f.get("Weekly Email HTML") or "")),
                "Recipients": f.get("Weekly Email Recipients"),
            },
            indent=2,
            default=str,
        )
    )
except Exception as exc:
    print(json.dumps({"exists": False, "error": str(exc)[:400]}))

# Also confirm schema for input: static vs dynamic from automation metadata already known
print("CONCLUSION_HINT: live 072 inputObj.recordId is static", HARDCODED)
