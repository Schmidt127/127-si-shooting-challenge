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
WEEK_10 = "recrTwxqXtsDOHnY5q7"
WAS_FIXTURE = "recBO81w4dYtcaL4V"


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
    # Read smoke JSON for fresh was id if present
    smoke = ROOT / "docs/audits/phase-b-030-live-smoke-2026-07-14.json"
    if smoke.exists():
        payload = json.loads(smoke.read_text(encoding="utf-8"))
        print("critical_pass", payload.get("critical_pass"))
        for r in payload.get("results") or []:
            print(r["name"], r["pass"], json.dumps(r.get("detail"))[:200])

    # Page WAS looking for Schmidt / week10 / empty bootstrap
    st, data = api("GET", "Weekly Athlete Summary", params={"pageSize": 100})
    print("list", st, "n", len(data.get("records") or []) if isinstance(data, dict) else data[:200])
    orphans = []
    if isinstance(data, dict):
        for rec in data.get("records") or []:
            f = rec.get("fields") or {}
            enr = f.get("Enrollment") or []
            week = f.get("Week") or []
            if SCHMIDT in enr:
                orphans.append(
                    {
                        "id": rec["id"],
                        "week": week,
                        "gb": f.get("Grade Band"),
                        "goal": f.get("Goal Record"),
                        "hw": f.get("Homework"),
                        "created": f.get("Created"),
                    }
                )
    print("schmidt_was", json.dumps(orphans, indent=2))

    # fixture current
    st, fix = api("GET", "Weekly Athlete Summary", WAS_FIXTURE)
    f = fix.get("fields") or {}
    print(
        "fixture_now",
        {
            "gb": f.get("Grade Band"),
            "goal": f.get("Goal Record"),
            "hw": f.get("Homework"),
        },
    )


if __name__ == "__main__":
    main()
