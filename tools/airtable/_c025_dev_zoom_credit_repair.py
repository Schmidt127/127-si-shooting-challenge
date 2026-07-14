#!/usr/bin/env python3
"""C-025 DEV Zoom Attendance schema inspect + formula repair + Schmidt tests.

DEV only: appTetnuCZlCZdTCT
No PROD. No XP Events. No email. No automations.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DEV_BASE = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV_BASE}"
DATA = f"https://api.airtable.com/v0/{DEV_BASE}"
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

# Live DEV IDs from 2026-07-13 inspect (re-validated at apply time)
ZA_TABLE = "tblfwbt6aCDCM5gUz"
ZM_TABLE = "tblWcSHEm8vNNIxyB"

FIELDS_ZA = {
    "Zoom Credit Approved?": "fldJpQxQQuibUdi5w",
    "Zoom Credit Key": "fldhaYb9gaCndiQvx",
    "Zoom Credit Debug": "fldkoQiNgFoVG0ZoD",
    "Zoom Meeting": "fldHzgxuxbyzrQHYA",
    "Zoom Credit Pre-Approved?": "fldpukA5h9bxCw2L6",
    "Preconflict Pair Tag": "fldQJiAeb7K9G3cEl",
    "Recording Quiz Review Status": "fldWcpZKa0Qq0jnYV",
    "Recording Quiz Satisfactory?": "fldyHfzYweXOvukvl",
    "Live Attendance Confirmed?": "fldPNJzsEy6cMzYxd",
    "Zoom XP Percentage": "fld5ArV0SeMcHFcfw",
    "Zoom XP Amount": "fldplqn2f7yFwwyfg",
    "Zoom Gate Credit Earned?": "fldQR07soikQsD9nm",
    "Zoom Credit Conflict?": "fldXpn2rNrctyLac0",
    "Enrollment": "fld6VA8craEkzgl8y",
    "Normal Live Zoom XP": "fldipxuIl3SpoyC6G",
    "Attendance Method": "fld3bxJqGs4E8jB7j",
    "Effective Recording XP Percentage": "fldLD3TUULTJC6yMW",
    "Effective Recording Counts for Level Gate?": "fldOycbJ145fdx123",
    "Effective Recording Quiz Requires Coach Approval?": "fldKzXPUskh2UxwIz",
    "Enrollment RID": "fldovPSREAUf4TkeY",
    "Zoom Meeting RID": "fldsgzEskQIVRDFiY",
    "Calculated Recording Quiz Deadline": "fldJnSfq7APTY3JD5",
}

FIELDS_ZM = {
    "Zoom Attendance": "fldELpIe5BwPhXaTA",  # inverse of ZA.Zoom Meeting
}


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


def load_env() -> None:
    """Prefer tools/airtable/.env (schema write PAT). Do not let web/.env.local override."""
    load_dotenv(REPO / "web" / ".env.local", override=False)
    load_dotenv(HERE / ".env", override=True)


def tok() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN")
    return t


def headers() -> dict:
    return {"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"}


def fetch_tables() -> list[dict]:
    r = requests.get(f"{META}/tables", headers=headers(), timeout=120)
    r.raise_for_status()
    return r.json().get("tables") or []


def table_by_name(tables: list[dict], name: str) -> dict | None:
    for t in tables:
        if t.get("name") == name:
            return t
    return None


def field_by_name(table: dict, name: str) -> dict | None:
    for f in table.get("fields") or []:
        if f.get("name") == name:
            return f
    return None


def field_summary(fields: list[dict]) -> list[dict]:
    out = []
    for f in fields:
        item = {
            "id": f.get("id"),
            "name": f.get("name"),
            "type": f.get("type"),
        }
        opts = f.get("options") or {}
        if f.get("type") == "formula":
            item["formula"] = opts.get("formula")
            item["isValid"] = opts.get("isValid")
        if f.get("type") == "multipleRecordLinks":
            item["linkedTableId"] = opts.get("linkedTableId")
            item["inverseLinkFieldId"] = opts.get("inverseLinkFieldId")
        if f.get("type") in ("multipleLookupValues", "rollup"):
            item["recordLinkFieldId"] = opts.get("recordLinkFieldId")
            item["fieldIdInLinkedTable"] = opts.get("fieldIdInLinkedTable")
            if f.get("type") == "rollup":
                item["formula"] = opts.get("formula")
                item["result"] = opts.get("result")
        out.append(item)
    return out


def patch_formula(table_id: str, field_id: str, formula: str) -> dict:
    url = f"{META}/tables/{table_id}/fields/{field_id}"
    r = requests.patch(
        url,
        headers=headers(),
        json={"options": {"formula": formula}},
        timeout=120,
    )
    if not r.ok:
        return {"ok": False, "status": r.status_code, "body": r.text[:800]}
    opts = (r.json() or {}).get("options") or {}
    return {
        "ok": True,
        "status": r.status_code,
        "formula": opts.get("formula"),
        "isValid": opts.get("isValid"),
    }


def create_field(table_id: str, payload: dict) -> dict:
    url = f"{META}/tables/{table_id}/fields"
    r = requests.post(url, headers=headers(), json=payload, timeout=120)
    if r.status_code == 403:
        return {
            "ok": False,
            "status": 403,
            "manual_required": True,
            "body": r.text[:800],
            "payload": payload,
        }
    if not r.ok:
        return {"ok": False, "status": r.status_code, "body": r.text[:800], "payload": payload}
    return {"ok": True, "status": r.status_code, "field": r.json()}


def cmd_inspect() -> None:
    tables = fetch_tables()
    za = table_by_name(tables, "Zoom Attendance")
    zm = table_by_name(tables, "Zoom Meetings")
    if not za or not zm:
        raise SystemExit("Zoom Attendance or Zoom Meetings missing")
    out = {
        "Zoom Attendance": {"id": za["id"], "fields": field_summary(za.get("fields") or [])},
        "Zoom Meetings": {"id": zm["id"], "fields": field_summary(zm.get("fields") or [])},
    }
    path = PREVIEW / "c025_inspect.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "za_fields": len(out["Zoom Attendance"]["fields"]), "zm_fields": len(out["Zoom Meetings"]["fields"])}, indent=2))


def ensure_conflict_helpers(za: dict, zm: dict) -> dict:
    log: dict = {"created": [], "existed": [], "errors": [], "manual": []}

    inv = field_by_name(zm, "Zoom Attendance")
    if not inv or inv.get("type") != "multipleRecordLinks":
        log["errors"].append("Zoom Meetings inverse link 'Zoom Attendance' missing")
        return log

    pre = field_by_name(za, "Preconflict Pair Tag")
    if not pre:
        log["errors"].append("Preconflict Pair Tag missing on Zoom Attendance — Mike must create first")
        return log

    rollup = field_by_name(zm, "Approved Preconflict Pair Tags")
    if rollup:
        log["existed"].append("Zoom Meetings.Approved Preconflict Pair Tags")
        rollup_id = rollup["id"]
    else:
        created = create_field(
            zm["id"],
            {
                "name": "Approved Preconflict Pair Tags",
                "type": "rollup",
                "description": "C-025 — ARRAYJOIN of Zoom Attendance Preconflict Pair Tag for exclusivity",
                                        "options": {
                                            "recordLinkFieldId": inv["id"],
                                            "fieldIdInLinkedTable": pre["id"],
                                            "formula": "ARRAYJOIN(values)",
                                        },
            },
        )
        if created.get("manual_required"):
            log["manual"].append(created)
            return log
        if not created.get("ok"):
            log["errors"].append(created)
            return log
        rollup_id = created["field"]["id"]
        log["created"].append({"table": "Zoom Meetings", "name": "Approved Preconflict Pair Tags", "id": rollup_id})

    lookup = field_by_name(za, "Meeting Approved Preconflict Pair Tags")
    zoom_meeting = field_by_name(za, "Zoom Meeting")
    if lookup:
        log["existed"].append("Zoom Attendance.Meeting Approved Preconflict Pair Tags")
    else:
        if not zoom_meeting:
            log["errors"].append("Zoom Meeting link missing on Zoom Attendance")
            return log
        created = create_field(
            za["id"],
            {
                "name": "Meeting Approved Preconflict Pair Tags",
                "type": "multipleLookupValues",
                "description": "C-025 — lookup of Zoom Meetings.Approved Preconflict Pair Tags",
                                "options": {
                                    "recordLinkFieldId": zoom_meeting["id"],
                                    "fieldIdInLinkedTable": rollup_id,
                                },
            },
        )
        if created.get("manual_required"):
            log["manual"].append(created)
            return log
        if not created.get("ok"):
            log["errors"].append(created)
            return log
        log["created"].append(
            {
                "table": "Zoom Attendance",
                "name": "Meeting Approved Preconflict Pair Tags",
                "id": created["field"]["id"],
            }
        )
    return log


def apply_formulas(za: dict) -> dict:
    log: dict = {"patched": [], "errors": []}
    order = [
        "Zoom Credit Key",
        "Zoom Credit Conflict?",
        "Zoom Credit Approved?",
        "Zoom XP Percentage",
        "Zoom XP Amount",
        "Zoom Gate Credit Earned?",
        "Zoom Credit Debug",
    ]
    by_name = {f["name"]: f for f in za.get("fields") or []}
    for name in order:
        f = by_name.get(name)
        if not f:
            log["errors"].append({"field": name, "error": "missing"})
            continue
        if f.get("type") != "formula":
            log["errors"].append({"field": name, "error": f"type is {f.get('type')}, expected formula"})
            continue
        formula = FORMULAS[name]
        result = patch_formula(za["id"], f["id"], formula)
        entry = {"field": name, "id": f["id"], **result}
        if result.get("ok"):
            log["patched"].append(entry)
        else:
            log["errors"].append(entry)
    return log


def ensure_view(za: dict) -> dict:
    views = za.get("views") or []
    name = "Zoom Recording Quiz — Past Deadline"
    for v in views:
        if v.get("name") == name:
            return {"status": "existed", "id": v.get("id"), "name": name}

    # Meta API view creation is limited; try POST views
    url = f"{META}/tables/{za['id']}/views"
    payload = {
        "name": name,
        "type": "grid",
    }
    r = requests.post(url, headers=headers(), json=payload, timeout=60)
    if r.status_code == 404 or r.status_code == 405:
        return {
            "status": "manual_required",
            "reason": f"View create API not available ({r.status_code})",
            "name": name,
            "filters": [
                "Attendance Method = Recording Quiz",
                "Calculated Recording Quiz Deadline is before today",
                "Zoom Credit Approved? is not checked",
            ],
        }
    if not r.ok:
        return {
            "status": "manual_required",
            "reason": f"{r.status_code}: {r.text[:400]}",
            "name": name,
            "filters": [
                "Attendance Method = Recording Quiz",
                "Calculated Recording Quiz Deadline is before today",
                "Zoom Credit Approved? is not checked",
            ],
        }
    return {"status": "created_shell", "view": r.json(), "note": "Filters may need manual set"}


def cmd_apply() -> None:
    tables = fetch_tables()
    za = table_by_name(tables, "Zoom Attendance")
    zm = table_by_name(tables, "Zoom Meetings")
    if not za or not zm:
        raise SystemExit("tables missing")

    inv = field_by_name(zm, "Zoom Attendance")
    report = {
        "inspect": {
            "za_id": za["id"],
            "zm_id": zm["id"],
            "inverse_link": inv.get("name") if inv else None,
            "inverse_link_id": inv.get("id") if inv else None,
            "mike_manual_present": {
                "Zoom Credit Pre-Approved?": bool(field_by_name(za, "Zoom Credit Pre-Approved?")),
                "Preconflict Pair Tag": bool(field_by_name(za, "Preconflict Pair Tag")),
            },
            "approved_preconflict_rollup_before": bool(field_by_name(zm, "Approved Preconflict Pair Tags")),
            "meeting_lookup_before": bool(field_by_name(za, "Meeting Approved Preconflict Pair Tags")),
            "enrollment_rid_count": sum(1 for f in za.get("fields") or [] if f.get("name") == "Enrollment RID"),
            "zoom_meeting_rid_count": sum(1 for f in za.get("fields") or [] if f.get("name") == "Zoom Meeting RID"),
        }
    }

    helpers = ensure_conflict_helpers(za, zm)
    report["helpers"] = helpers
    if helpers.get("errors") or helpers.get("manual"):
        path = PREVIEW / "c025_apply_report.json"
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        raise SystemExit(3)

    # refresh schema after creates
    tables = fetch_tables()
    za = table_by_name(tables, "Zoom Attendance")
    assert za
    formulas = apply_formulas(za)
    report["formulas"] = formulas

    tables = fetch_tables()
    za = table_by_name(tables, "Zoom Attendance")
    assert za
    report["view"] = ensure_view(za)

    # post formulas snapshot
    post = {}
    for name in FORMULAS:
        f = field_by_name(za, name)
        if f:
            opts = f.get("options") or {}
            post[name] = {
                "id": f.get("id"),
                "formula": opts.get("formula"),
                "isValid": opts.get("isValid"),
                "matches_unable": (opts.get("formula") or "") == '"Unable to generate formula"',
            }
    report["post_formulas"] = post

    path = PREVIEW / "c025_apply_report.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if formulas.get("errors"):
        raise SystemExit(4)


def _truthy(v) -> bool:
    if v is True or v == 1 or v == "1":
        return True
    if isinstance(v, list) and len(v) == 1:
        return _truthy(v[0])
    return False


def _num(v):
    if v is None or v == "":
        return None
    if isinstance(v, list) and len(v) == 1:
        return _num(v[0])
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return ",".join(_text(x) for x in v)
    return str(v)


def list_records(table_id: str, fields: list[str] | None = None, formula: str | None = None, max_records: int = 100) -> list[dict]:
    params: dict = {"pageSize": 100, "maxRecords": max_records}
    if fields:
        params["fields[]"] = fields
    if formula:
        params["filterByFormula"] = formula
    out = []
    offset = None
    while True:
        p = dict(params)
        if offset:
            p["offset"] = offset
        r = requests.get(f"{DATA}/{table_id}", headers=headers(), params=p, timeout=120)
        r.raise_for_status()
        data = r.json()
        out.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset or len(out) >= max_records:
            break
    return out[:max_records]


CREDIT_FIELDS = [
    "Attendance Method",
    "Live Attendance Confirmed?",
    "Recording Quiz Review Status",
    "Recording Quiz Satisfactory?",
    "Zoom Credit Pre-Approved?",
    "Zoom Credit Conflict?",
    "Zoom Credit Approved?",
    "Zoom XP Percentage",
    "Zoom XP Amount",
    "Zoom Gate Credit Earned?",
    "Zoom Credit Key",
    "Enrollment RID",
    "Zoom Meeting RID",
    "Normal Live Zoom XP",
    "Effective Recording XP Percentage",
    "Effective Recording Counts for Level Gate?",
    "Preconflict Pair Tag",
    "Zoom Credit Debug",
    "Enrollment",
    "Zoom Meeting",
]

# Optional — only request after created on Zoom Attendance
CREDIT_FIELDS_OPTIONAL = [
    "Meeting Approved Preconflict Pair Tags",
]


def snapshot_record(rec: dict) -> dict:
    f = rec.get("fields") or {}
    return {
        "id": rec["id"],
        "method": _text(f.get("Attendance Method")),
        "live_confirmed": _truthy(f.get("Live Attendance Confirmed?")),
        "review": _text(f.get("Recording Quiz Review Status")),
        "satisfactory": _truthy(f.get("Recording Quiz Satisfactory?")),
        "pre_approved": _truthy(f.get("Zoom Credit Pre-Approved?")),
        "conflict": _truthy(f.get("Zoom Credit Conflict?")),
        "approved": _truthy(f.get("Zoom Credit Approved?")),
        "pct": _num(f.get("Zoom XP Percentage")),
        "xp": _num(f.get("Zoom XP Amount")),
        "gate": _truthy(f.get("Zoom Gate Credit Earned?")),
        "key": _text(f.get("Zoom Credit Key")),
        "enroll_rid": _text(f.get("Enrollment RID")),
        "meeting_rid": _text(f.get("Zoom Meeting RID")),
        "normal_xp": _num(f.get("Normal Live Zoom XP")),
        "eff_pct": _num(f.get("Effective Recording XP Percentage")),
        "eff_gate": _truthy(f.get("Effective Recording Counts for Level Gate?")),
        "preconflict_tag": _text(f.get("Preconflict Pair Tag")),
        "meeting_tags": _text(f.get("Meeting Approved Preconflict Pair Tags")),
        "debug": _text(f.get("Zoom Credit Debug"))[:240],
    }


def cmd_find_schmidt() -> None:
    # Find enrollment IDs for Schmidt, then attendance linked to them
    enrollments = list_records(
        "tbl3PFmwbRoabu1YV",
        fields=["Athlete Name", "Name", "Record Id"],
        formula="OR(FIND('Schmidt', {Athlete Name}&''), FIND('Schmidt', {Name}&''))",
        max_records=50,
    )
    # Athlete name field may differ — broaden
    if not enrollments:
        # pull a page and filter client-side is expensive; try common field
        enrollments = list_records(
            "tbl3PFmwbRoabu1YV",
            formula="FIND('Schmidt', ARRAYJOIN({Athlete}))",
            max_records=20,
        )
    print(json.dumps({"enrollments_found": len(enrollments), "sample": enrollments[:5]}, indent=2, default=str))


def get_record(table_id: str, record_id: str, fields: list[str] | None = None) -> dict:
    params = {}
    if fields:
        params["fields[]"] = fields
    r = requests.get(f"{DATA}/{table_id}/{record_id}", headers=headers(), params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def update_record(table_id: str, record_id: str, fields: dict) -> dict:
    r = requests.patch(
        f"{DATA}/{table_id}/{record_id}",
        headers=headers(),
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"update failed {r.status_code}: {r.text[:500]}")
    return r.json()


def cmd_test() -> None:
    """Non-destructive read survey + optional conflict setup on Schmidt DEV rows.

    Looks for existing Live + Recording Quiz attendance sharing enrollment+meeting.
    Does not create XP Events or send email.
    """
    tables = fetch_tables()
    za = table_by_name(tables, "Zoom Attendance")
    assert za

    fields = list(CREDIT_FIELDS)
    if field_by_name(za, "Meeting Approved Preconflict Pair Tags"):
        fields.extend(CREDIT_FIELDS_OPTIONAL)

    # First get recent ZA records that have methods set
    recs = list_records(
        za["id"],
        fields=fields,
        formula="OR({Attendance Method} = 'Live', {Attendance Method} = 'Recording Quiz')",
        max_records=200,
    )
    snaps = [snapshot_record(r) for r in recs]

    # Prefer rows whose Enrollment RID appears (Schmidt enrollment ids often start with rec)
    # Group by enroll|meeting
    from collections import defaultdict

    groups: dict[str, list] = defaultdict(list)
    for s in snaps:
        if s["enroll_rid"] and s["meeting_rid"]:
            groups[f"{s['enroll_rid']}|{s['meeting_rid']}"].append(s)

    # Find candidate pairs for conflict
    conflict_candidates = []
    for key, rows in groups.items():
        methods = {r["method"] for r in rows}
        if "Live" in methods and "Recording Quiz" in methods:
            conflict_candidates.append({"pair": key, "rows": rows})

    live_ok = [s for s in snaps if s["method"] == "Live" and s["live_confirmed"] and s["pre_approved"] and not s["conflict"]]
    rec_ok = [
        s
        for s in snaps
        if s["method"] == "Recording Quiz"
        and s["review"] == "Satisfactory"
        and s["satisfactory"]
        and s["pre_approved"]
        and not s["conflict"]
    ]
    blank_enroll = [s for s in snaps if not s["enroll_rid"]][:5]
    blank_meeting = [s for s in snaps if not s["meeting_rid"]][:5]

    results = {
        "counts": {
            "surveyed": len(snaps),
            "live_confirmed_preapproved_no_conflict": len(live_ok),
            "recording_satisfactory_preapproved_no_conflict": len(rec_ok),
            "conflict_pair_groups": len(conflict_candidates),
            "blank_enroll_sample": len(blank_enroll),
            "blank_meeting_sample": len(blank_meeting),
        },
        "tests": [],
    }

    def check(name: str, ok: bool, detail: dict) -> None:
        results["tests"].append({"name": name, "ok": ok, "detail": detail})

    # Test 1 — Live
    if live_ok:
        s = live_ok[0]
        expected_xp = None
        if s["normal_xp"] is not None and s["pct"] is not None:
            import math

            expected_xp = math.floor(s["normal_xp"] * s["pct"] / 100)
        ok = (
            s["pre_approved"] is True
            and s["conflict"] is False
            and s["approved"] is True
            and s["pct"] == 100
            and s["gate"] is True
            and (expected_xp is None or s["xp"] == expected_xp)
            and bool(s["key"])
        )
        check("live_approved_full", ok, {"record": s, "expected_xp": expected_xp})
    else:
        check("live_approved_full", False, {"error": "no Live+confirmed+preapproved non-conflict row found"})

    # Test 2 — Recording
    if rec_ok:
        s = rec_ok[0]
        expected_pct = s["eff_pct"] if s["eff_pct"] is not None else 50
        expected_gate = bool(s["eff_gate"])
        ok = (
            s["pre_approved"] is True
            and s["conflict"] is False
            and s["approved"] is True
            and s["pct"] == expected_pct
            and s["gate"] == expected_gate
            and bool(s["key"])
        )
        check("recording_satisfactory", ok, {"record": s, "expected_pct": expected_pct, "expected_gate": expected_gate})
    else:
        check("recording_satisfactory", False, {"error": "no Satisfactory recording non-conflict row found"})

    # Test 3 — Conflict pairs
    if conflict_candidates:
        pair = conflict_candidates[0]
        both = True
        for r in pair["rows"]:
            if r["method"] not in ("Live", "Recording Quiz"):
                continue
            if not (
                r["conflict"] is True
                and r["approved"] is False
                and r["pct"] == 0
                and (r["xp"] == 0 or r["xp"] is None)
                and r["gate"] is False
            ):
                both = False
        check("conflict_pair", both, {"pair": pair["pair"], "rows": pair["rows"]})
    else:
        check("conflict_pair", False, {"error": "no Live+Recording pair for same enrollment+meeting"})

    # Test 4/5 — blank keys from surveyed blanks or synthetic observation
    if blank_enroll:
        s = blank_enroll[0]
        check("blank_enrollment_key", s["key"] == "", {"record": s})
    else:
        check("blank_enrollment_key", False, {"error": "no blank Enrollment RID row in survey"})

    if blank_meeting:
        s = blank_meeting[0]
        check("blank_meeting_key", s["key"] == "", {"record": s})
    else:
        check("blank_meeting_key", False, {"error": "no blank Zoom Meeting RID row in survey"})

    results["pass"] = sum(1 for t in results["tests"] if t["ok"])
    results["fail"] = sum(1 for t in results["tests"] if not t["ok"])
    results["total"] = len(results["tests"])

    path = PREVIEW / "c025_test_report.json"
    path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))


def main() -> None:
    load_env()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "inspect"
    if cmd == "inspect":
        cmd_inspect()
    elif cmd == "apply":
        cmd_apply()
    elif cmd == "test":
        cmd_test()
    elif cmd == "find-schmidt":
        cmd_find_schmidt()
    else:
        raise SystemExit(f"unknown cmd {cmd}")


if __name__ == "__main__":
    main()
