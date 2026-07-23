"""Set Schmidt Active?=true, ensure a current Week, seed foundation Testing Scenario."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

PROD = "appn84sqPw03zEbTT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
SCHMIDT_ATHLETE = "recgqVstObQRzgXJF"
DENVER = ZoneInfo("America/Denver")


def load_tok() -> str:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""


def api(tok: str, url: str, method: str = "GET", body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:800]}
        return e.code, payload


def list_all(tok: str, table: str):
    recs = []
    url = f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}?pageSize=100"
    while url:
        status, data = api(tok, url)
        if status != 200:
            raise SystemExit(f"list fail {table}: {status} {data}")
        recs.extend(data.get("records", []))
        off = data.get("offset")
        url = (
            f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}?pageSize=100&offset={urllib.parse.quote(off)}"
            if off
            else None
        )
    return recs


def main():
    tok = load_tok()
    out: dict = {"when": datetime.now(timezone.utc).isoformat(), "actions": []}

    # 1) Set Enrollment Active?=true (processing eligibility per SC-004)
    status, before = api(
        tok,
        f"https://api.airtable.com/v0/{PROD}/Enrollments/{SCHMIDT_ENROLLMENT}",
    )
    assert status == 200, before
    active_before = before.get("fields", {}).get("Active?")
    status, after = api(
        tok,
        f"https://api.airtable.com/v0/{PROD}/Enrollments/{SCHMIDT_ENROLLMENT}",
        method="PATCH",
        body={"fields": {"Active?": True}, "typecast": True},
    )
    print("ACTIVE_PATCH", status, "before", active_before, "after", (after.get("fields") or {}).get("Active?"))
    out["actions"].append(
        {
            "action": "set_enrollment_active_true",
            "enrollmentId": SCHMIDT_ENROLLMENT,
            "before": active_before,
            "status": status,
            "after": (after.get("fields") or {}).get("Active?"),
        }
    )

    # 2) Ensure a Week covering "today" Denver exists (or create foundation week)
    today = datetime.now(DENVER).date()
    weeks = list_all(tok, "Weeks")
    covering = []
    week_fields_sample = weeks[0]["fields"] if weeks else {}
    print("week_field_keys_sample", sorted(week_fields_sample.keys())[:40])

    def parse_day(val):
        if not val:
            return None
        # Airtable date or datetime
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00")).astimezone(DENVER).date()
        except Exception:
            try:
                return datetime.strptime(val[:10], "%Y-%m-%d").date()
            except Exception:
                return None

    for w in weeks:
        f = w.get("fields", {})
        start = parse_day(f.get("Start Date") or f.get("Week Start Date"))
        end = parse_day(f.get("End Date") or f.get("Week End Date"))
        if start and end and start <= today <= end:
            covering.append({"id": w["id"], "start": str(start), "end": str(end), "fields": {
                k: f.get(k) for k in ("Week Number", "Week Label", "Name", "Label") if k in f
            }})

    print("weeks_covering_today", covering)
    created_week = None
    if not covering:
        # Create a simple current week record using available writable date fields
        fields = {
            "Start Date": today.isoformat(),
            "End Date": today.isoformat(),
        }
        # Optional label-ish fields if present in schema via typecast names
        status, created_week = api(
            tok,
            f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Weeks')}",
            method="POST",
            body={"records": [{"fields": fields}], "typecast": True},
        )
        print("CREATE_WEEK", status, created_week if status != 200 else created_week.get("records", [{}])[0].get("id"))
        out["actions"].append({"action": "create_week", "status": status, "response": created_week})
        if status == 200:
            covering = [{"id": created_week["records"][0]["id"], "start": str(today), "end": str(today), "created": True}]
    out["weeksCoveringToday"] = covering

    # 3) Seed foundation Testing Scenario (Dry Run first — safe without 115)
    scenario_fields = {
        "Test Intake Name": "FOUNDATION-RESET-001 Daily Dry Run",
        "Scenario Type": "Daily Submission",
        "Test Status": "Queued",
        "Last Run Status": "Not Run",
        "Related Enrollment": [SCHMIDT_ENROLLMENT],
        "Submission Date": today.isoformat(),
        "Shot Total": 25,
        "Dry Run?": True,
        "Run Test?": False,
        "Expected Result": (
            "Dry-run of 115 creates no Submission. Live run (after 115 install) creates one "
            "Fillout-shaped Submission linked to Schmidt enrollment recgP9qZYjAhE7NXm with "
            "Shot Total 25 and Activity Date = Submission Date; no framework fields on pipeline tables."
        ),
        "Test Notes": "Foundation Reset Pack SC-001/SC-004 seed. Do not enable Run Test? until automation 115 is pasted in PROD.",
        "Scenario Requirements": "Requires automation 115 v1.8 installed on Testing Scenarios / Run Test? checked.",
    }
    status, scen = api(
        tok,
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Testing Scenarios')}",
        method="POST",
        body={"records": [{"fields": scenario_fields}], "typecast": True},
    )
    print("CREATE_SCENARIO", status)
    if status != 200:
        print(scen)
    else:
        sid = scen["records"][0]["id"]
        print("scenario_id", sid)
        out["actions"].append({"action": "create_scenario", "id": sid, "fields": scenario_fields})

    # 4) Re-read Schmidt summary
    status, enr = api(tok, f"https://api.airtable.com/v0/{PROD}/Enrollments/{SCHMIDT_ENROLLMENT}")
    status2, ath = api(tok, f"https://api.airtable.com/v0/{PROD}/Athletes/{SCHMIDT_ATHLETE}")
    out["schmidt"] = {
        "athleteId": SCHMIDT_ATHLETE,
        "enrollmentId": SCHMIDT_ENROLLMENT,
        "athleteActive": (ath.get("fields") or {}).get("Active?"),
        "enrollmentActive": (enr.get("fields") or {}).get("Active?"),
        "schoolYear": (enr.get("fields") or {}).get("School Year"),
        "grade": (enr.get("fields") or {}).get("Grade"),
        "gradeBand": (enr.get("fields") or {}).get("Grade Band"),
        "programInstance": (enr.get("fields") or {}).get("Program Instance"),
        "fullNameBackward": (enr.get("fields") or {}).get("Full Athlete Name - Backward"),
        "parentEmail": "set" if (enr.get("fields") or {}).get("Parent Email") else "blank",
        "athleteEmail": "set" if (enr.get("fields") or {}).get("Athlete Email") else "blank",
    }
    print(json.dumps(out["schmidt"], indent=2))

    Path("docs/foundation-reset/schmidt-seed-result.json").write_text(
        json.dumps(out, indent=2, default=str), encoding="utf-8"
    )
    print("wrote docs/foundation-reset/schmidt-seed-result.json")


if __name__ == "__main__":
    main()
