#!/usr/bin/env python3
import json, os, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
HW_TEMPLATE = "rec14HLmrN5suEyWs"

def tok():
    for p in (ROOT/".env.local", ROOT/".env", ROOT/"web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no")

TOK = tok()
url = f"https://api.airtable.com/v0/{DEV}/Testing%20Scenarios/{HW_TEMPLATE}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOK}"})
with urllib.request.urlopen(req, timeout=90) as r:
    data = json.loads(r.read().decode())
f = data.get("fields") or {}
print("keys", sorted(f.keys()))
for k, v in f.items():
    if "Attach" in k or "Homework" in k or "Intake" in k or "File" in k:
        print(k, type(v).__name__, (len(v) if isinstance(v, list) else v) if not isinstance(v, list) or len(v) < 3 else f"list[{len(v)}]")
        if isinstance(v, list) and v and isinstance(v[0], dict) and "url" in v[0]:
            print("  sample file", v[0].get("filename"), v[0].get("url")[:60])
