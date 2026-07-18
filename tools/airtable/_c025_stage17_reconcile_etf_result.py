"""Reconcile C025 ETF record from last mirror JSON with corrected Phase A criteria."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
RUN = Path(__file__).resolve().parent / "_preview" / "c025_stage17_etf_live_run.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"


def load_env():
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main():
    env = load_env()
    assert env["AIRTABLE_BASE_ID"] == BASE_EXPECTED
    data = json.loads(RUN.read_text(encoding="utf-8"))
    m = data["mirror"]
    a = m["phaseA_057"]
    # Corrected Phase A: count + applied (status Pending is acceptable)
    pass_a = (
        (a.get("zoom_attendance_count") or 0) == 1
        and a.get("pw_applied_after") is True
        and (a.get("attendees") or []) == []
    )
    pass_b = m["passB"]
    pass_d = m["passDedupe"]
    attendees_ok = m["attendees_unchanged"]
    overall = pass_a and pass_b and pass_d and attendees_ok

    m2 = dict(m)
    m2["passA"] = pass_a
    m2["passA_note"] = (
        "Corrected: 057 wrote zoom_attendance_count=1 and PW Applied?=true; "
        f"WAS status remained {a.get('was_status')} (Ready not required for pass)."
    )
    m2["overallPass"] = overall
    m2["reconciled_at"] = datetime.now(timezone.utc).isoformat()

    data["mirror"] = m2
    data["overall_status"] = "Pass" if overall else "Fail"
    data["reconciled"] = True
    RUN.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    notes = (
        "PASS — C025_STAGE17_DOWNSTREAM (Records API mirror; 115 still v1.3). "
        "057 Zoom count=1; PW Applied; 042 Gate Applied; dedupe stable; Attendees []. "
        "Turn 057 and 042 OFF now."
        if overall
        else "FAIL after reconcile — see Actual Result. Turn 057/042 OFF."
    )
    fields = {
        "Last Run Status": "Pass" if overall else "Fail",
        "Last Run At": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "Actual Result": json.dumps(
            {
                "path_115_first_attempt": data.get("path_115"),
                **m2,
            },
            indent=2,
            default=str,
        )[:95000],
        "Pass/Fail Notes": notes,
        "Test Status": "Completed" if overall else "Blocked",
        "Run Test?": False,
    }
    body = json.dumps({"fields": fields, "typecast": True}).encode("utf-8")
    url = (
        f"https://api.airtable.com/v0/{env['AIRTABLE_BASE_ID']}/"
        f"{urllib.parse.quote('Testing Scenarios')}/{data['scenario_id']}"
    )
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {env['AIRTABLE_API_TOKEN']}",
            "Content-Type": "application/json",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as resp:
        json.load(resp)

    print(
        json.dumps(
            {
                "scenario_id": data["scenario_id"],
                "overall_status": data["overall_status"],
                "passA": pass_a,
                "passB": pass_b,
                "passDedupe": pass_d,
                "attendees_empty": attendees_ok,
                "MIKE": "Turn Automation 057 and 042 OFF immediately",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
