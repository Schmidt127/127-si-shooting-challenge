#!/usr/bin/env python3
import json, os, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"

def tok():
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no")

TOK = tok()
req = urllib.request.Request(
    f"https://api.airtable.com/v0/meta/bases/{DEV}/tables",
    headers={"Authorization": f"Bearer {TOK}"},
)
with urllib.request.urlopen(req, timeout=120) as r:
    meta = json.loads(r.read().decode())
for t in meta["tables"]:
    if t["name"] != "Submissions":
        continue
    for f in t["fields"]:
        if f["type"] in ("singleSelect", "number", "checkbox") or f["name"] in (
            "Makes",
            "Shots",
            "Total Makes",
            "Total Shots",
            "Submission Type",
            "Shooting Type",
            "Entry Type",
            "Shot Entry Mode",
            "Tracking Mode",
        ):
            opts = f.get("options") or {}
            choices = [c.get("name") for c in (opts.get("choices") or [])]
            print(f["name"], f["type"], choices[:20] if choices else "")
