#!/usr/bin/env python3
"""Read-only: Conflict / Approved / XP Active for first-live recording case."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
ZA = "recfqsgM7zDobxsPf"
XP = "recOceuW34jQz7suD"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def get(path: str, token: str):
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/{PROD}/{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    token = load_token()
    za = get(f"Zoom%20Attendance/{ZA}", token)["fields"]
    xp = get(f"XP%20Events/{XP}", token)["fields"]
    print(
        json.dumps(
            {
                "Zoom Credit Conflict?": za.get("Zoom Credit Conflict?"),
                "Zoom Credit Approved?": za.get("Zoom Credit Approved?"),
                "XP Active?": xp.get("Active?"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
