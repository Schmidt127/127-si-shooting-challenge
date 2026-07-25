"""Clear stuck Run Test? on C025 ETF scenario after failed one-click attempt."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
SCENARIO = "recEuHFTjBftoJGMc"
BASE_EXPECTED = "appTetnuCZlCZdTCT"


def main() -> None:
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    assert env["AIRTABLE_BASE_ID"] == BASE_EXPECTED
    fields = {
        "Run Test?": False,
        "Pass/Fail Notes": (
            "STOPPED promotion Step 1 — one-click failed. "
            "Paste 115 v1.4 if needed; turn 115 ON; turn 057+042 ON; re-check Run Test?; then OFF."
        ),
    }
    body = json.dumps({"fields": fields, "typecast": True}).encode("utf-8")
    url = (
        f"https://api.airtable.com/v0/{env['AIRTABLE_API_TOKEN'] and env['AIRTABLE_BASE_ID']}/"
        f"{urllib.parse.quote('Testing Scenarios')}/{SCENARIO}"
    )
    # fix url construction
    url = (
        f"https://api.airtable.com/v0/{env['AIRTABLE_BASE_ID']}/"
        f"{urllib.parse.quote('Testing Scenarios')}/{SCENARIO}"
    )
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {env.get('AIRTABLE_API_TOKEN') or env.get('AIRTABLE_TOKEN')}",
            "Content-Type": "application/json",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        rec = json.load(resp)
    print(json.dumps({"id": rec["id"], "Run Test?": rec["fields"].get("Run Test?")}, indent=2))


if __name__ == "__main__":
    main()
