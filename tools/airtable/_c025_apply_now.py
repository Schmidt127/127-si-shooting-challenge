#!/usr/bin/env python3
"""Apply C-025 helpers + formulas using tools/.env PAT only."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Ensure tools token wins before importing repair helpers
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
os.chdir(HERE)

from dotenv import dotenv_values

tv = dotenv_values(HERE / ".env")
TOKEN = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
if not TOKEN:
    raise SystemExit("missing tools/.env token")
os.environ["AIRTABLE_TOKEN"] = TOKEN
os.environ["AIRTABLE_API_TOKEN"] = TOKEN

import requests

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

FORMULAS = {
    "Zoom Credit Key": """IF(
  OR(
    {Enrollment RID} = BLANK(),
    {Zoom Meeting RID} = BLANK()
  ),
  BLANK(),
  "ZOOM_CREDIT|" & {Enrollment RID} & "|" & {Zoom Meeting RID}
)""",
    "Zoom Credit Conflict?": """IF(
  OR(
    {Enrollment RID} = BLANK(),
    {Meeting Approved Preconflict Pair Tags} = BLANK()
  ),
  0,
  IF(
    AND(
      FIND(
        {Enrollment RID} & "|LIVE",
        {Meeting Approved Preconflict Pair Tags} & ""
      ) > 0,
      FIND(
        {Enrollment RID} & "|REC",
        {Meeting Approved Preconflict Pair Tags} & ""
      ) > 0
    ),
    1,
    0
  )
)""",
    "Zoom Credit Approved?": """IF(
  AND(
    {Zoom Credit Pre-Approved?} = 1,
    {Zoom Credit Conflict?} != 1
  ),
  1,
  0
)""",
    "Zoom XP Percentage": """IF(
  {Zoom Credit Conflict?} = 1,
  0,
  IF(
    {Zoom Credit Pre-Approved?} != 1,
    0,
    IF(
      {Attendance Method} = "Live",
      100,
      IF(
        {Attendance Method} = "Recording Quiz",
        IF(
          {Effective Recording XP Percentage} = BLANK(),
          50,
          {Effective Recording XP Percentage}
        ),
        0
      )
    )
  )
)""",
    "Zoom XP Amount": """IF(
  OR(
    {Zoom Credit Conflict?} = 1,
    {Zoom Credit Approved?} != 1
  ),
  0,
  IF(
    {Normal Live Zoom XP} = BLANK(),
    0,
    FLOOR({Normal Live Zoom XP} * {Zoom XP Percentage} / 100)
  )
)""",
    "Zoom Gate Credit Earned?": """IF(
  {Zoom Credit Conflict?} = 1,
  0,
  IF(
    {Zoom Credit Approved?} != 1,
    0,
    IF(
      {Attendance Method} = "Live",
      1,
      IF(
        AND(
          {Attendance Method} = "Recording Quiz",
          {Effective Recording Counts for Level Gate?} = 1
        ),
        1,
        0
      )
    )
  )
)""",
    "Zoom Credit Debug": """"Method=" & {Attendance Method} &
" | LiveConfirmed=" &
IF({Live Attendance Confirmed?} = 1, "Y", "N") &
" | Review=" & {Recording Quiz Review Status} &
" | Satisfactory=" &
IF({Recording Quiz Satisfactory?} = 1, "Y", "N") &
" | PreApproved=" &
IF({Zoom Credit Pre-Approved?} = 1, "Y", "N") &
" | Conflict=" &
IF({Zoom Credit Conflict?} = 1, "Y", "N") &
" | Approved=" &
IF({Zoom Credit Approved?} = 1, "Y", "N") &
" | Pct=" & {Zoom XP Percentage} &
" | XP=" & {Zoom XP Amount} &
" | Gate=" &
IF({Zoom Gate Credit Earned?} = 1, "Y", "N") &
" | Key=" & {Zoom Credit Key} &
" | EnrollmentRID=" & {Enrollment RID} &
" | MeetingRID=" & {Zoom Meeting RID} &
" | EffectivePct=" & {Effective Recording XP Percentage} &
" | EffectiveGate=" &
{Effective Recording Counts for Level Gate?} &
" | EffectiveCoachApproval=" &
{Effective Recording Quiz Requires Coach Approval?} &
" | Deadline=" &
{Calculated Recording Quiz Deadline}""",
}

RESULT_TYPES = {
    "Zoom Credit Key": {"type": "singleLineText"},
    "Zoom Credit Conflict?": {"type": "number", "options": {"precision": 0}},
    "Zoom Credit Approved?": {"type": "number", "options": {"precision": 0}},
    "Zoom XP Percentage": {"type": "number", "options": {"precision": 0}},
    "Zoom XP Amount": {"type": "number", "options": {"precision": 0}},
    "Zoom Gate Credit Earned?": {"type": "number", "options": {"precision": 0}},
    "Zoom Credit Debug": {"type": "singleLineText"},
}


def tables():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json()["tables"]


def by_name(rows, name):
    for t in rows:
        if t.get("name") == name:
            return t
    return None


def field(table, name):
    for f in table.get("fields") or []:
        if f.get("name") == name:
            return f
    return None


def delete_probe():
    t = by_name(tables(), "Zoom Meetings")
    f = field(t, "C025 Schema Write Probe")
    if not f:
        return {"status": "absent"}
    # Meta API may not support field delete — try
    r = requests.delete(f"{META}/tables/{ZM}/fields/{f['id']}", headers=H, timeout=60)
    return {"status": r.status_code, "body": r.text[:200]}


def create_rollup(zm, za):
    existing = field(zm, "Approved Preconflict Pair Tags")
    if existing:
        return {"status": "existed", "id": existing["id"]}
    inv = field(zm, "Zoom Attendance")
    pre = field(za, "Preconflict Pair Tag")
    attempts = []
    payloads = [
        {
            "name": "Approved Preconflict Pair Tags",
            "type": "rollup",
            "description": "C-025 exclusivity tags",
            "options": {
                "recordLinkFieldId": inv["id"],
                "fieldIdInLinkedTable": pre["id"],
                "formula": "ARRAYJOIN(values)",
            },
        },
        {
            "name": "Approved Preconflict Pair Tags",
            "type": "rollup",
            "description": "C-025 exclusivity tags",
            "options": {
                "recordLinkFieldId": inv["id"],
                "fieldIdInLinkedTable": pre["id"],
                "formula": 'ARRAYJOIN(values, ",")',
            },
        },
    ]
    for i, payload in enumerate(payloads):
        r = requests.post(f"{META}/tables/{zm['id']}/fields", headers=H, json=payload, timeout=120)
        attempts.append({"i": i, "status": r.status_code, "body": r.text[:500]})
        if r.ok:
            return {"status": "created", "field": r.json(), "attempts": attempts}
    return {"status": "failed", "attempts": attempts}


def create_lookup(za, rollup_id):
    existing = field(za, "Meeting Approved Preconflict Pair Tags")
    if existing:
        return {"status": "existed", "id": existing["id"]}
    link = field(za, "Zoom Meeting")
    payloads = [
        {
            "name": "Meeting Approved Preconflict Pair Tags",
            "type": "multipleLookupValues",
            "description": "C-025 meeting-level preconflict tags",
            "options": {
                "recordLinkFieldId": link["id"],
                "fieldIdInLinkedTable": rollup_id,
            },
        },
    ]
    attempts = []
    for i, payload in enumerate(payloads):
        r = requests.post(f"{META}/tables/{za['id']}/fields", headers=H, json=payload, timeout=120)
        attempts.append({"i": i, "status": r.status_code, "body": r.text[:500]})
        if r.ok:
            return {"status": "created", "field": r.json(), "attempts": attempts}
    return {"status": "failed", "attempts": attempts}


def patch_formula(za, name, formula):
    f = field(za, name)
    if not f:
        return {"field": name, "ok": False, "error": "missing"}
    bodies = [
        {"options": {"formula": formula}},
        {
            "options": {
                "formula": formula,
                "result": RESULT_TYPES.get(name) or {"type": "singleLineText"},
            }
        },
    ]
    attempts = []
    for i, body in enumerate(bodies):
        r = requests.patch(
            f"{META}/tables/{za['id']}/fields/{f['id']}",
            headers=H,
            json=body,
            timeout=120,
        )
        attempts.append({"i": i, "status": r.status_code, "body": r.text[:400]})
        if r.ok:
            opts = (r.json() or {}).get("options") or {}
            return {
                "field": name,
                "ok": True,
                "formula": opts.get("formula"),
                "isValid": opts.get("isValid"),
                "attempts": attempts,
            }
    return {"field": name, "ok": False, "attempts": attempts}


def main():
    ts = tables()
    za = by_name(ts, "Zoom Attendance")
    zm = by_name(ts, "Zoom Meetings")
    report = {"probe_cleanup": delete_probe()}

    rollup = create_rollup(zm, za)
    report["rollup"] = {
        k: (v if k != "field" else {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")})
        for k, v in rollup.items()
    }
    if rollup.get("status") == "failed":
        PREVIEW.joinpath("c025_apply2_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(2)

    rollup_id = rollup.get("id") or (rollup.get("field") or {}).get("id")
    # refresh
    ts = tables()
    za = by_name(ts, "Zoom Attendance")
    zm = by_name(ts, "Zoom Meetings")
    if not rollup_id:
        rollup_id = field(zm, "Approved Preconflict Pair Tags")["id"]

    lookup = create_lookup(za, rollup_id)
    report["lookup"] = {
        k: (v if k != "field" else {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")})
        for k, v in lookup.items()
    }
    if lookup.get("status") == "failed":
        PREVIEW.joinpath("c025_apply2_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(3)

    ts = tables()
    za = by_name(ts, "Zoom Attendance")
    order = [
        "Zoom Credit Key",
        "Zoom Credit Conflict?",
        "Zoom Credit Approved?",
        "Zoom XP Percentage",
        "Zoom XP Amount",
        "Zoom Gate Credit Earned?",
        "Zoom Credit Debug",
    ]
    patched = []
    errors = []
    for name in order:
        res = patch_formula(za, name, FORMULAS[name])
        (patched if res.get("ok") else errors).append(res)
        # refresh schema after each successful patch so dependents resolve
        if res.get("ok"):
            ts = tables()
            za = by_name(ts, "Zoom Attendance")

    report["formulas"] = {"patched": patched, "errors": errors}

    # post-check
    ts = tables()
    za = by_name(ts, "Zoom Attendance")
    post = {}
    for name in order:
        f = field(za, name)
        opts = (f or {}).get("options") or {}
        post[name] = {
            "formula": opts.get("formula"),
            "isValid": opts.get("isValid"),
            "unable": (opts.get("formula") or "") == '"Unable to generate formula"',
        }
    report["post"] = post

    PREVIEW.joinpath("c025_apply2_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit(4)


if __name__ == "__main__":
    main()
