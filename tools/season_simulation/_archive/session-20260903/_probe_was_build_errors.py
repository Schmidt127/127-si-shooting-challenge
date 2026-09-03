"""Pull package-build attempt/error and 072 automation status evidence."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

ARMED = [
    "rec6jdIPEkloW1rNK",
    "recZE2SgkrnwG7Ogw",
    "recbV3HSCK4WIUtN7",
    "recbHmeL956uvdeg1",
    "recdTXtMj1ri2Qh7J",
    "rechG2pRijDPax314",
]
ALL = ARMED + [
    "recHFARvKdpf9GPn9",
    "recHxyTKn5pKycatI",
    "recwNWTxSWdKBlo0T",
    "recdp2eLVL91gzLwL",
]

FIELDS = [
    "Week - Display",
    "Build Weekly Email Now?",
    "Weekly Email Sent?",
    "Send to Make?",
    "Weekly Email Ready?",
    "Weekly Email Error",
    "Weekly Email Subject",
    "Weekly Email Last Built At",
    "Last Package Build Attempt",
    "Package Build Error",
    "Weekly Summary Email Status",
    "Weekly Summary Email Type",
    "Weekly Email Revision",
    "Total Shots This Week",
    "XP Earned This Week",
]

c = AirtableClient(allow_writes=False)
formula = "OR(" + ",".join(f"RECORD_ID()='{i}'" for i in ALL) + ")"
rows = c.list_records("Weekly Athlete Summary", formula=formula, fields=FIELDS, max_records=20)
out = []
for r in rows:
    f = fields_of(r)
    out.append({"id": r["id"], "armed": r["id"] in ARMED, **{k: f.get(k) for k in FIELDS}})
out.sort(key=lambda x: (not x["armed"], str(x.get("Week - Display") or "")))
print(json.dumps(out, indent=2, default=str))
