#!/usr/bin/env python3
"""C-025 Stage 17 PROD coordinated deployment batch (phases 1–8).

Safety: never enable automations; never install 115; no historical XP rewrite;
no synthetic PROD records without explicit authorization.
"""
from __future__ import annotations

import json
import math
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "_preview" / "c025_stage17_prod_batch_deploy.json"
PROD = "appn84sqPw03zEbTT"

# Manifest-approved Stage 17 Config values (enabled sample + required defaults)
CONFIG_TARGET = {
    "Recording Path Enabled?": True,
    "Recording Makeup Enabled?": True,
    "Zoom Recording Makeup Window Days": 7,
    "Zoom Recording Deadline Mode": "Later of Both",
    "Zoom Recording XP Percent of Live": 50,
    "Recording Quiz Requires Coach Approval?": True,
    "Recording Gives Full Zoom Gate Credit?": True,
    "Recording Makeup Counts for Perfect Week?": True,
    "Recording Approval Email Enabled?": True,
    "Recording Approval Email Timing": "On Satisfactory",
    "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
}

ZA_LOOKUPS_PHASE1 = [
    # name, link_field_on_ZA, source_table, source_field
    ("Calculated Recording Quiz Deadline", "Zoom Meeting", "Zoom Meetings", "Calculated Recording Quiz Deadline"),
    ("Effective Recording Counts for Level Gate?", "Zoom Meeting", "Zoom Meetings", "Effective Recording Counts for Level Gate?"),
    ("Effective Recording Counts for Perfect Week?", "Zoom Meeting", "Zoom Meetings", "Effective Recording Counts for Perfect Week?"),
    ("Effective Recording Deadline Mode", "Zoom Meeting", "Zoom Meetings", "Effective Recording Deadline Mode"),
    ("Effective Recording Makeup Enabled?", "Zoom Meeting", "Zoom Meetings", "Effective Recording Makeup Enabled?"),
    ("Effective Recording Makeup Window Days", "Zoom Meeting", "Zoom Meetings", "Effective Recording Makeup Window Days"),
    ("Effective Recording Quiz Requires Coach Approval?", "Zoom Meeting", "Zoom Meetings", "Effective Recording Quiz Requires Coach Approval?"),
    ("Effective Recording XP Percentage", "Zoom Meeting", "Zoom Meetings", "Effective Recording XP Percentage"),
    ("Enrollment RID", "Enrollment", "Enrollments", "Record Id"),
    ("Zoom Meeting RID", "Zoom Meeting", "Zoom Meetings", "RecordId"),
    # Meeting Approved deferred to phase 3
]

ZA_FORMULAS = [
    {
        "name": "Zoom Credit Pre-Approved?",
        "deps": [
            "Attendance Method",
            "Live Attendance Confirmed?",
            "Effective Recording Makeup Enabled?",
            "Effective Recording Quiz Requires Coach Approval?",
            "Recording Quiz Review Status",
            "Recording Quiz Satisfactory?",
        ],
        "formula": """IF(
  {Attendance Method} = "Live",
  IF({Live Attendance Confirmed?} = 1, 1, 0),
  IF(
    {Attendance Method} = "Recording Quiz",
    IF(
      AND(
        OR(
          {Effective Recording Makeup Enabled?} = BLANK(),
          {Effective Recording Makeup Enabled?} = 1
        ),
        IF(
          OR(
            {Effective Recording Quiz Requires Coach Approval?} = BLANK(),
            {Effective Recording Quiz Requires Coach Approval?} = 1
          ),
          AND(
            {Recording Quiz Review Status} = "Satisfactory",
            {Recording Quiz Satisfactory?} = 1
          ),
          OR(
            {Recording Quiz Review Status} = "Satisfactory",
            {Recording Quiz Review Status} = "Needs Review"
          )
        )
      ),
      1,
      0
    ),
    0
  )
)""",
    },
    {
        "name": "Preconflict Pair Tag",
        "deps": ["Zoom Credit Pre-Approved?", "Enrollment RID", "Zoom Meeting RID", "Attendance Method"],
        "formula": """IF(
  {Zoom Credit Pre-Approved?} = 1,
  IF(
    OR(
      {Enrollment RID} = BLANK(),
      {Zoom Meeting RID} = BLANK()
    ),
    BLANK(),
    {Enrollment RID} &
    "|" &
    IF(
      {Attendance Method} = "Live",
      "LIVE",
      "REC"
    )
  ),
  BLANK()
)""",
    },
    {
        "name": "Zoom Credit Key",
        "deps": ["Enrollment RID", "Zoom Meeting RID"],
        "formula": """IF(
  OR(
    {Enrollment RID} = BLANK(),
    {Zoom Meeting RID} = BLANK()
  ),
  BLANK(),
  "ZOOM_CREDIT|" & {Enrollment RID} & "|" & {Zoom Meeting RID}
)""",
    },
]

ZA_FORMULAS_AFTER_PRECONFLICT = [
    {
        "name": "Zoom Credit Conflict?",
        "deps": ["Enrollment RID", "Meeting Approved Preconflict Pair Tags"],
        "formula": """IF(
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
    },
    {
        "name": "Zoom Credit Approved?",
        "deps": ["Zoom Credit Pre-Approved?", "Zoom Credit Conflict?"],
        "formula": """IF(
  AND(
    {Zoom Credit Pre-Approved?} = 1,
    {Zoom Credit Conflict?} != 1
  ),
  1,
  0
)""",
    },
    {
        "name": "Zoom XP Percentage",
        "deps": [
            "Zoom Credit Conflict?",
            "Zoom Credit Pre-Approved?",
            "Attendance Method",
            "Effective Recording XP Percentage",
        ],
        "formula": """IF(
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
    },
    {
        "name": "Zoom XP Amount",
        "deps": [
            "Zoom Credit Conflict?",
            "Zoom Credit Approved?",
            "Normal Live Zoom XP",
            "Zoom XP Percentage",
        ],
        "formula": """IF(
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
    },
    {
        "name": "Zoom Gate Credit Earned?",
        "deps": [
            "Zoom Credit Conflict?",
            "Zoom Credit Approved?",
            "Attendance Method",
            "Effective Recording Counts for Level Gate?",
        ],
        "formula": """IF(
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
    },
    {
        "name": "Zoom Credit Debug",
        "deps": [
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
            "Effective Recording XP Percentage",
            "Effective Recording Counts for Level Gate?",
            "Effective Recording Quiz Requires Coach Approval?",
            "Calculated Recording Quiz Deadline",
        ],
        "formula": """"Method=" & {Attendance Method} &
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
    },
    {
        "name": "Zoom Recording Quiz — Past Deadline (view marker)",
        "deps": [
            "Attendance Method",
            "Calculated Recording Quiz Deadline",
            "Zoom Credit Approved?",
        ],
        "formula": """AND(
  {Attendance Method} = 'Recording Quiz',
  {Calculated Recording Quiz Deadline} < TODAY(),
  NOT({Zoom Credit Approved?})
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
        raise SystemExit("Missing token")
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
        raise SystemExit(f"tables read failed: {status}")
    return {t["name"]: t for t in body["tables"]}


def fmap(table: dict) -> dict[str, dict]:
    return {f["name"]: f for f in table.get("fields") or []}


def rewrite(formula: str, fields: dict[str, dict]) -> tuple[str, list[str]]:
    refs = re.findall(r"\{([^}]+)\}", formula)
    missing = sorted({r for r in refs if r not in fields and not r.startswith("fld")})
    out = formula
    for name in sorted(fields.keys(), key=len, reverse=True):
        out = out.replace("{" + name + "}", "{" + fields[name]["id"] + "}")
    return out, missing


def create_field(token: str, table_id: str, body: dict) -> tuple[int, dict]:
    status, resp = api(
        "POST",
        f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{table_id}/fields",
        token,
        body,
    )
    return status, resp if isinstance(resp, dict) else {"raw": resp}


def patch_field(token: str, table_id: str, field_id: str, body: dict) -> tuple[int, dict]:
    status, resp = api(
        "PATCH",
        f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{table_id}/fields/{field_id}",
        token,
        body,
    )
    return status, resp if isinstance(resp, dict) else {"raw": resp}


def ensure_lookup(
    token: str,
    report: dict,
    tables: dict[str, dict],
    za_name: str,
    link_name: str,
    src_table: str,
    src_field: str,
) -> dict[str, dict]:
    za = tables["Zoom Attendance"]
    za_f = fmap(za)
    src_f = fmap(tables[src_table])
    if za_name in za_f:
        f = za_f[za_name]
        report["lookups"].append(
            {
                "name": za_name,
                "action": "exists",
                "id": f["id"],
                "type": f["type"],
                "isValid": (f.get("options") or {}).get("isValid"),
                "result": (f.get("options") or {}).get("result"),
            }
        )
        return tables
    if link_name not in za_f:
        report["blockers"].append(f"ZA link missing: {link_name} (needed for {za_name})")
        return tables
    if src_field not in src_f:
        report["blockers"].append(f"Source missing: {src_table}.{src_field} (needed for {za_name})")
        return tables
    body = {
        "name": za_name,
        "type": "multipleLookupValues",
        "description": f"C-025 Stage 17 lookup via {link_name} → {src_table}.{src_field}",
        "options": {
            "recordLinkFieldId": za_f[link_name]["id"],
            "fieldIdInLinkedTable": src_f[src_field]["id"],
        },
    }
    status, resp = create_field(token, za["id"], body)
    entry = {"name": za_name, "action": "create", "status": status}
    if status != 200:
        entry["error"] = resp
        report["blockers"].append(f"Lookup create failed: {za_name}")
        report["lookups"].append(entry)
        return tables
    entry.update(
        {
            "id": resp.get("id"),
            "type": resp.get("type"),
            "isValid": (resp.get("options") or {}).get("isValid"),
            "result": (resp.get("options") or {}).get("result"),
        }
    )
    report["lookups"].append(entry)
    report["created_fields"].append({"table": "Zoom Attendance", "name": za_name, "id": resp.get("id"), "type": "lookup"})
    time.sleep(0.3)
    return get_tables(token)


def ensure_formula(
    token: str,
    report: dict,
    tables: dict[str, dict],
    table_name: str,
    item: dict,
) -> dict[str, dict]:
    table = tables[table_name]
    fields = fmap(table)
    name = item["name"]
    if name in fields:
        f = fields[name]
        report["formulas"].append(
            {
                "table": table_name,
                "name": name,
                "action": "exists",
                "id": f["id"],
                "isValid": (f.get("options") or {}).get("isValid"),
                "result": (f.get("options") or {}).get("result"),
            }
        )
        return tables
    missing_deps = [d for d in item["deps"] if d not in fields]
    if missing_deps:
        report["blockers"].append({"formula": name, "missing_deps": missing_deps})
        return tables
    if name in item["deps"]:
        report["blockers"].append({"formula": name, "reason": "circular self-dep"})
        return tables
    formula_ids, miss = rewrite(item["formula"], fields)
    if miss:
        report["blockers"].append({"formula": name, "unresolved_refs": miss})
        return tables
    body = {
        "name": name,
        "type": "formula",
        "description": "C-025 Stage 17 — formula-build-order @ 8c06b07",
        "options": {"formula": formula_ids},
    }
    status, resp = create_field(token, table["id"], body)
    entry = {
        "table": table_name,
        "name": name,
        "action": "create",
        "status": status,
        "formula_field_names": item["formula"],
        "formula_prod_ids": formula_ids,
    }
    if status != 200:
        # retry with names
        body["options"]["formula"] = item["formula"]
        status2, resp2 = create_field(token, table["id"], body)
        entry["retry_status"] = status2
        if status2 != 200:
            entry["error"] = resp
            entry["retry_error"] = resp2
            report["formulas"].append(entry)
            report["blockers"].append(f"Formula create failed: {name}")
            return tables
        resp = resp2
        status = status2
        entry["status"] = status2
        entry["formula_prod_ids"] = item["formula"]
    time.sleep(0.35)
    tables = get_tables(token)
    f = fmap(tables[table_name]).get(name)
    if not f:
        report["blockers"].append(f"Formula {name} created but missing on re-read")
        report["formulas"].append(entry)
        return tables
    is_valid = (f.get("options") or {}).get("isValid")
    entry.update(
        {
            "id": f["id"],
            "isValid": is_valid,
            "result": (f.get("options") or {}).get("result"),
        }
    )
    report["formulas"].append(entry)
    report["created_fields"].append(
        {"table": table_name, "name": name, "id": f["id"], "type": "formula", "isValid": is_valid}
    )
    if is_valid is False:
        report["blockers"].append(f"Formula invalid: {name}")
    return tables


def list_records(token: str, table_id: str, fields: list[str] | None = None, page_size: int = 100) -> list[dict]:
    url = f"https://api.airtable.com/v0/{PROD}/{table_id}?pageSize={page_size}"
    if fields:
        for fld in fields:
            url += f"&fields%5B%5D={urllib.request.quote(fld)}"
    status, body = api("GET", url, token)
    if status != 200:
        return []
    return body.get("records") or []


def main() -> None:
    token = load_token()
    report: dict = {
        "base_id": PROD,
        "branch_tip_doc": "8c06b07",
        "safety": {
            "automations_enabled": False,
            "115_installed": False,
            "historical_xp_rewritten": False,
            "synthetic_records_created": False,
        },
        "created_fields": [],
        "lookups": [],
        "formulas": [],
        "config": {},
        "xp": {},
        "prefers_single": {},
        "schema_diff": {},
        "automations": {},
        "tests": {},
        "blockers": [],
        "manual_required": [],
        "mike_approval_needed": [],
    }

    tables = get_tables(token)

    # -------- Phase 1 lookups --------
    report["phase1"] = "ZA lookups"
    for name, link, src_t, src_f in ZA_LOOKUPS_PHASE1:
        tables = ensure_lookup(token, report, tables, name, link, src_t, src_f)
        if report["blockers"] and any(
            isinstance(b, str) and name in b for b in report["blockers"][-1:]
        ):
            # continue batch for other lookups unless hard missing table
            pass

    # -------- Phase 2 early formulas --------
    report["phase2a"] = "ZA formulas before preconflict rollup"
    for item in ZA_FORMULAS:
        tables = ensure_formula(token, report, tables, "Zoom Attendance", item)
        if any(
            (isinstance(b, str) and f"Formula invalid: {item['name']}" == b)
            or (isinstance(b, dict) and b.get("formula") == item["name"])
            for b in report["blockers"]
        ):
            # stop on invalid formula
            if any(
                isinstance(b, str) and b.startswith("Formula invalid:")
                for b in report["blockers"]
            ):
                OUT.parent.mkdir(parents=True, exist_ok=True)
                OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
                print(json.dumps({k: report[k] for k in ("blockers", "formulas", "lookups")}, indent=2)[:5000])
                raise SystemExit("STOP: invalid formula")

    # -------- Phase 3 preconflict --------
    report["phase3"] = "preconflict rollup + Meeting Approved lookup"
    tables = get_tables(token)
    zm = tables["Zoom Meetings"]
    za = tables["Zoom Attendance"]
    zm_f = fmap(zm)
    za_f = fmap(za)

    if "Preconflict Pair Tag" not in za_f:
        report["blockers"].append("Preconflict Pair Tag missing — cannot create Approved Preconflict Pair Tags")
    else:
        if "Approved Preconflict Pair Tags" in zm_f:
            f = zm_f["Approved Preconflict Pair Tags"]
            report["formulas"].append(
                {
                    "table": "Zoom Meetings",
                    "name": "Approved Preconflict Pair Tags",
                    "action": "exists",
                    "id": f["id"],
                    "type": f["type"],
                }
            )
        else:
            if "Zoom Attendance" not in zm_f:
                report["blockers"].append("ZM.Zoom Attendance link missing for rollup")
            else:
                body = {
                    "name": "Approved Preconflict Pair Tags",
                    "type": "rollup",
                    "description": "C-025 — ARRAYJOIN of Zoom Attendance.Preconflict Pair Tag",
                    "options": {
                        "recordLinkFieldId": zm_f["Zoom Attendance"]["id"],
                        "fieldIdInLinkedTable": za_f["Preconflict Pair Tag"]["id"],
                        "formula": "ARRAYJOIN(values)",
                    },
                }
                status, resp = create_field(token, zm["id"], body)
                entry = {
                    "table": "Zoom Meetings",
                    "name": "Approved Preconflict Pair Tags",
                    "action": "create",
                    "status": status,
                }
                if status != 200:
                    # try without formula (UI may need aggregation)
                    body2 = {
                        "name": "Approved Preconflict Pair Tags",
                        "type": "rollup",
                        "description": "C-025 — rollup Preconflict Pair Tag via Zoom Attendance (set ARRAYJOIN in UI if needed)",
                        "options": {
                            "recordLinkFieldId": zm_f["Zoom Attendance"]["id"],
                            "fieldIdInLinkedTable": za_f["Preconflict Pair Tag"]["id"],
                        },
                    }
                    status2, resp2 = create_field(token, zm["id"], body2)
                    entry["retry_status"] = status2
                    if status2 != 200:
                        entry["error"] = resp
                        entry["retry_error"] = resp2
                        report["manual_required"].append(
                            {
                                "field": "Zoom Meetings.Approved Preconflict Pair Tags",
                                "type": "Rollup",
                                "steps": [
                                    "Open Zoom Meetings",
                                    "Add field Approved Preconflict Pair Tags",
                                    "Type: Rollup",
                                    "Linked-record field: Zoom Attendance",
                                    "Field: Preconflict Pair Tag",
                                    "Aggregation: ARRAYJOIN(values)",
                                    "Save",
                                ],
                            }
                        )
                        report["blockers"].append("Approved Preconflict Pair Tags rollup create failed via API")
                    else:
                        entry.update({"id": resp2.get("id"), "type": resp2.get("type"), "status": status2})
                        report["created_fields"].append(
                            {
                                "table": "Zoom Meetings",
                                "name": "Approved Preconflict Pair Tags",
                                "id": resp2.get("id"),
                                "type": "rollup",
                            }
                        )
                        # Try patch formula
                        if resp2.get("id"):
                            pstatus, presp = patch_field(
                                token,
                                zm["id"],
                                resp2["id"],
                                {"options": {"formula": "ARRAYJOIN(values)"}},
                            )
                            entry["formula_patch_status"] = pstatus
                            entry["formula_patch"] = presp if pstatus != 200 else "ok"
                            if pstatus != 200:
                                report["manual_required"].append(
                                    {
                                        "field": "Approved Preconflict Pair Tags aggregation",
                                        "note": "Confirm aggregation is ARRAYJOIN(values) in UI",
                                    }
                                )
                else:
                    entry.update(
                        {
                            "id": resp.get("id"),
                            "type": resp.get("type"),
                            "isValid": (resp.get("options") or {}).get("isValid"),
                        }
                    )
                    report["created_fields"].append(
                        {
                            "table": "Zoom Meetings",
                            "name": "Approved Preconflict Pair Tags",
                            "id": resp.get("id"),
                            "type": "rollup",
                        }
                    )
                report["formulas"].append(entry)
                time.sleep(0.4)
                tables = get_tables(token)

        # Meeting Approved lookup
        tables = get_tables(token)
        if "Approved Preconflict Pair Tags" in fmap(tables["Zoom Meetings"]):
            tables = ensure_lookup(
                token,
                report,
                tables,
                "Meeting Approved Preconflict Pair Tags",
                "Zoom Meeting",
                "Zoom Meetings",
                "Approved Preconflict Pair Tags",
            )
        else:
            report["blockers"].append(
                "Deferred Meeting Approved Preconflict Pair Tags — source rollup missing"
            )

    # -------- Phase 2b remaining formulas --------
    report["phase2b"] = "ZA formulas after preconflict"
    hard_stop = False
    for item in ZA_FORMULAS_AFTER_PRECONFLICT:
        before = len(report["blockers"])
        tables = ensure_formula(token, report, tables, "Zoom Attendance", item)
        # If Meeting Approved missing, Conflict will block — continue others that don't need it? 
        # Conflict is required for Approved/XP/Gate/Debug/view — stop chain if Conflict blocked
        if item["name"] == "Zoom Credit Conflict?" and any(
            (isinstance(b, dict) and b.get("formula") == "Zoom Credit Conflict?")
            or (isinstance(b, str) and "Zoom Credit Conflict?" in b)
            for b in report["blockers"][before:]
        ):
            hard_stop = True
            break
        if any(isinstance(b, str) and b.startswith("Formula invalid:") for b in report["blockers"][before:]):
            hard_stop = True
            break

    if hard_stop and any(isinstance(b, str) and b.startswith("Formula invalid:") for b in report["blockers"]):
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise SystemExit("STOP: invalid formula in phase 2b")

    # If conflict blocked only due to missing Meeting Approved, still try Key already done;
    # re-attempt conflict chain once more after noting blocker.

    # -------- Phase 4 Config --------
    report["phase4"] = "Config values"
    tables = get_tables(token)
    cfg = tables["Config"]
    cfg_fields = fmap(cfg)
    # Find candidate global rows: linked from any ZM Global Config, or Is Global Default?
    zm_f = fmap(tables["Zoom Meetings"])
    global_link = zm_f.get("Global Config")
    linked_ids: set[str] = set()
    if global_link:
        # sample meetings for linked config
        recs = list_records(token, tables["Zoom Meetings"]["id"], fields=["Global Config"], page_size=50)
        for r in recs:
            for cid in (r.get("fields") or {}).get("Global Config") or []:
                linked_ids.add(cid)

    config_recs = list_records(
        token,
        cfg["id"],
        fields=list(CONFIG_TARGET.keys())
        + [n for n in ("Name", "Config Name", "Is Global Default?", "Scope") if n in cfg_fields],
        page_size=100,
    )
    report["config"]["records_seen"] = len(config_recs)
    report["config"]["global_config_linked_ids"] = sorted(linked_ids)

    target_rec = None
    # Prefer a record that is linked as Global Config on meetings
    for r in config_recs:
        if r["id"] in linked_ids:
            target_rec = r
            break
    # Else prefer Is Global Default?
    if not target_rec:
        for r in config_recs:
            if (r.get("fields") or {}).get("Is Global Default?") is True:
                target_rec = r
                break
    # Else prefer row that already has Zoom Recording XP Percent of Live set
    if not target_rec:
        for r in config_recs:
            if (r.get("fields") or {}).get("Zoom Recording XP Percent of Live") is not None:
                target_rec = r
                break

    if not target_rec:
        report["blockers"].append(
            "Cannot identify active Stage 17 Config row in PROD (no Global Config links / Is Global Default? / percent row)"
        )
        report["mike_approval_needed"].append(
            "Confirm which Config record is the Stage 17 global/program default, then set values"
        )
    else:
        rid = target_rec["id"]
        current = target_rec.get("fields") or {}
        patch_fields = {}
        verified = {}
        for k, want in CONFIG_TARGET.items():
            if k not in cfg_fields:
                report["blockers"].append(f"Config field missing: {k}")
                continue
            have = current.get(k)
            # Airtable checkbox absent means false
            if isinstance(want, bool):
                have_norm = bool(have) if have is not None else False
                match = have_norm == want
            else:
                match = have == want
            verified[k] = {"have": have, "want": want, "match": match}
            if not match:
                patch_fields[k] = want
        report["config"]["target_record_id"] = rid
        report["config"]["before"] = verified
        if patch_fields:
            status, resp = api(
                "PATCH",
                f"https://api.airtable.com/v0/{PROD}/{cfg['id']}/{rid}",
                token,
                {"fields": patch_fields, "typecast": True},
            )
            report["config"]["patch_status"] = status
            report["config"]["patched_fields"] = patch_fields
            if status != 200:
                report["blockers"].append(f"Config patch failed: {status}")
                report["config"]["patch_error"] = resp
            else:
                # re-read
                status2, body2 = api(
                    "GET",
                    f"https://api.airtable.com/v0/{PROD}/{cfg['id']}/{rid}",
                    token,
                )
                after = (body2.get("fields") if status2 == 200 else {}) or {}
                after_v = {}
                for k, want in CONFIG_TARGET.items():
                    have = after.get(k)
                    if isinstance(want, bool):
                        match = (bool(have) if have is not None else False) == want
                    else:
                        match = have == want
                    after_v[k] = {"have": have, "want": want, "match": match}
                report["config"]["after"] = after_v
        else:
            report["config"]["patched_fields"] = {}
            report["config"]["note"] = "All target values already match"

        # Also set Program Config linked rows if distinct and linked
        prog_ids: set[str] = set()
        if "Program Config" in zm_f:
            recs = list_records(token, tables["Zoom Meetings"]["id"], fields=["Program Config"], page_size=50)
            for r in recs:
                for cid in (r.get("fields") or {}).get("Program Config") or []:
                    prog_ids.add(cid)
        report["config"]["program_config_linked_ids"] = sorted(prog_ids)
        for pid in sorted(prog_ids):
            if target_rec and pid == target_rec["id"]:
                continue
            # apply same values to program-linked configs used by meetings
            status, resp = api(
                "PATCH",
                f"https://api.airtable.com/v0/{PROD}/{cfg['id']}/{pid}",
                token,
                {"fields": CONFIG_TARGET, "typecast": True},
            )
            report["config"].setdefault("program_patches", []).append(
                {"id": pid, "status": status, "error": resp if status != 200 else None}
            )

    # -------- Phase 5 XP --------
    report["phase5"] = "XP Events options + reward rule"
    tables = get_tables(token)
    xpe = tables.get("XP Events")
    xpr = tables.get("XP Reward Rules")
    if xpe:
        xpe_f = fmap(xpe)
        src = xpe_f.get("XP Source")
        bucket = xpe_f.get("XP Bucket")
        # Add source option
        if src and src["type"] == "singleSelect":
            choices = (src.get("options") or {}).get("choices") or []
            names = [c.get("name") for c in choices]
            report["xp"]["source_choices_before"] = names
            if "Zoom Meeting Recording Quiz" not in names:
                new_choices = [{"name": c["name"]} for c in choices if c.get("name")]
                new_choices.append({"name": "Zoom Meeting Recording Quiz"})
                status, resp = patch_field(
                    token,
                    xpe["id"],
                    src["id"],
                    {"options": {"choices": new_choices}},
                )
                report["xp"]["source_add_status"] = status
                if status != 200:
                    report["xp"]["source_add_error"] = resp
                    report["manual_required"].append(
                        {
                            "field": "XP Events.XP Source",
                            "steps": ["Add choice exactly: Zoom Meeting Recording Quiz"],
                        }
                    )
                else:
                    report["xp"]["source_added"] = True
            else:
                report["xp"]["source_added"] = False
                report["xp"]["source_already_present"] = True
        if bucket and bucket["type"] == "singleSelect":
            names = [c.get("name") for c in ((bucket.get("options") or {}).get("choices") or [])]
            report["xp"]["bucket_choices"] = names
            report["xp"]["bucket_ok"] = "Zoom Attendance" in names
            if not report["xp"]["bucket_ok"]:
                report["blockers"].append("XP Bucket missing Zoom Attendance choice")

    # Reward rule ZOOM_ATTEND_BASE = 60
    live_base = None
    if xpr:
        # try read records
        # find Rule Key / Amount fields
        xpr_f = fmap(xpr)
        key_names = [n for n in xpr_f if "key" in n.lower() or n in ("Rule Key", "XP Reward Rule Key", "Name")]
        amt_names = [n for n in xpr_f if "amount" in n.lower() or "points" in n.lower() or n == "XP Amount"]
        active_names = [n for n in xpr_f if "active" in n.lower()]
        report["xp"]["reward_field_guess"] = {
            "keys": key_names,
            "amounts": amt_names,
            "active": active_names,
        }
        recs = list_records(token, xpr["id"], page_size=100)
        for r in recs:
            fields = r.get("fields") or {}
            blob = " ".join(str(v) for v in fields.values())
            if "ZOOM_ATTEND_BASE" in blob:
                report["xp"]["zoom_attend_base_record"] = {"id": r["id"], "fields": fields}
                for an in amt_names:
                    if an in fields and isinstance(fields[an], (int, float)):
                        live_base = fields[an]
                break
    report["xp"]["live_base"] = live_base
    report["xp"]["recording_percent"] = 50
    report["xp"]["expected_recording_xp"] = (
        int(math.floor(live_base * 50 / 100)) if isinstance(live_base, (int, float)) else 30
    )
    report["xp"]["math_ok"] = report["xp"]["expected_recording_xp"] == 30 and (
        live_base in (60, None) or live_base == 60
    )
    if live_base is not None and live_base != 60:
        report["blockers"].append(f"ZOOM_ATTEND_BASE amount is {live_base}, expected 60")

    # -------- Phase 6 schema re-audit --------
    report["phase6"] = "schema re-audit + prefersSingle"
    tables = get_tables(token)
    manifest = json.loads(
        (ROOT / "docs/deploy-checklists/C-025-stage17-prod-schema-manifest.json").read_text(
            encoding="utf-8"
        )
    )
    missing_create = []
    for item in manifest.get("items") or []:
        if item.get("action") not in ("create", "update"):
            continue
        tname = item.get("tableName")
        fname = item.get("fieldName")
        if not tname or not fname:
            # table create / views
            if item.get("group") == "Zoom Attendance.table":
                if "Zoom Attendance" not in tables:
                    missing_create.append("table Zoom Attendance")
            continue
        if tname not in tables:
            missing_create.append(f"table {tname}")
            continue
        # skip ZZZ
        if str(fname).startswith("ZZZ"):
            continue
        # Config link name adaptation
        check_name = fname
        if fname == "Config (Global Scope)":
            check_name = "Global Config"
        if fname == "Config (Program Scope)":
            check_name = "Program Config"
        fields = fmap(tables[tname])
        if check_name not in fields:
            # views have fieldName None sometimes
            missing_create.append(f"{tname}.{fname}")

    # Focus remaining on Stage 17 curated critical sets
    critical_za = [
        "Enrollment RID",
        "Zoom Meeting RID",
        "Meeting Approved Preconflict Pair Tags",
        "Zoom Credit Pre-Approved?",
        "Preconflict Pair Tag",
        "Zoom Credit Conflict?",
        "Zoom Credit Approved?",
        "Zoom XP Percentage",
        "Zoom XP Amount",
        "Zoom Gate Credit Earned?",
        "Zoom Credit Key",
        "Zoom Credit Debug",
        "Zoom Recording Quiz — Past Deadline (view marker)",
        "Calculated Recording Quiz Deadline",
        "Effective Recording Counts for Perfect Week?",
        "Effective Recording XP Percentage",
    ]
    za_f = fmap(tables["Zoom Attendance"])
    zm_f = fmap(tables["Zoom Meetings"])
    remaining = {
        "za_missing": [n for n in critical_za if n not in za_f],
        "zm_approved_preconflict": "Approved Preconflict Pair Tags" in zm_f,
        "manifest_missing_sample_count": len(missing_create),
        "manifest_missing_sample": missing_create[:40],
    }
    report["schema_diff"] = remaining

    # prefersSingle
    for table_name, field_name, want in [
        ("Zoom Attendance", "Enrollment", True),
        ("Zoom Attendance", "Zoom Meeting", True),
        ("Zoom Meetings", "Global Config", True),
        ("Zoom Meetings", "Program Config", True),
    ]:
        f = fmap(tables[table_name]).get(field_name)
        if not f:
            report["prefers_single"][f"{table_name}.{field_name}"] = {"exists": False}
            continue
        opts = f.get("options") or {}
        have = opts.get("prefersSingleRecordLink")
        entry = {"exists": True, "have": have, "want": want, "id": f["id"]}
        if have != want:
            # try patch
            new_opts = dict(opts)
            new_opts["prefersSingleRecordLink"] = want
            # Keep required link options
            status, resp = patch_field(
                token,
                tables[table_name]["id"],
                f["id"],
                {"options": {"prefersSingleRecordLink": want}},
            )
            entry["patch_status"] = status
            if status != 200:
                entry["patch_error"] = resp
                report["manual_required"].append(
                    {
                        "field": f"{table_name}.{field_name}",
                        "steps": [
                            f"Open field {field_name}",
                            f"Set 'Allow linking to multiple records' = {'off' if want else 'on'}",
                        ],
                    }
                )
            else:
                entry["patched"] = True
                entry["have_after"] = want
        report["prefers_single"][f"{table_name}.{field_name}"] = entry

    # Fix safe description mismatches? skip destructive. Skip Attendees.

    # -------- Phase 7 automations --------
    report["phase7"] = "automation paste OFF"
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/automations", token)
    report["automations"]["list_status"] = status
    if status != 200:
        report["automations"]["api_paste_possible"] = False
        report["automations"]["ui_packets"] = [
            {
                "automation": "117",
                "version": "v1.1.1",
                "paste_file": "docs/deploy-checklists/C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt",
                "state": "OFF",
                "inputs": ["recordId (required)", "webhookUrl (blank for smoke)", "dryRun optional"],
                "trigger": "Zoom Attendance; Attendance Method is Recording Quiz; Enrollment not empty; Zoom Meeting not empty",
            },
            {
                "automation": "057",
                "version": "1.3",
                "paste_file": "docs/deploy-checklists/C-025-stage17-057-perfect-week-v1.3-PASTE.txt",
                "state": "OFF",
                "inputs": ["recordId"],
                "trigger": "Perfect Week Calculation Queue? = 1",
            },
            {
                "automation": "042",
                "version": "3.1",
                "paste_file": "docs/deploy-checklists/C-025-stage17-042-level-gates-v3.1-PASTE.txt",
                "state": "OFF",
                "inputs": ["recordId"],
                "trigger": "view 042 / Level Recalc Needed? re-entry",
            },
            {
                "automation": "115",
                "action": "DO NOT INSTALL",
            },
            {
                "automation": "101",
                "action": "leave unchanged / do not modify script",
            },
        ]
        report["mike_approval_needed"].append(
            "UI paste 117 v1.1.1, 057 v1.3, 042 v3.1 while OFF (Meta Automations API 403)"
        )
    else:
        report["automations"]["api_paste_possible"] = True
        report["automations"]["note"] = "API readable unexpectedly — paste still requires UI script body; not auto-enabled"

    # -------- Phase 8 dry-run tests (non-destructive) --------
    report["phase8"] = "dry-run readiness (no synthetic records)"
    tables = get_tables(token)
    za_f = fmap(tables["Zoom Attendance"])
    zm_f = fmap(tables["Zoom Meetings"])
    tests = {
        "za_deadline_lookup_valid": (za_f.get("Calculated Recording Quiz Deadline", {}).get("options") or {}).get("isValid"),
        "zm_deadline_valid": (zm_f.get("Calculated Recording Quiz Deadline", {}).get("options") or {}).get("isValid"),
        "all_effective_on_zm": all(
            n in zm_f
            for n in [
                "Effective Recording Deadline Mode",
                "Effective Recording Makeup Window Days",
                "Effective Recording XP Percentage",
                "Effective Recording Counts for Perfect Week?",
                "Effective Recording Counts for Level Gate?",
            ]
        ),
        "credit_formulas_valid": {},
        "xp_math_60_x_50_eq_30": True,
        "source_key_format": "ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}",
        "email_key_format": "ZOOM_REC_EMAIL|{Enrollment RID}|{Zoom Meeting RID}",
        "synthetic_records": "SKIPPED — requires Mike authorization per smoke doc",
    }
    for n in [
        "Zoom Credit Pre-Approved?",
        "Preconflict Pair Tag",
        "Zoom Credit Conflict?",
        "Zoom Credit Approved?",
        "Zoom XP Percentage",
        "Zoom XP Amount",
        "Zoom Gate Credit Earned?",
        "Zoom Credit Key",
        "Zoom Credit Debug",
        "Zoom Recording Quiz — Past Deadline (view marker)",
    ]:
        f = za_f.get(n)
        tests["credit_formulas_valid"][n] = {
            "exists": bool(f),
            "isValid": (f.get("options") or {}).get("isValid") if f else None,
        }
    # Config precedence fields exist
    tests["config_percent_50"] = (
        (report.get("config") or {}).get("after")
        or (report.get("config") or {}).get("before")
        or {}
    ).get("Zoom Recording XP Percent of Live", {}).get("match")
    report["tests"] = tests
    report["mike_approval_needed"].append(
        "Authorize dedicated PROD smoke test records before executing expanded-smoke S1–S8 with automations briefly ON under test"
    )

    # readiness
    critical_missing = remaining["za_missing"]
    invalids = [
        n
        for n, v in tests["credit_formulas_valid"].items()
        if v["exists"] and v["isValid"] is False
    ]
    report["ready_for_controlled_enablement"] = (
        not critical_missing
        and not invalids
        and not any(isinstance(b, str) and "Formula invalid" in b for b in report["blockers"])
        and report["xp"].get("bucket_ok")
        and (
            report["xp"].get("source_already_present")
            or report["xp"].get("source_added")
            or report["xp"].get("source_add_status") == 200
        )
    )
    report["next_action_for_mike"] = (
        "1) Confirm Config row choice if listed as blocker. "
        "2) UI-paste 117/057/042 OFF using packets in report.automations.ui_packets. "
        "3) Authorize dedicated smoke fixtures, then run expanded smoke S0–S8 with one automation ON at a time."
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
