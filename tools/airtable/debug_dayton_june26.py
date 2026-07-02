#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

DAYTON = "recAHTFTFc2q4y59i"


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    return os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    url = "https://api.airtable.com/v0/appn84sqPw03zEbTT/Submissions"
    fields = [
        "Enrollment",
        "Activity Date",
        "Activity Date Key",
        "Count This Submission?",
        "Total Shots Counted",
        "Duplicate Review Status",
        "Submission Stat Mode",
    ]
    records = []
    offset = None
    while True:
        params = {"pageSize": 100}
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
        if offset:
            params["offset"] = offset
        data = session.get(url, params=params, timeout=120).json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break

    dayton = []
    for r in records:
        enr = r.get("fields", {}).get("Enrollment") or []
        if not enr or enr[0] != DAYTON:
            continue
        f = r.get("fields", {})
        ad = str(f.get("Activity Date Key") or f.get("Activity Date", ""))[:10]
        dayton.append(
            (
                ad,
                f.get("Count This Submission?"),
                f.get("Total Shots Counted"),
                f.get("Duplicate Review Status"),
            )
        )

    for target in ["2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28"]:
        rows = [x for x in dayton if x[0] == target]
        print(f"{target}: {len(rows)} submission(s)")
        for row in rows:
            print(f"  count={row[1]} shots={row[2]} dup={row[3]}")


if __name__ == "__main__":
    main()
