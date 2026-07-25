"""Discover Zoom Meetings writable fields for fixture creation."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/meta/bases/{base}/tables",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as resp:
        tables = {t["name"]: t for t in json.load(resp)["tables"]}
    for tname in ["Zoom Meetings", "Zoom Attendance", "Weeks", "Challenge Weeks", "Program Weeks"]:
        t = tables.get(tname)
        if not t:
            print(tname, "MISSING")
            continue
        print("===", tname, "primary?", t.get("primaryFieldId"))
        for f in t["fields"][:40]:
            writable = f["type"] not in (
                "formula",
                "rollup",
                "lookup",
                "count",
                "createdTime",
                "lastModifiedTime",
                "autoNumber",
                "button",
                "multipleLookupValues",
            )
            if writable or f["name"] in (
                "Start Time",
                "Week",
                "Attendees",
                "Create XP Events",
                "Meeting Status",
                "XP Award Status",
                "Zoom Meeting Key",
            ):
                print(
                    " ",
                    f["name"],
                    f["type"],
                    "W" if writable else "R",
                    "PRIMARY" if f["id"] == t.get("primaryFieldId") else "",
                )


if __name__ == "__main__":
    main()
