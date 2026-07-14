#!/usr/bin/env python3
"""C-025 DEV: Config fields + Config→Meeting linkage (overrides → rollups → Effective formulas).

DEV only. No XP/email/Make/PROD. No 117 paste. No C-027.
"""

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

tv = dotenv_values(HERE / ".env")
TOKEN = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
if not TOKEN:
    raise SystemExit("missing tools/.env token")
os.environ["AIRTABLE_TOKEN"] = TOKEN

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
DATA = f"https://api.airtable.com/v0/{DEV}"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

CFG_ID = "tblRB6sh77NxjS568"
ZM_ID = "tblWcSHEm8vNNIxyB"
ZA_ID = "tblfwbt6aCDCM5gUz"
PI_ID = "tblMfALZa4YYUy70P"  # Program Instance - Synced

# Active season + fixture meetings
CFG_2025 = "recq14M5hEv3TIGEj"
MEETINGS = ["rec3ToANr5pcs2SRG", "rech5YbJNUzBRY6LQ", "reczeUT0AJUWMmEOb"]

YES_NO = {
    "choices": [
        {"name": "Yes"},
        {"name": "No"},
    ]
}
DEADLINE_CHOICES = {
    "choices": [
        {"name": "Days After Recording Available"},
        {"name": "End of Program Week"},
        {"name": "Later of Both"},
        {"name": "Earlier of Both"},
    ]
}
TIMING_CHOICES = {"choices": [{"name": "On Satisfactory"}]}

# Exact names from C-025-config-linkage-design.md
CONFIG_FIELDS = [
    {
        "name": "Zoom Recording XP Percent of Live",
        "type": "number",
        "options": {"precision": 0},
        "default_value": 50,
        "fallback": 50,
        "purpose": "Recording XP as % of live base",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Gives Full Zoom Gate Credit?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,
        "fallback": True,
        "purpose": "Recording counts for level gate",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Makeup Counts for Perfect Week?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,
        "fallback": True,
        "purpose": "Recording counts for Perfect Week",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Quiz Requires Coach Approval?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,
        "fallback": True,
        "purpose": "Coach Satisfactory required for recording credit",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Makeup Enabled?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,
        "fallback": True,
        "purpose": "Master switch for recording makeup path",
        "scope": "program/global Config scalar",
        "note": "Design §2 #5 — approved for this apply (design proposed; Owner authorized C-025 apply)",
    },
    {
        "name": "Zoom Recording Makeup Window Days",
        "type": "number",
        "options": {"precision": 0},
        "default_value": 7,
        "fallback": 7,
        "purpose": "Makeup window days",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Zoom Recording Deadline Mode",
        "type": "singleSelect",
        "options": DEADLINE_CHOICES,
        "default_value": "Later of Both",
        "fallback": "Later of Both",
        "purpose": "Deadline mode",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Approval Email Enabled?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,  # catalog Default = Checked; formula fallback if unresolved = false
        "fallback": False,
        "purpose": "Parent email after Satisfactory",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Approval Email Timing",
        "type": "singleSelect",
        "options": TIMING_CHOICES,
        "default_value": "On Satisfactory",
        "fallback": "On Satisfactory",
        "purpose": "When to send approval email",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Approval Email Template Key",
        "type": "singleLineText",
        "options": {},
        "default_value": "ZOOM_RECORDING_APPROVED",
        "fallback": "",
        "purpose": "Make/email template key",
        "scope": "program/global Config scalar",
    },
    {
        "name": "Recording Path Enabled?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": True,
        "fallback": True,
        "purpose": "Config-only master path switch (no ZM Effective this slice)",
        "scope": "program/global Config scalar",
        "zm_effective": None,
    },
    {
        "name": "Program Instance",
        "type": "multipleRecordLinks",
        "options": {"linkedTableId": PI_ID},
        "default_value": None,
        "fallback": None,
        "purpose": "Optional program-scope declaration on Config row",
        "scope": "program Config meta",
    },
    {
        "name": "Is Global Default?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "default_value": None,  # set True only on one row
        "fallback": None,
        "purpose": "Marks Global Config tier-3 row",
        "scope": "global Config meta",
    },
]

# Setting map: Config field ↔ Override ↔ Rollup short label ↔ Effective ↔ fallback ↔ kind
SETTINGS = [
    {
        "key": "xp_pct",
        "config": "Zoom Recording XP Percent of Live",
        "override": "Recording XP Percentage — Meeting Override",
        "override_type": "number",
        "override_options": {"precision": 0},
        "rollup_label": "Recording XP %",
        "effective": "Effective Recording XP Percentage",
        "effective_id": "fldgBdBIDvjMELY3o",
        "kind": "number",
        "fallback": 50,
        "copy_from_effective": True,
    },
    {
        "key": "gate",
        "config": "Recording Gives Full Zoom Gate Credit?",
        "override": "Full Gate Credit — Meeting Override",
        "override_type": "singleSelect",
        "override_options": YES_NO,
        "rollup_label": "Full Gate Credit",
        "effective": "Effective Recording Counts for Level Gate?",
        "effective_id": "fldswwnnpWpiKSIL4",
        "kind": "checkbox",
        "fallback": True,
        "copy_from_effective": True,
    },
    {
        "key": "perfect_week",
        "config": "Recording Makeup Counts for Perfect Week?",
        "override": "Perfect Week Credit — Meeting Override",
        "override_type": "singleSelect",
        "override_options": YES_NO,
        "rollup_label": "Perfect Week Credit",
        "effective": "Effective Recording Counts for Perfect Week?",
        "effective_id": "fldEfs9Xk4cIm7sqA",
        "kind": "checkbox",
        "fallback": True,
        "copy_from_effective": True,
    },
    {
        "key": "coach",
        "config": "Recording Quiz Requires Coach Approval?",
        "override": "Coach Approval Required — Meeting Override",
        "override_type": "singleSelect",
        "override_options": YES_NO,
        "rollup_label": "Coach Approval Required",
        "effective": "Effective Recording Quiz Requires Coach Approval?",
        "effective_id": "fldkKRtkzO4AkNyED",
        "kind": "checkbox",
        "fallback": True,
        "copy_from_effective": True,
    },
    {
        "key": "makeup_enabled",
        "config": "Recording Makeup Enabled?",
        "override": "Makeup Enabled — Meeting Override",
        "override_type": "singleSelect",
        "override_options": YES_NO,
        "rollup_label": "Makeup Enabled",
        "effective": "Effective Recording Makeup Enabled?",
        "effective_id": "fldppA7JHEbYNu3bR",
        "kind": "checkbox",
        "fallback": True,
        "copy_from_effective": True,
    },
    {
        "key": "makeup_days",
        "config": "Zoom Recording Makeup Window Days",
        "override": "Makeup Window Days — Meeting Override",
        "override_type": "number",
        "override_options": {"precision": 0},
        "rollup_label": "Makeup Window Days",
        "effective": "Effective Recording Makeup Window Days",
        "effective_id": "fldfDKHOn54ZbH7XL",
        "kind": "number",
        "fallback": 7,
        "copy_from_effective": True,
    },
    {
        "key": "deadline_mode",
        "config": "Zoom Recording Deadline Mode",
        "override": "Deadline Mode — Meeting Override",
        "override_type": "singleSelect",
        "override_options": DEADLINE_CHOICES,
        "rollup_label": "Deadline Mode",
        "effective": "Effective Recording Deadline Mode",
        "effective_id": "fldnwzUITHTzEeR5n",
        "kind": "select",
        "fallback": "Later of Both",
        "copy_from_effective": True,
    },
    {
        "key": "email_enabled",
        "config": "Recording Approval Email Enabled?",
        "override": "Approval Email Enabled — Meeting Override",
        "override_type": "singleSelect",
        "override_options": YES_NO,
        "rollup_label": "Approval Email Enabled",
        "effective": "Effective Recording Approval Email Enabled?",
        "effective_id": "fldqPzKXweQISK4ZR",
        "kind": "checkbox",
        "fallback": False,
        "copy_from_effective": True,
    },
    {
        "key": "email_timing",
        "config": "Recording Approval Email Timing",
        "override": "Approval Email Timing — Meeting Override",
        "override_type": "singleSelect",
        "override_options": TIMING_CHOICES,
        "rollup_label": "Approval Email Timing",
        "effective": "Effective Recording Approval Email Timing",
        "effective_id": "fldT2SG7GRc7sT32u",
        "kind": "select",
        "fallback": "On Satisfactory",
        "copy_from_effective": True,
        "note": "Current Effective Timing choices differ (Immediately After Approval / Scheduled Batch / Weekly Digest); live values are blank so copy is safe. Config+fallback use On Satisfactory per design.",
    },
    {
        "key": "email_template",
        "config": "Recording Approval Email Template Key",
        "override": "Approval Email Template Key — Meeting Override",
        "override_type": "singleLineText",
        "override_options": {},
        "rollup_label": "Approval Email Template Key",
        "effective": "Effective Recording Approval Email Template Key",
        "effective_id": "fldQtvxkRPGCJ7pq8",
        "kind": "text",
        "fallback": "",
        "copy_from_effective": True,
    },
]


def tables():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json()["tables"]


def field_by_name(table_id, name, ts=None):
    for t in ts or tables():
        if t["id"] == table_id:
            for f in t["fields"]:
                if f["name"] == name:
                    return f
    return None


def create_field(table_id, body):
    r = requests.post(f"{META}/tables/{table_id}/fields", headers=H, json=body, timeout=60)
    if r.status_code == 422 and "DUPLICATE" in r.text.upper():
        return {"status": "exists", "response": r.json()}
    if not r.ok:
        return {"status": "error", "code": r.status_code, "body": r.text[:800]}
    return {"status": "created", "field": r.json()}


def patch_field(table_id, field_id, body):
    r = requests.patch(f"{META}/tables/{table_id}/fields/{field_id}", headers=H, json=body, timeout=60)
    if not r.ok:
        return {"status": "error", "code": r.status_code, "body": r.text[:800]}
    return {"status": "patched", "field": r.json()}


def update_record(table_id, rid, fields):
    r = requests.patch(
        f"{DATA}/{table_id}/{rid}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"update {rid} {r.status_code}: {r.text[:400]}")
    return r.json()


def get_record(table_id, rid):
    r = requests.get(f"{DATA}/{table_id}/{rid}", headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def checkbox_truthy(v):
    return v is True or v == 1 or v == "1"


def cmd_manifest():
    manifest = {
        "base": DEV,
        "authority": "docs/deploy-checklists/C-025-config-linkage-design.md",
        "excluded": ["C-027 MEN fields", "117a-f", "PROD"],
        "config_fields": CONFIG_FIELDS,
        "zoom_meetings_links": [
            {
                "name": "Config (Program Scope)",
                "type": "multipleRecordLinks",
                "linkedTableId": CFG_ID,
                "purpose": "Tier-2 Program Config",
                "scope": "program",
            },
            {
                "name": "Config (Global Scope)",
                "type": "multipleRecordLinks",
                "linkedTableId": CFG_ID,
                "purpose": "Tier-3 Global Config",
                "scope": "global",
            },
        ],
        "zoom_meetings_overrides": [
            {
                "name": s["override"],
                "type": s["override_type"],
                "options": s["override_options"],
                "copies_from": s["effective"],
                "purpose": "Tier-1 meeting override (blank = not set)",
            }
            for s in SETTINGS
        ],
        "zoom_meetings_rollups": [
            {
                "name": f"{prefix} Config: {s['rollup_label']}",
                "type": "rollup",
                "link_field": link_name,
                "config_source": s["config"],
                "kind": s["kind"],
                "aggregation": {
                    "number": "IF(COUNTA(values)=0, BLANK(), SUM(values))",
                    "checkbox": "IF(COUNTA(values)=0, BLANK(), OR(values))",
                    "select": "IF(COUNTA(values)=0, BLANK(), ARRAYJOIN(values))",
                    "text": "IF(COUNTA(values)=0, BLANK(), ARRAYJOIN(values))",
                }[s["kind"] if s["kind"] != "select" else "select"],
            }
            for s in SETTINGS
            for prefix, link_name in (
                ("Program", "Config (Program Scope)"),
                ("Global", "Config (Global Scope)"),
            )
        ],
        "effective_conversions": [
            {
                "name": s["effective"],
                "id": s["effective_id"],
                "new_type": "formula",
                "fallback": s["fallback"],
                "kind": s["kind"],
            }
            for s in SETTINGS
        ],
        "deferred": [
            {
                "name": "Effective Recording Path Enabled?",
                "reason": "Design §2 #11 optional — Config-only this slice",
            }
        ],
        "notes": [
            "Program Instance table live name: Program Instance - Synced (tblMfALZa4YYUy70P)",
            "Effective Approval Email Timing today has different choices; values blank — using design On Satisfactory for Config/override/fallback",
            "Recording Makeup Enabled? and Recording Path Enabled? are design §2 proposed adds; included in Config create",
        ],
    }
    path = PREVIEW / "c025_config_linkage_manifest.json"
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "config": len(CONFIG_FIELDS), "overrides": len(SETTINGS), "rollups": 20}, indent=2))
    return manifest


def ensure_config_fields(ts):
    report = []
    for spec in CONFIG_FIELDS:
        existing = field_by_name(CFG_ID, spec["name"], ts)
        if existing:
            report.append({"name": spec["name"], "status": "existed", "id": existing["id"]})
            continue
        body = {"name": spec["name"], "type": spec["type"]}
        if spec.get("options"):
            body["options"] = spec["options"]
        body["description"] = f"C-025 — {spec['purpose']}"
        res = create_field(CFG_ID, body)
        if res["status"] == "created":
            report.append({"name": spec["name"], "status": "created", "id": res["field"]["id"]})
        elif res["status"] == "exists":
            report.append({"name": spec["name"], "status": "exists_race", "detail": res})
        else:
            report.append({"name": spec["name"], "status": "error", "detail": res})
            raise SystemExit(json.dumps(report, indent=2))
        time.sleep(0.25)
    return report


def seed_config_row():
    """Populate 2025-2026 Config with approved defaults; mark global default."""
    fields = {}
    for spec in CONFIG_FIELDS:
        if spec["name"] in ("Program Instance", "Is Global Default?"):
            continue
        dv = spec.get("default_value")
        if dv is None or dv == "":
            if spec["name"] == "Recording Approval Email Template Key":
                fields[spec["name"]] = "ZOOM_RECORDING_APPROVED"
            continue
        fields[spec["name"]] = dv
    fields["Is Global Default?"] = True
    update_record(CFG_ID, CFG_2025, fields)
    return {"config_row": CFG_2025, "fields_set": fields}


def ensure_zm_links_and_overrides(ts):
    report = []
    for name in ("Config (Program Scope)", "Config (Global Scope)"):
        existing = field_by_name(ZM_ID, name, ts)
        if existing:
            report.append({"name": name, "status": "existed", "id": existing["id"]})
            continue
        res = create_field(
            ZM_ID,
            {
                "name": name,
                "type": "multipleRecordLinks",
                "options": {"linkedTableId": CFG_ID},
                "description": "C-025 — Config linkage scope link",
            },
        )
        if res["status"] != "created":
            raise SystemExit(json.dumps(res, indent=2))
        report.append({"name": name, "status": "created", "id": res["field"]["id"]})
        time.sleep(0.25)

    for s in SETTINGS:
        existing = field_by_name(ZM_ID, s["override"], ts)
        if existing:
            report.append({"name": s["override"], "status": "existed", "id": existing["id"]})
            continue
        body = {
            "name": s["override"],
            "type": s["override_type"],
            "description": f"C-025 — meeting override for {s['effective']}",
        }
        if s["override_options"]:
            body["options"] = s["override_options"]
        res = create_field(ZM_ID, body)
        if res["status"] != "created":
            raise SystemExit(json.dumps({"override": s["override"], **res}, indent=2))
        report.append({"name": s["override"], "status": "created", "id": res["field"]["id"]})
        time.sleep(0.25)
    return report


def copy_overrides():
    """Copy non-blank Effective values into Override fields. Checkboxes: True→Yes only; False/None leave blank."""
    copied = []
    for mid in MEETINGS:
        rec = get_record(ZM_ID, mid)
        f = rec.get("fields") or {}
        patch = {}
        detail = {}
        for s in SETTINGS:
            raw = f.get(s["effective"])
            if s["kind"] == "checkbox":
                if checkbox_truthy(raw):
                    patch[s["override"]] = "Yes"
                    detail[s["override"]] = {"from": raw, "to": "Yes"}
                # False/None → leave blank (no override); preserves Config/fallback path
            elif s["kind"] in ("number", "select", "text"):
                if raw is None or raw == "":
                    continue
                patch[s["override"]] = raw
                detail[s["override"]] = {"from": raw, "to": raw}
        if patch:
            update_record(ZM_ID, mid, patch)
            time.sleep(0.2)
        # verify
        after = get_record(ZM_ID, mid).get("fields") or {}
        verify = {k: after.get(k) for k in patch}
        copied.append({"meeting": mid, "patched": patch, "verified": verify, "match": verify == patch})
    return copied


def ensure_rollups(ts):
    report = []
    # Refresh field map after creates
    ts = tables()
    prog_link = field_by_name(ZM_ID, "Config (Program Scope)", ts)
    glob_link = field_by_name(ZM_ID, "Config (Global Scope)", ts)
    if not prog_link or not glob_link:
        raise SystemExit("missing Config link fields")

    agg = {
        "number": "IF(COUNTA(values) = 0, BLANK(), SUM(values))",
        "checkbox": "IF(COUNTA(values) = 0, BLANK(), OR(values))",
        "select": "IF(COUNTA(values) = 0, BLANK(), ARRAYJOIN(values))",
        "text": "IF(COUNTA(values) = 0, BLANK(), ARRAYJOIN(values))",
    }

    for s in SETTINGS:
        cfg_f = field_by_name(CFG_ID, s["config"], ts)
        if not cfg_f:
            raise SystemExit(f"missing Config field {s['config']}")
        for prefix, link in (("Program", prog_link), ("Global", glob_link)):
            name = f"{prefix} Config: {s['rollup_label']}"
            existing = field_by_name(ZM_ID, name, ts)
            if existing:
                report.append({"name": name, "status": "existed", "id": existing["id"]})
                continue
            kind = s["kind"]
            res = create_field(
                ZM_ID,
                {
                    "name": name,
                    "type": "rollup",
                    "description": f"C-025 — {prefix} Config rollup for {s['effective']}",
                    "options": {
                        "recordLinkFieldId": link["id"],
                        "fieldIdInLinkedTable": cfg_f["id"],
                        "formula": agg[kind],
                    },
                },
            )
            if res["status"] != "created":
                raise SystemExit(json.dumps({"rollup": name, **res}, indent=2))
            report.append({"name": name, "status": "created", "id": res["field"]["id"], "valid": (res["field"].get("options") or {}).get("isValid")})
            time.sleep(0.3)
    return report


def number_formula(override, prog, glob, fallback):
    return (
        f"IF({{"+override+"} != BLANK(), {"+override+"}, "
        f"IF({{"+prog+"} != BLANK(), {"+prog+"}, "
        f"IF({{"+glob+"} != BLANK(), {"+glob+"}, {fallback})))"
    )


def checkbox_formula(override, prog, glob, fallback_bool):
    # Program/Global are Yes/No text lookups of Config *YN companions (checkbox
    # lookups return blank when unchecked; YN formulas always return Yes/No).
    fb = "TRUE()" if fallback_bool else "FALSE()"
    return f"""IF(
  {{{override}}} = "Yes", TRUE(),
  IF(
    {{{override}}} = "No", FALSE(),
    IF(
      {{{prog}}} = "Yes", TRUE(),
      IF(
        {{{prog}}} = "No", FALSE(),
        IF(
          {{{glob}}} = "Yes", TRUE(),
          IF(
            {{{glob}}} = "No", FALSE(),
            {fb}
          )
        )
      )
    )
  )
)"""


def text_formula(override, prog, glob, fallback):
    if fallback == "":
        fb = "BLANK()"
    else:
        fb = json.dumps(fallback)
    return f"""IF(
  {{{override}}} != BLANK(),
  {{{override}}},
  IF(
    {{{prog}}} != BLANK(),
    {{{prog}}},
    IF(
      {{{glob}}} != BLANK(),
      {{{glob}}},
      {fb}
    )
  )
)"""


def build_effective_formula(s):
    o, p, g = s["override"], f"Program Config: {s['rollup_label']}", f"Global Config: {s['rollup_label']}"
    if s["kind"] == "number":
        # Keep one-liner style from design
        return (
            f"IF(\n  {{{o}}} != BLANK(),\n  {{{o}}},\n  IF(\n    {{{p}}} != BLANK(),\n    {{{p}}},\n"
            f"    IF(\n      {{{g}}} != BLANK(),\n      {{{g}}},\n      {s['fallback']}\n    )\n  )\n)"
        )
    if s["kind"] == "checkbox":
        return checkbox_formula(o, p, g, bool(s["fallback"]))
    # select / text
    return text_formula(o, p, g, s["fallback"])


def convert_effectives():
    report = []
    for s in SETTINGS:
        formula = build_effective_formula(s)
        # Try convert via Meta API (design preferred UI; API if accepted)
        body = {
            "type": "formula",
            "description": f"C-025 — precedence Effective for {s['key']}",
            "options": {"formula": formula},
        }
        res = patch_field(ZM_ID, s["effective_id"], body)
        report.append(
            {
                "effective": s["effective"],
                "id": s["effective_id"],
                "formula": formula,
                "result": res,
            }
        )
        if res["status"] != "patched":
            # stop — do not continue converting if one fails mid-flight
            return report
        time.sleep(0.35)
    return report


def link_all_meetings_to_config():
    out = []
    for mid in MEETINGS:
        update_record(
            ZM_ID,
            mid,
            {
                "Config (Program Scope)": [CFG_2025],
                "Config (Global Scope)": [CFG_2025],
            },
        )
        out.append(mid)
        time.sleep(0.2)
    return out


def cmd_apply():
    out = {"manifest": cmd_manifest()}
    ts = tables()
    out["config_fields"] = ensure_config_fields(ts)
    ts = tables()
    out["config_seed"] = seed_config_row()
    out["zm_links_overrides"] = ensure_zm_links_and_overrides(ts)
    out["override_copy"] = copy_overrides()
    out["rollups"] = ensure_rollups(None)
    out["config_links"] = link_all_meetings_to_config()
    out["effective_convert"] = convert_effectives()
    path = PREVIEW / "c025_config_linkage_apply.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "convert_ok": all(x["result"]["status"] == "patched" for x in out["effective_convert"])}, indent=2))


def cmd_apply_through_overrides():
    """Create Config + links + overrides + copy; stop before rollups/Effective convert."""
    out = {"manifest": cmd_manifest()}
    ts = tables()
    out["config_fields"] = ensure_config_fields(ts)
    ts = tables()
    out["config_seed"] = seed_config_row()
    out["zm_links_overrides"] = ensure_zm_links_and_overrides(ts)
    out["override_copy"] = copy_overrides()
    path = PREVIEW / "c025_config_linkage_phase_a.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "copy": out["override_copy"]}, indent=2))


def cmd_apply_rollups_and_convert():
    out = {}
    out["rollups"] = ensure_rollups(None)
    out["config_links"] = link_all_meetings_to_config()
    out["effective_convert"] = convert_effectives()
    path = PREVIEW / "c025_config_linkage_phase_b.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "convert": [(x["effective"], x["result"]["status"]) for x in out["effective_convert"]]}, indent=2))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "manifest"
    if cmd == "manifest":
        cmd_manifest()
    elif cmd == "apply":
        cmd_apply()
    elif cmd == "phase_a":
        cmd_apply_through_overrides()
    elif cmd == "phase_b":
        cmd_apply_rollups_and_convert()
    else:
        raise SystemExit("usage: manifest|apply|phase_a|phase_b")
