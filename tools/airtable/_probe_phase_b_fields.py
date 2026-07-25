#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no")


TOK = load_token()
req = urllib.request.Request(
    f"https://api.airtable.com/v0/meta/bases/{DEV}/tables",
    headers={"Authorization": f"Bearer {TOK}"},
)
with urllib.request.urlopen(req, timeout=120) as r:
    meta = json.loads(r.read().decode())

for t in meta["tables"]:
    if t["name"] == "Submissions":
        for f in t["fields"]:
            if "Count" in f["name"] or f["name"] in ("Makes", "Shots", "Activity Date", "Weekly Athlete Summary", "Week", "Enrollment"):
                print(f["name"], f["type"], (f.get("options") or {}).get("formula") if f["type"] == "formula" else "")
    if t["name"] == "Weekly Athlete Summary":
        for f in t["fields"]:
            if f["type"] not in ("formula", "rollup", "lookup", "count", "multipleLookupValues", "createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy", "autoNumber"):
                if f["name"] in ("Enrollment", "Week", "Grade Band", "Goal Record", "Homework", "Notes", "Coach Notes", "Momentum Status", "Summary Calculation Status"):
                    print("WAS writable-ish", f["name"], f["type"])
