#!/usr/bin/env python3
"""C-025 DEV: inspect + apply deadline repair (Week End Date + formula + verify)."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

# Prefer tools/.env (schema write PAT) — do not let web override
tv = dotenv_values(HERE / ".env")
TOKEN = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
if not TOKEN:
    raise SystemExit("missing tools/.env AIRTABLE token")
os.environ["AIRTABLE_TOKEN"] = TOKEN
os.environ["AIRTABLE_API_TOKEN"] = TOKEN

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
DATA = f"https://api.airtable.com/v0/{DEV}"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Design §4 modes/defaults + required Airtable adaptations for lookup Week End Date:
# - bare {Week End Date} / MAX/MIN with dateTime blanks or returns lookup arrays
# - scalarize with DATETIME_PARSE(ARRAYJOIN(...)); Later/Earlier via DATETIME_DIFF pick
_WED = "DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')"
_DAYS = "IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days})"
_AVAIL_PLUS = f"DATEADD({{Recording Available At}}, {_DAYS}, 'days')"
DEADLINE_FORMULA = f"""IF(
  OR(
    {{Recording Available At}} = BLANK(),
    {{Attendance Method}} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({{Effective Recording Deadline Mode}} = BLANK(), "Later of Both", {{Effective Recording Deadline Mode}}),
    "Days After Recording Available",
      {_AVAIL_PLUS},
    "End of Program Week",
      IF({{Week End Date}} = BLANK(), BLANK(), {_WED}),
    "Earlier of Both",
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(), {_AVAIL_PLUS}, {_WED}),
        IF(
          DATETIME_DIFF({_AVAIL_PLUS}, {_WED}, 'seconds') <= 0,
          {_AVAIL_PLUS},
          {_WED}
        )
      ),
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(), {_AVAIL_PLUS}, {_WED}),
        IF(
          DATETIME_DIFF({_AVAIL_PLUS}, {_WED}, 'seconds') >= 0,
          {_AVAIL_PLUS},
          {_WED}
        )
      )
  )
)"""


def tables():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json()["tables"]


def tby(name, ts=None):
    for t in ts or tables():
        if t["name"] == name:
            return t
    raise SystemExit(f"missing table {name}")


def fby(t, name):
    for f in t.get("fields") or []:
        if f.get("name") == name:
            return f
    return None


def cmd_inspect():
    ts = tables()
    zm = tby("Zoom Meetings", ts)
    za = tby("Zoom Attendance", ts)
    weeks = tby("Weeks", ts)
    probe = fby(zm, "C025 Schema Write Probe")
    week_link = fby(zm, "Week")
    week_end_src = fby(weeks, "End Date")
    week_end = fby(zm, "Week End Date")
    calc = fby(zm, "Calculated Recording Quiz Deadline")
    za_calc = fby(za, "Calculated Recording Quiz Deadline")
    attend_method_zm = fby(zm, "Attendance Method")
    out = {
        "zm_id": zm["id"],
        "za_id": za["id"],
        "weeks_id": weeks["id"],
        "probe_still_present": bool(probe),
        "week_link": {"id": week_link["id"], "type": week_link["type"]} if week_link else None,
        "weeks_end_date": {"id": week_end_src["id"], "type": week_end_src["type"]} if week_end_src else None,
        "week_end_date_on_zm": (
            {"id": week_end["id"], "type": week_end["type"], "options": week_end.get("options")}
            if week_end
            else None
        ),
        "calc_deadline_zm": {
            "id": calc["id"],
            "type": calc["type"],
            "formula": (calc.get("options") or {}).get("formula"),
            "result": (calc.get("options") or {}).get("result"),
            "isValid": (calc.get("options") or {}).get("isValid"),
        }
        if calc
        else None,
        "calc_deadline_za": {
            "id": za_calc["id"],
            "type": za_calc["type"],
            "options": za_calc.get("options"),
        }
        if za_calc
        else None,
        "attendance_method_on_zm": (
            {"id": attend_method_zm["id"], "type": attend_method_zm["type"]}
            if attend_method_zm
            else None
        ),
        "views_za": [
            {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")}
            for v in (za.get("views") or [])
        ],
    }
    PREVIEW.joinpath("c025_deadline_inspect.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


def create_week_end_date(zm, weeks):
    existing = fby(zm, "Week End Date")
    if existing:
        return {"status": "existed", "id": existing["id"], "type": existing["type"]}
    week_link = fby(zm, "Week")
    end = fby(weeks, "End Date")
    if not week_link or not end:
        return {"status": "error", "error": "Week link or Weeks.End Date missing"}
    payload = {
        "name": "Week End Date",
        "type": "multipleLookupValues",
        "description": "C-025 — lookup Weeks.End Date for recording quiz deadline",
        "options": {
            "recordLinkFieldId": week_link["id"],
            "fieldIdInLinkedTable": end["id"],
        },
    }
    r = requests.post(f"{META}/tables/{zm['id']}/fields", headers=H, json=payload, timeout=120)
    if not r.ok:
        return {"status": "error", "code": r.status_code, "body": r.text[:800]}
    f = r.json()
    return {"status": "created", "id": f["id"], "type": f["type"], "name": f["name"]}


def patch_deadline_formula(zm):
    calc = fby(zm, "Calculated Recording Quiz Deadline")
    if not calc:
        return {"status": "error", "error": "Calculated Recording Quiz Deadline missing on Zoom Meetings"}
    # Try formula only first; then with result dateTime hint if supported
    attempts = []
    bodies = [
        {"options": {"formula": DEADLINE_FORMULA}},
        {
            "options": {
                "formula": DEADLINE_FORMULA,
                "result": {"type": "dateTime", "options": {"dateFormat": {"name": "local", "format": "l"}, "timeFormat": {"name": "12hour", "format": "h:mma"}, "timeZone": "client"}},
            }
        },
        {
            "options": {
                "formula": DEADLINE_FORMULA,
                "result": {"type": "date", "options": {"dateFormat": {"name": "local", "format": "l"}}},
            }
        },
    ]
    for i, body in enumerate(bodies):
        r = requests.patch(
            f"{META}/tables/{zm['id']}/fields/{calc['id']}",
            headers=H,
            json=body,
            timeout=120,
        )
        attempts.append({"i": i, "status": r.status_code, "body": r.text[:600]})
        if r.ok:
            opts = (r.json() or {}).get("options") or {}
            return {
                "status": "patched",
                "id": calc["id"],
                "formula": opts.get("formula"),
                "result": opts.get("result"),
                "isValid": opts.get("isValid"),
                "attempts": attempts,
            }
    return {"status": "error", "attempts": attempts}


def ensure_view(za):
    target = "Zoom Recording Quiz - Past Deadline"
    em_dash = "Zoom Recording Quiz — Past Deadline"
    views = za.get("views") or []
    found = None
    for v in views:
        n = v.get("name") or ""
        if n == target or n == em_dash or ("Past Deadline" in n and "Recording Quiz" in n):
            found = v
            break
    if found:
        # Meta API view rename/filter often limited — report and give UI steps if can't configure
        rename_needed = found.get("name") != target
        return {
            "status": "found",
            "id": found.get("id"),
            "name": found.get("name"),
            "rename_needed": rename_needed,
            "filters_required": [
                "Attendance Method is Recording Quiz",
                "Calculated Recording Quiz Deadline is before today",
                "Zoom Credit Approved? is empty",
            ],
            "sort_required": "Calculated Recording Quiz Deadline ascending",
            "note": "Meta API cannot set view filters reliably; verify/adjust in UI if needed",
        }
    # Try create shell
    r = requests.post(
        f"{META}/tables/{za['id']}/views",
        headers=H,
        json={"name": target, "type": "grid"},
        timeout=60,
    )
    if r.ok:
        return {
            "status": "created_shell",
            "view": r.json(),
            "filters_required": [
                "Attendance Method is Recording Quiz",
                "Calculated Recording Quiz Deadline is before today",
                "Zoom Credit Approved? is empty",
            ],
            "sort_required": "Calculated Recording Quiz Deadline ascending",
            "note": "Filters must be confirmed in UI — API create does not set filters",
        }
    return {
        "status": "manual_required",
        "reason": f"{r.status_code}: {r.text[:400]}",
        "name": target,
        "filters_required": [
            "Attendance Method is Recording Quiz",
            "Calculated Recording Quiz Deadline is before today",
            "Zoom Credit Approved? is empty",
        ],
        "sort_required": "Calculated Recording Quiz Deadline ascending",
    }


def cmd_apply():
    ts = tables()
    zm = tby("Zoom Meetings", ts)
    za = tby("Zoom Attendance", ts)
    weeks = tby("Weeks", ts)
    report = {"inspect_before": {}}
    calc = fby(zm, "Calculated Recording Quiz Deadline")
    report["inspect_before"]["calc_result"] = (calc.get("options") or {}).get("result") if calc else None
    report["inspect_before"]["attendance_method_on_zm"] = bool(fby(zm, "Attendance Method"))
    report["inspect_before"]["za_lookup"] = bool(fby(za, "Calculated Recording Quiz Deadline"))

    if not report["inspect_before"]["za_lookup"]:
        report["stop"] = "Zoom Attendance lookup Calculated Recording Quiz Deadline MISSING — stop per task"
        PREVIEW.joinpath("c025_deadline_apply.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(3)

    report["week_end_date"] = create_week_end_date(zm, weeks)
    if report["week_end_date"].get("status") == "error":
        PREVIEW.joinpath("c025_deadline_apply.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(4)

    # refresh after create
    ts = tables()
    zm = tby("Zoom Meetings", ts)
    report["formula"] = patch_deadline_formula(zm)
    if report["formula"].get("status") != "patched":
        PREVIEW.joinpath("c025_deadline_apply.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(5)

    ts = tables()
    zm = tby("Zoom Meetings", ts)
    za = tby("Zoom Attendance", ts)
    calc = fby(zm, "Calculated Recording Quiz Deadline")
    report["after"] = {
        "calc_result": (calc.get("options") or {}).get("result") if calc else None,
        "calc_valid": (calc.get("options") or {}).get("isValid") if calc else None,
        "week_end": fby(zm, "Week End Date"),
    }
    if report["after"]["week_end"]:
        report["after"]["week_end"] = {
            "id": report["after"]["week_end"]["id"],
            "type": report["after"]["week_end"]["type"],
            "options": report["after"]["week_end"].get("options"),
        }
    report["view"] = ensure_view(za)
    PREVIEW.joinpath("c025_deadline_apply.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def sample_deadlines():
    """Read sample Zoom Meetings / Attendance deadline values (no writes)."""
    ts = tables()
    zm = tby("Zoom Meetings", ts)
    za = tby("Zoom Attendance", ts)
    # meetings with Recording Available At
    r = requests.get(
        f"{DATA}/{zm['id']}",
        headers=H,
        params={
            "pageSize": 10,
            "maxRecords": 10,
            "fields[]": [
                "Recording Available At",
                "Week End Date",
                "Effective Recording Deadline Mode",
                "Effective Recording Makeup Window Days",
                "Attendance Method",
                "Calculated Recording Quiz Deadline",
            ],
        },
        timeout=60,
    )
    # if fields[] fails, fetch without
    if not r.ok:
        r = requests.get(f"{DATA}/{zm['id']}", headers=H, params={"pageSize": 10, "maxRecords": 10}, timeout=60)
    r.raise_for_status()
    meetings = []
    for rec in r.json().get("records") or []:
        f = rec.get("fields") or {}
        meetings.append(
            {
                "id": rec["id"],
                "available": f.get("Recording Available At"),
                "week_end": f.get("Week End Date"),
                "mode": f.get("Effective Recording Deadline Mode"),
                "days": f.get("Effective Recording Makeup Window Days"),
                "method": f.get("Attendance Method"),
                "deadline": f.get("Calculated Recording Quiz Deadline"),
                "deadline_type": type(f.get("Calculated Recording Quiz Deadline")).__name__,
            }
        )
    r2 = requests.get(
        f"{DATA}/{za['id']}",
        headers=H,
        params={
            "pageSize": 10,
            "maxRecords": 10,
            "filterByFormula": "OR({Attendance Method}='Live',{Attendance Method}='Recording Quiz')",
        },
        timeout=60,
    )
    if not r2.ok:
        r2 = requests.get(f"{DATA}/{za['id']}", headers=H, params={"pageSize": 10, "maxRecords": 10}, timeout=60)
    r2.raise_for_status()
    attend = []
    for rec in r2.json().get("records") or []:
        f = rec.get("fields") or {}
        d = f.get("Calculated Recording Quiz Deadline")
        attend.append(
            {
                "id": rec["id"],
                "method": f.get("Attendance Method"),
                "deadline": d,
                "deadline_type": type(d).__name__,
                "approved": f.get("Zoom Credit Approved?"),
            }
        )
    out = {"meetings": meetings, "attendance": attend}
    PREVIEW.joinpath("c025_deadline_samples.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "inspect"
    if cmd == "inspect":
        cmd_inspect()
    elif cmd == "apply":
        cmd_apply()
    elif cmd == "sample":
        sample_deadlines()
    else:
        raise SystemExit(f"unknown {cmd}")
