#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
HW_IDS = ["recHbROQu2tAtUzMg", "reccGb6KbwG6lmeLs"]
WEEK = "recUPkXtsDOHnY5q7"
GB = "recK7BDVSpHy2ipCS"


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("Missing token")


TOK = load_token()


def api(method, table, rid=None, params=None, body=None):
    url = f"https://api.airtable.com/v0/{DEV}/{urllib.parse.quote(table, safe='')}"
    if rid:
        url += f"/{rid}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def main():
    for hid in HW_IDS:
        st, rec = api("GET", "FBC Curriculum - SYNC", hid)
        print("hw", hid, st)
        if st != 200:
            print(rec[:300])
            continue
        f = rec.get("fields") or {}
        print(
            {
                "name": f.get("Assignment Full Name"),
                "week": f.get("Week"),
                "gb": f.get("Grade Band"),
                "active": f.get("Active?"),
                "pub": f.get("Published?"),
                "num": f.get("Assignment Number"),
            }
        )

    # Also check if Homework links to a different table
    st, was = api("GET", "Weekly Athlete Summary", "recBO81w4dYtcaL4V")
    # meta for Homework field type
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/meta/bases/{DEV}/tables",
        headers={"Authorization": f"Bearer {TOK}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        meta = json.loads(r.read().decode())
    for t in meta.get("tables") or []:
        if t.get("name") == "Weekly Athlete Summary":
            for fld in t.get("fields") or []:
                if fld.get("name") in ("Homework", "Goal Record", "Grade Band", "Week", "Enrollment"):
                    print("field", fld.get("name"), fld.get("type"), fld.get("options", {}).get("linkedTableId"))


if __name__ == "__main__":
    main()
