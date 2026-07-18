"""Create DEV Testing Scenarios row for C025_STAGE17_DOWNSTREAM (no Run Test yet)."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_etf_scenario_row.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
NAME = "C025_STAGE17_DOWNSTREAM"

REQUIREMENTS = {
    "scenario": NAME,
    "enrollmentId": SCHMIDT,
    "weekId": "rec7fCckt1zj9CbmP",
    "zoomAttendanceId": "reciRsLuiJGYcea3U",
    "zoomMeetingId": "recwnEKJAW8hxPSNL",
    "wasId": "recvtukGFL7u74Tme",
}


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
    assert base == BASE_EXPECTED, base

    # Find existing
    formula = f"{{Test Intake Name}}='{NAME}'"
    list_url = (
        f"https://api.airtable.com/v0/{base}/{urllib.parse.quote('Testing Scenarios')}"
        f"?filterByFormula={urllib.parse.quote(formula)}&pageSize=5"
    )
    req = urllib.request.Request(list_url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        existing = json.load(resp).get("records", [])

    fields = {
        "Test Intake Name": NAME,
        "Scenario Type": "Other",
        "Related Enrollment": [SCHMIDT],
        "Submission Date": "2026-07-18",
        "Scenario Requirements": json.dumps(REQUIREMENTS, indent=2),
        "Expected Result": (
            "057 Zoom attendance count=1; Perfect Week Credit Applied?=true; "
            "042 Gate Credit Applied?=true; Attendees=[]; dedupe stable; Last Run Status=Pass"
        ),
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
        "Test Notes": "C-025 Stage 17 ETF — Mike: paste 115 v1.4, turn 057+042 ON, check Run Test?, wait, turn OFF.",
    }

    if existing:
        rid = existing[0]["id"]
        data = json.dumps({"fields": fields, "typecast": True}).encode("utf-8")
        patch = urllib.request.Request(
            f"https://api.airtable.com/v0/{base}/{urllib.parse.quote('Testing Scenarios')}/{rid}",
            data=data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="PATCH",
        )
        with urllib.request.urlopen(patch) as resp:
            rec = json.load(resp)
        action = "updated"
    else:
        data = json.dumps({"fields": fields, "typecast": True}).encode("utf-8")
        post = urllib.request.Request(
            f"https://api.airtable.com/v0/{base}/{urllib.parse.quote('Testing Scenarios')}",
            data=data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(post) as resp:
            rec = json.load(resp)
        action = "created"

    out = {"action": action, "id": rec["id"], "fields": rec.get("fields", {}), "requirements": REQUIREMENTS}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, indent=2, default=str)[:2500])
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
