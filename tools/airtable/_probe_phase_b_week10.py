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
SCHMIDT = "recgP9qZYjAhE7NXm"
WEEK_10 = "recrTwxqXz31fNZ7e"
GB = "recK7BDVSpHy2ipCS"


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no token")


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
    formula = f"AND({{Enrollment}}='{SCHMIDT}', {{Week}}='{WEEK_10}')"
    st, data = api("GET", "Weekly Athlete Summary", params={"filterByFormula": formula, "pageSize": 5})
    print("find", st, len(data.get("records") or []) if isinstance(data, dict) else data[:300])
    for rec in (data.get("records") or []) if isinstance(data, dict) else []:
        f = rec.get("fields") or {}
        print(
            rec["id"],
            {
                "gb": f.get("Grade Band"),
                "goal": f.get("Goal Record"),
                "hw": f.get("Homework"),
            },
        )

    # curriculum for week 10
    st, hw = api("GET", "FBC Curriculum - SYNC", params={"pageSize": 100})
    if st != 200:
        print("hw list", st, str(hw)[:200])
        return
    matches = []
    for rec in hw.get("records") or []:
        f = rec.get("fields") or {}
        weeks = f.get("Week") or []
        gbs = f.get("Grade Band") or []
        if WEEK_10 in weeks and GB in gbs and f.get("Active?") and f.get("Published?"):
            matches.append((rec["id"], f.get("Assignment Full Name")))
    print("week10_hw_matches_page1", len(matches), matches[:5])

    # Also scan with filter - try RECORD_ID style via FIND on week
    # list more pages if needed via offset
    all_matches = list(matches)
    offset = data.get("offset") if False else (hw.get("offset") if isinstance(hw, dict) else None)
    while offset:
        st, hw = api("GET", "FBC Curriculum - SYNC", params={"pageSize": 100, "offset": offset})
        if st != 200:
            break
        for rec in hw.get("records") or []:
            f = rec.get("fields") or {}
            weeks = f.get("Week") or []
            gbs = f.get("Grade Band") or []
            if WEEK_10 in weeks and GB in gbs and f.get("Active?") and f.get("Published?"):
                all_matches.append((rec["id"], f.get("Assignment Full Name")))
        offset = hw.get("offset")
    print("week10_hw_matches_all", len(all_matches))

    # fixture week curriculum count (known working)
    FIX_WEEK = "recUPkXtsDOHnY5q7"
    st, hw = api("GET", "FBC Curriculum - SYNC", params={"pageSize": 100})
    fix = []
    offset = hw.get("offset") if st == 200 else None
    while True:
        for rec in (hw.get("records") or []) if st == 200 else []:
            f = rec.get("fields") or {}
            if FIX_WEEK in (f.get("Week") or []) and GB in (f.get("Grade Band") or []) and f.get("Active?") and f.get("Published?"):
                fix.append(rec["id"])
        offset = hw.get("offset") if st == 200 else None
        if not offset:
            break
        st, hw = api("GET", "FBC Curriculum - SYNC", params={"pageSize": 100, "offset": offset})
    print("fixture_week_hw", len(fix))


if __name__ == "__main__":
    main()
