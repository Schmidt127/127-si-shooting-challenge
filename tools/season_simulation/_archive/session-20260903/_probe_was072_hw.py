"""Check HW PHA links and email package fields on armed WAS."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of, linked_ids  # noqa: E402

ARMED = [
    "rec6jdIPEkloW1rNK",
    "recZE2SgkrnwG7Ogw",
    "recbV3HSCK4WIUtN7",
    "recbHmeL956uvdeg1",
    "recdTXtMj1ri2Qh7J",
    "rechG2pRijDPax314",
]

c = AirtableClient(allow_writes=False)
formula = "OR(" + ",".join(f"RECORD_ID()='{i}'" for i in ARMED) + ")"
rows = c.list_records("Weekly Athlete Summary", formula=formula, max_records=20)
out = []
for r in rows:
    f = fields_of(r)
    hw = linked_ids(f.get("Homework Completions Link"))
    row = {
        "id": r["id"],
        "week": f.get("Week - Display"),
        "Build": f.get("Build Weekly Email Now?"),
        "Subject": f.get("Weekly Email Subject") or f.get("Email Subject"),
        "HTML_len": len(str(f.get("Weekly Email HTML") or "")),
        "Text_len": len(str(f.get("Weekly Email Text") or "")),
        "Recipients_field": f.get("Weekly Email Recipients"),
        "Payload_len": len(str(f.get("Weekly Email Payload JSON") or "")),
        "Revision": f.get("Weekly Email Revision"),
        "hw_ids": hw,
        "hw": [],
    }
    for hid in hw:
        hf = fields_of(c.get_record("Homework Completions", hid))
        row["hw"].append(
            {
                "id": hid,
                "PHA": linked_ids(hf.get("Program Homework Assignment")),
                "Homework": linked_ids(hf.get("Homework")),
                "Enrollment": linked_ids(hf.get("Enrollment")),
                "Week": linked_ids(hf.get("Week")),
            }
        )
    out.append(row)

# PHA for Early Bird / Week 1 sample
enr = fields_of(c.get_record("Enrollments", "recekm0ke1bihWAc3"))
program = linked_ids(enr.get("Program Instance"))[0]
grade = linked_ids(enr.get("Grade Band"))[0]
print("program", program, "grade", grade)

# Check Automations table for 072 status if present
try:
    autos = c.list_records(
        "Automations",
        formula="OR(FIND('072', {Automation Code}&''), FIND('072', {Name}&''), FIND('Weekly Summary Email', {Name}&''))",
        max_records=20,
    )
    auto_out = []
    for a in autos:
        af = fields_of(a)
        auto_out.append({k: af.get(k) for k in ("Name", "Status", "Automation Code", "Folder") if k in af or True})
except Exception as exc:
    auto_out = [{"error": str(exc)[:300]}]

print(json.dumps({"was": out, "automations": auto_out}, indent=2, default=str))
