#!/usr/bin/env python3
from pathlib import Path
import json, urllib.request, urllib.error
ENV = Path(__file__).resolve().parent / ".env"
BASE = "appTetnuCZlCZdTCT"
env = {}
for line in ENV.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")
assert (env.get("AIRTABLE_BASE_ID") or BASE) == BASE
token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
assert token
IDS = [
    ("Zoom Attendance", "recsEERuvtyoHmDma"),
    ("Zoom Meetings", "recNOsPJQVH69ibah"),
    ("Zoom Attendance", "recAqFTWmuHF1V4Z5"),
    ("Zoom Attendance", "recbL9e1Be4iNbCZF"),
]
for table, rid in IDS:
    url = f"https://api.airtable.com/v0/{BASE}/{urllib.request.quote(table)}/{rid}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode())
            fields = body.get("fields") or {}
            print(json.dumps({"id": rid, "http": 200, "nkeys": len(fields), "method": fields.get("Attendance Method"), "conflict": fields.get("Zoom Credit Conflict?"), "eff": fields.get("Effective Recording Approval Email Enabled?"), "tmpl": fields.get("Effective Recording Approval Email Template Key"), "sk": fields.get("Recording Approval Email Send Key") or "", "att": len(fields.get("Attendees") or [])}))
    except urllib.error.HTTPError as e:
        print(json.dumps({"id": rid, "http": e.code, "err": e.read().decode()[:300]}))
