#!/usr/bin/env python3
"""PROD Stage 17: create Attendance Method, Week End Date lookup, then 11 Effective/deadline formulas.

Hard rules:
- PROD only (appn84sqPw03zEbTT)
- Do not enable automations
- Do not install 115
- Do not create Approved Preconflict Pair Tags
- Do not create Zoom Attendance deadline lookup
- Do not rename Global Config / Program Config links
- Stop rather than create an invalid formula
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "_preview" / "c025_stage17_prod_effective_create.json"
PROD = "appn84sqPw03zEbTT"

# Exact formulas from docs/deploy-checklists/C-025-stage17-formula-build-order.md @ 8c06b07
# Field-name form; Config lookup field names unchanged. Link fields are Global Config / Program Config
# (already used by existing Global Config:* / Program Config:* lookups — not referenced directly here).

FORMULAS: list[dict] = [
    {
        "name": "Effective Recording Approval Email Enabled?",
        "order": "C1",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Approval Email Enabled — Meeting Override",
            "Program Config: Approval Email Enabled",
            "Global Config: Approval Email Enabled",
        ],
        "formula": """IF(
  {Approval Email Enabled — Meeting Override} = "Yes", TRUE(),
  IF(
    {Approval Email Enabled — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Approval Email Enabled} = "Yes", TRUE(),
      IF(
        {Program Config: Approval Email Enabled} = "No", FALSE(),
        IF(
          {Global Config: Approval Email Enabled} = "Yes", TRUE(),
          IF(
            {Global Config: Approval Email Enabled} = "No", FALSE(),
            FALSE()
          )
        )
      )
    )
  )
)""",
    },
    {
        "name": "Effective Recording Approval Email Template Key",
        "order": "C2",
        "result": {"type": "singleLineText"},
        "deps": [
            "Approval Email Template Key — Meeting Override",
            "Program Config: Approval Email Template Key",
            "Global Config: Approval Email Template Key",
        ],
        "formula": """IF(
  LEN(TRIM({Approval Email Template Key — Meeting Override} & "")) > 0,
  {Approval Email Template Key — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Approval Email Template Key}) & "")) > 0,
    ARRAYJOIN({Program Config: Approval Email Template Key}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Approval Email Template Key}) & "")) > 0,
      ARRAYJOIN({Global Config: Approval Email Template Key}),
      BLANK()
    )
  )
)""",
    },
    {
        "name": "Effective Recording Approval Email Timing",
        "order": "C3",
        "result": {"type": "singleLineText"},
        "deps": [
            "Approval Email Timing — Meeting Override",
            "Program Config: Approval Email Timing",
            "Global Config: Approval Email Timing",
        ],
        "formula": """IF(
  LEN(TRIM({Approval Email Timing — Meeting Override} & "")) > 0,
  {Approval Email Timing — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Approval Email Timing}) & "")) > 0,
    ARRAYJOIN({Program Config: Approval Email Timing}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Approval Email Timing}) & "")) > 0,
      ARRAYJOIN({Global Config: Approval Email Timing}),
      "On Satisfactory"
    )
  )
)""",
    },
    {
        "name": "Effective Recording Counts for Level Gate?",
        "order": "C4",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Full Gate Credit — Meeting Override",
            "Program Config: Full Gate Credit",
            "Global Config: Full Gate Credit",
        ],
        "formula": """IF(
  {Full Gate Credit — Meeting Override} = "Yes", TRUE(),
  IF(
    {Full Gate Credit — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Full Gate Credit} = "Yes", TRUE(),
      IF(
        {Program Config: Full Gate Credit} = "No", FALSE(),
        IF(
          {Global Config: Full Gate Credit} = "Yes", TRUE(),
          IF(
            {Global Config: Full Gate Credit} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)""",
    },
    {
        "name": "Effective Recording Counts for Perfect Week?",
        "order": "C5",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Perfect Week Credit — Meeting Override",
            "Program Config: Perfect Week Credit",
            "Global Config: Perfect Week Credit",
        ],
        "formula": """IF(
  {Perfect Week Credit — Meeting Override} = "Yes", TRUE(),
  IF(
    {Perfect Week Credit — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Perfect Week Credit} = "Yes", TRUE(),
      IF(
        {Program Config: Perfect Week Credit} = "No", FALSE(),
        IF(
          {Global Config: Perfect Week Credit} = "Yes", TRUE(),
          IF(
            {Global Config: Perfect Week Credit} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)""",
    },
    {
        "name": "Effective Recording Deadline Mode",
        "order": "C6",
        "result": {"type": "singleLineText"},
        "deps": [
            "Deadline Mode — Meeting Override",
            "Program Config: Deadline Mode",
            "Global Config: Deadline Mode",
        ],
        "formula": """IF(
  LEN(TRIM({Deadline Mode — Meeting Override} & "")) > 0,
  {Deadline Mode — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Deadline Mode}) & "")) > 0,
    ARRAYJOIN({Program Config: Deadline Mode}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Deadline Mode}) & "")) > 0,
      ARRAYJOIN({Global Config: Deadline Mode}),
      "Later of Both"
    )
  )
)""",
    },
    {
        "name": "Effective Recording Makeup Enabled?",
        "order": "C7",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Makeup Enabled — Meeting Override",
            "Program Config: Makeup Enabled",
            "Global Config: Makeup Enabled",
        ],
        "formula": """IF(
  {Makeup Enabled — Meeting Override} = "Yes", TRUE(),
  IF(
    {Makeup Enabled — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Makeup Enabled} = "Yes", TRUE(),
      IF(
        {Program Config: Makeup Enabled} = "No", FALSE(),
        IF(
          {Global Config: Makeup Enabled} = "Yes", TRUE(),
          IF(
            {Global Config: Makeup Enabled} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)""",
    },
    {
        "name": "Effective Recording Makeup Window Days",
        "order": "C8",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Makeup Window Days — Meeting Override",
            "Program Config: Makeup Window Days",
            "Global Config: Makeup Window Days",
        ],
        "formula": """IF(
  {Makeup Window Days — Meeting Override} != BLANK(),
  {Makeup Window Days — Meeting Override},
  IF(
    {Program Config: Makeup Window Days} != BLANK(),
    {Program Config: Makeup Window Days},
    IF(
      {Global Config: Makeup Window Days} != BLANK(),
      {Global Config: Makeup Window Days},
      7
    )
  )
)""",
    },
    {
        "name": "Effective Recording Quiz Requires Coach Approval?",
        "order": "C9",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Coach Approval Required — Meeting Override",
            "Program Config: Coach Approval Required",
            "Global Config: Coach Approval Required",
        ],
        "formula": """IF(
  {Coach Approval Required — Meeting Override} = "Yes", TRUE(),
  IF(
    {Coach Approval Required — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Coach Approval Required} = "Yes", TRUE(),
      IF(
        {Program Config: Coach Approval Required} = "No", FALSE(),
        IF(
          {Global Config: Coach Approval Required} = "Yes", TRUE(),
          IF(
            {Global Config: Coach Approval Required} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)""",
    },
    {
        "name": "Effective Recording XP Percentage",
        "order": "C10",
        "result": {"type": "number", "options": {"precision": 0}},
        "deps": [
            "Recording XP Percentage — Meeting Override",
            "Program Config: Recording XP %",
            "Global Config: Recording XP %",
        ],
        "formula": """IF(
  {Recording XP Percentage — Meeting Override} != BLANK(),
  {Recording XP Percentage — Meeting Override},
  IF(
    {Program Config: Recording XP %} != BLANK(),
    {Program Config: Recording XP %},
    IF(
      {Global Config: Recording XP %} != BLANK(),
      {Global Config: Recording XP %},
      50
    )
  )
)""",
    },
    {
        "name": "Calculated Recording Quiz Deadline",
        "order": "C11",
        "result": {
            "type": "date",
            "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}},
        },
        "deps": [
            "Recording Available At",
            "Attendance Method",
            "Effective Recording Deadline Mode",
            "Effective Recording Makeup Window Days",
            "Week End Date",
        ],
        "formula": """IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({Effective Recording Deadline Mode} = BLANK(), "Later of Both", {Effective Recording Deadline Mode}),
    "Days After Recording Available",
      DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
    "End of Program Week",
      IF({Week End Date} = BLANK(), BLANK(), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
    "Earlier of Both",
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') <= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      ),
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') >= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      )
  )
)""",
    },
]


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:3000]}
        return e.code, parsed


def get_tables(token: str) -> dict[str, dict]:
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    if status != 200:
        raise SystemExit(f"Cannot read PROD tables: {status} {body}")
    return {t["name"]: t for t in body["tables"]}


def fields_map(table: dict) -> dict[str, dict]:
    return {f["name"]: f for f in table.get("fields") or []}


def rewrite_formula_to_ids(formula: str, fmap: dict[str, dict]) -> tuple[str, list[str]]:
    """Replace {Field Name} with {fldXXX} using longest names first. Return (formula, missing)."""
    names = sorted(fmap.keys(), key=len, reverse=True)
    missing: list[str] = []
    out = formula
    # Find all {Name} references that look like field refs (not functions)
    refs = re.findall(r"\{([^}]+)\}", formula)
    for ref in refs:
        if ref not in fmap:
            # might already be an id
            if not ref.startswith("fld"):
                missing.append(ref)
    missing = sorted(set(missing))
    for name in names:
        out = out.replace("{" + name + "}", "{" + fmap[name]["id"] + "}")
    return out, missing


def create_field(token: str, table_id: str, body: dict) -> tuple[int, object]:
    return api(
        "POST",
        f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{table_id}/fields",
        token,
        body,
    )


def main() -> None:
    token = load_token()
    report: dict = {
        "base_id": PROD,
        "automations": "not enabled (no enable API calls)",
        "115": "not installed / not touched",
        "approved_preconflict_pair_tags": "not created (deferred)",
        "za_deadline_lookup": "not created (deferred)",
        "created": [],
        "skipped_existing": [],
        "formulas_installed": [],
        "manual_required": [],
        "blocked": [],
        "steps": [],
    }

    tables = get_tables(token)
    zm = tables["Zoom Meetings"]
    weeks = tables["Weeks"]
    za = tables.get("Zoom Attendance")
    zm_id = zm["id"]
    fmap = fields_map(zm)
    weeks_fmap = fields_map(weeks)

    # Confirm link names not renamed
    if "Global Config" not in fmap or "Program Config" not in fmap:
        report["blocked"].append("Expected link fields Global Config / Program Config missing")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise SystemExit("STOP: Global Config / Program Config links missing — do not invent names")
    if "Config (Global Scope)" in fmap or "Config (Program Scope)" in fmap:
        report["steps"].append(
            "Note: legacy Config (Global/Program Scope) names also present — leaving untouched"
        )

    # --- 1) Attendance Method ---
    if "Attendance Method" in fmap:
        report["skipped_existing"].append(
            {
                "name": "Attendance Method",
                "id": fmap["Attendance Method"]["id"],
                "type": fmap["Attendance Method"]["type"],
            }
        )
    else:
        # Match DEV choices from ZA if available for colors; exact names required
        body = {
            "name": "Attendance Method",
            "type": "singleSelect",
            "description": "C-025 Stage 17 — meeting attendance method for recording deadline formula",
            "options": {
                "choices": [
                    {"name": "Live", "color": "blueLight2"},
                    {"name": "Recording Quiz", "color": "cyanLight2"},
                ]
            },
        }
        status, resp = create_field(token, zm_id, body)
        report["steps"].append({"create_Attendance_Method": {"status": status, "resp": resp}})
        if status != 200:
            report["blocked"].append(f"Attendance Method create failed: {status}")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Attendance Method create failed")
        report["created"].append(
            {"name": "Attendance Method", "id": resp.get("id"), "type": "singleSelect"}
        )
        time.sleep(0.4)
        tables = get_tables(token)
        zm = tables["Zoom Meetings"]
        fmap = fields_map(zm)

    # Validate choices
    am = fmap["Attendance Method"]
    choices = [c.get("name") for c in ((am.get("options") or {}).get("choices") or [])]
    if set(choices) != {"Live", "Recording Quiz"}:
        # If extras exist, OK as long as required present; if required missing, stop
        if "Live" not in choices or "Recording Quiz" not in choices:
            report["blocked"].append(f"Attendance Method choices incomplete: {choices}")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Attendance Method choices incorrect")

    # --- 2) Week End Date lookup ---
    if "Week End Date" in fmap:
        f = fmap["Week End Date"]
        if f["type"] != "multipleLookupValues":
            report["blocked"].append(
                f"Week End Date exists as type={f['type']} — must be Lookup; do not substitute"
            )
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Week End Date wrong type")
        report["skipped_existing"].append({"name": "Week End Date", "id": f["id"], "type": f["type"]})
    else:
        if "Week" not in fmap:
            report["blocked"].append("Week link field missing — cannot create Week End Date lookup")
            report["manual_required"].append(
                {
                    "field": "Week End Date",
                    "reason": "Week link missing",
                    "mike_steps": [
                        "Open Zoom Meetings",
                        "Ensure link field Week → Weeks exists",
                        "Add Lookup Week End Date: link Week, source End Date",
                    ],
                }
            )
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Week missing")
        if "End Date" not in weeks_fmap:
            report["blocked"].append("Weeks.End Date missing")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Weeks.End Date missing")

        week_link_id = fmap["Week"]["id"]
        end_date_id = weeks_fmap["End Date"]["id"]
        body = {
            "name": "Week End Date",
            "type": "multipleLookupValues",
            "description": "C-025 — Lookup Week → Weeks.End Date for Calculated Recording Quiz Deadline",
            "options": {
                "recordLinkFieldId": week_link_id,
                "fieldIdInLinkedTable": end_date_id,
            },
        }
        status, resp = create_field(token, zm_id, body)
        report["steps"].append({"create_Week_End_Date": {"status": status, "resp": resp}})
        if status != 200:
            report["manual_required"].append(
                {
                    "field": "Week End Date",
                    "type": "Lookup",
                    "reason": f"Meta API create failed status={status}",
                    "api_response": resp,
                    "mike_steps": [
                        "Open table Zoom Meetings in PROD",
                        "Click + to add a field",
                        "Name: Week End Date",
                        "Type: Lookup",
                        "Linked-record field: Week",
                        "Field to look up / Source field: End Date (from Weeks)",
                        "Save",
                        "Do not create a formula or date field instead",
                        "Then re-run Stage 17 Effective/deadline formula creation",
                    ],
                }
            )
            report["blocked"].append("Week End Date lookup create failed via API — manual required")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(report, indent=2))
            raise SystemExit("STOP: Week End Date lookup requires manual setup")

        # Validate type
        if resp.get("type") != "multipleLookupValues":
            report["blocked"].append(f"Week End Date created as unexpected type={resp.get('type')}")
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            raise SystemExit("STOP: Week End Date not a lookup")

        report["created"].append(
            {
                "name": "Week End Date",
                "id": resp.get("id"),
                "type": "multipleLookupValues",
                "recordLinkFieldId": week_link_id,
                "fieldIdInLinkedTable": end_date_id,
            }
        )
        time.sleep(0.4)
        tables = get_tables(token)
        zm = tables["Zoom Meetings"]
        fmap = fields_map(zm)

    # Confirm Week End Date wiring
    wed = fmap["Week End Date"]
    wed_opts = wed.get("options") or {}
    if wed_opts.get("recordLinkFieldId") and wed_opts.get("recordLinkFieldId") != fmap["Week"]["id"]:
        report["blocked"].append("Week End Date linked to wrong link field")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise SystemExit("STOP: Week End Date wiring incorrect")

    # --- 3) Formulas C1–C11 ---
    for item in FORMULAS:
        name = item["name"]
        # refresh map each time so newly created Effectives are visible
        tables = get_tables(token)
        zm = tables["Zoom Meetings"]
        fmap = fields_map(zm)

        if name in fmap:
            existing = fmap[name]
            report["skipped_existing"].append(
                {
                    "name": name,
                    "id": existing["id"],
                    "type": existing["type"],
                    "isValid": (existing.get("options") or {}).get("isValid"),
                }
            )
            # If deadline already exists and valid, fine; continue
            if name == "Calculated Recording Quiz Deadline":
                if existing.get("type") != "formula" or (existing.get("options") or {}).get("isValid") is False:
                    report["blocked"].append(
                        f"{name} exists but invalid/wrong type — not overwriting"
                    )
                    break
            continue

        missing = [d for d in item["deps"] if d not in fmap]
        if missing:
            report["blocked"].append(
                {"formula": name, "missing_deps": missing, "stopped": True}
            )
            break

        # Circular dependency check: formula must not reference itself; deps must not include name
        if name in item["deps"]:
            report["blocked"].append({"formula": name, "reason": "self-dependency"})
            break

        formula_names = item["formula"]
        formula_ids, miss_refs = rewrite_formula_to_ids(formula_names, fmap)
        if miss_refs:
            report["blocked"].append(
                {"formula": name, "unresolved_refs": miss_refs, "stopped": True}
            )
            break

        # Meta API rejects formula `result` on create (INVALID_FIELD_TYPE_OPTIONS_FOR_CREATE).
        # Create with formula only; Airtable infers result type (matches DEV convert scripts).
        body = {
            "name": name,
            "type": "formula",
            "description": f"C-025 Stage 17 {item['order']} — from formula-build-order @ 8c06b07",
            "options": {
                "formula": formula_ids,
            },
        }
        status, resp = create_field(token, zm_id, body)
        entry = {
            "order": item["order"],
            "name": name,
            "status": status,
            "formula_field_name_version": formula_names,
            "formula_installed_prod_ids": formula_ids,
            "desired_result_type": item.get("result"),
            "response_id": resp.get("id") if isinstance(resp, dict) else None,
            "response_type": resp.get("type") if isinstance(resp, dict) else None,
            "isValid": ((resp.get("options") or {}).get("isValid") if isinstance(resp, dict) else None),
            "result": ((resp.get("options") or {}).get("result") if isinstance(resp, dict) else None),
            "error": resp if status != 200 else None,
        }

        if status != 200:
            # Retry once with field-name formula (some tokens accept names)
            body["options"]["formula"] = formula_names
            status2, resp2 = create_field(token, zm_id, body)
            entry["retry_status"] = status2
            entry["retry_response"] = resp2 if status2 != 200 else {
                "id": resp2.get("id"),
                "isValid": (resp2.get("options") or {}).get("isValid"),
                "result": (resp2.get("options") or {}).get("result"),
            }
            if status2 != 200:
                report["formulas_installed"].append(entry)
                report["blocked"].append(
                    {"formula": name, "create_failed": True, "status": status, "retry": status2}
                )
                break
            resp = resp2
            status = status2
            entry["status"] = status2
            entry["response_id"] = resp2.get("id")
            entry["isValid"] = (resp2.get("options") or {}).get("isValid")
            entry["result"] = (resp2.get("options") or {}).get("result")
            entry["formula_installed_prod_ids"] = formula_names
            entry["error"] = None

        # Re-read to validate
        time.sleep(0.35)
        tables = get_tables(token)
        fmap = fields_map(tables["Zoom Meetings"])
        created = fmap.get(name)
        if not created:
            report["blocked"].append({"formula": name, "reason": "created but not found on re-read"})
            report["formulas_installed"].append(entry)
            break
        is_valid = (created.get("options") or {}).get("isValid")
        entry["verified_isValid"] = is_valid
        entry["verified_id"] = created["id"]
        entry["verified_result"] = (created.get("options") or {}).get("result")
        report["formulas_installed"].append(entry)
        report["created"].append({"name": name, "id": created["id"], "type": "formula", "isValid": is_valid})

        if is_valid is False:
            report["blocked"].append(
                {"formula": name, "reason": "isValid=false after create — stopped"}
            )
            break

    # Final verify deadline + ensure ZA lookup not created
    tables = get_tables(token)
    fmap = fields_map(tables["Zoom Meetings"])
    za_fmap = fields_map(tables["Zoom Attendance"]) if tables.get("Zoom Attendance") else {}
    deadline = fmap.get("Calculated Recording Quiz Deadline")
    report["final"] = {
        "deadline": (
            {
                "exists": True,
                "id": deadline["id"],
                "type": deadline["type"],
                "isValid": (deadline.get("options") or {}).get("isValid"),
                "result": (deadline.get("options") or {}).get("result"),
                "formula_preview": ((deadline.get("options") or {}).get("formula") or "")[:400],
            }
            if deadline
            else {"exists": False}
        ),
        "week_end_date": (
            {
                "exists": True,
                "id": fmap["Week End Date"]["id"],
                "type": fmap["Week End Date"]["type"],
            }
            if "Week End Date" in fmap
            else {"exists": False}
        ),
        "attendance_method": (
            {
                "exists": True,
                "id": fmap["Attendance Method"]["id"],
                "choices": [
                    c.get("name")
                    for c in ((fmap["Attendance Method"].get("options") or {}).get("choices") or [])
                ],
            }
            if "Attendance Method" in fmap
            else {"exists": False}
        ),
        "za_deadline_lookup_exists": "Calculated Recording Quiz Deadline" in za_fmap,
        "approved_preconflict_exists": "Approved Preconflict Pair Tags" in fmap,
        "effective_present": sorted(n for n in fmap if n.startswith("Effective Recording")),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
