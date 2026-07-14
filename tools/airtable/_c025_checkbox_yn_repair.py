#!/usr/bin/env python3
"""C-025 DEV: Config checkbox YN formulas + retarget lookups; reverify checkbox tiers.

Why: Meta API cannot set rollup aggregation formulas. Checkbox Lookups return blank
when unchecked (indistinguishable from no link). Config-side IF(checkbox,\"Yes\",\"No\")
plus lookup of that text restores design intent of COUNTA/OR blank-safety.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

from _c025_config_linkage_apply import (
    CFG_ID,
    SETTINGS,
    ZM_ID,
    field_by_name,
    get_record,
    tables,
)
from _c025_checkbox_rollup_repair import (
    CFG_GATE,
    CFG_MUTABLE,
    CFG_ROW,
    GATE_DRAFT,
    GATE_OVERRIDE,
    GLOB_LINK,
    MID,
    PROG_LINK,
    SCHMIDT_ZA,
    ZM_DEADLINE_FIXTURE,
    ZM_MUTABLE,
    clear_field,
    first,
    patch_fields,
    restore_from_snapshot,
    schmidt_4,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
META = f"https://api.airtable.com/v0/meta/bases/appTetnuCZlCZdTCT"

# Config checkbox → YN companion text formula (always Yes/No when Config row exists)
YN_PAIRS = [
    {
        "checkbox": "Recording Gives Full Zoom Gate Credit?",
        "yn": "Recording Gives Full Zoom Gate Credit YN",
        "rollup_label": "Full Gate Credit",
        "override": "Full Gate Credit — Meeting Override",
        "draft": "Effective Recording Counts for Level Gate? (Config formula draft)",
        "fallback": True,
    },
    {
        "checkbox": "Recording Makeup Counts for Perfect Week?",
        "yn": "Recording Makeup Counts for Perfect Week YN",
        "rollup_label": "Perfect Week Credit",
        "override": "Perfect Week Credit — Meeting Override",
        "draft": "Effective Recording Counts for Perfect Week? (Config formula draft)",
        "fallback": True,
    },
    {
        "checkbox": "Recording Quiz Requires Coach Approval?",
        "yn": "Recording Quiz Requires Coach Approval YN",
        "rollup_label": "Coach Approval Required",
        "override": "Coach Approval Required — Meeting Override",
        "draft": "Effective Recording Quiz Requires Coach Approval? (Config formula draft)",
        "fallback": True,
    },
    {
        "checkbox": "Recording Makeup Enabled?",
        "yn": "Recording Makeup Enabled YN",
        "rollup_label": "Makeup Enabled",
        "override": "Makeup Enabled — Meeting Override",
        "draft": "Effective Recording Makeup Enabled? (Config formula draft)",
        "fallback": True,
    },
    {
        "checkbox": "Recording Approval Email Enabled?",
        "yn": "Recording Approval Email Enabled YN",
        "rollup_label": "Approval Email Enabled",
        "override": "Approval Email Enabled — Meeting Override",
        "draft": "Effective Recording Approval Email Enabled? (Config formula draft)",
        "fallback": False,
    },
]


def yn_formula(checkbox_name: str) -> str:
    return f'IF({{{checkbox_name}}}, "Yes", "No")'


def checkbox_draft_formula(pair: dict) -> str:
    o = pair["override"]
    p = f"Program Config: {pair['rollup_label']}"
    g = f"Global Config: {pair['rollup_label']}"
    fb = "TRUE()" if pair["fallback"] else "FALSE()"
    return f"""IF(
  {{{o}}} = "Yes", TRUE(),
  IF(
    {{{o}}} = "No", FALSE(),
    IF(
      {{{p}}} = "Yes", TRUE(),
      IF(
        {{{p}}} = "No", FALSE(),
        IF(
          {{{g}}} = "Yes", TRUE(),
          IF(
            {{{g}}} = "No", FALSE(),
            {fb}
          )
        )
      )
    )
  )
)"""


def ensure_config_yn_fields():
    out = []
    ts = tables()
    for pair in YN_PAIRS:
        existing = field_by_name(CFG_ID, pair["yn"], ts)
        formula = yn_formula(pair["checkbox"])
        if existing and existing.get("type") == "formula":
            r = requests.patch(
                f"{META}/tables/{CFG_ID}/fields/{existing['id']}",
                headers=H,
                json={"options": {"formula": formula}},
                timeout=60,
            )
            out.append({"name": pair["yn"], "status": "updated" if r.ok else "error", "id": existing["id"], "code": r.status_code})
            if not r.ok:
                raise SystemExit(json.dumps(out[-1], indent=2))
        else:
            r = requests.post(
                f"{META}/tables/{CFG_ID}/fields",
                headers=H,
                json={
                    "name": pair["yn"],
                    "type": "formula",
                    "description": "C-025 — Yes/No companion for checkbox blank-safe Config linkage",
                    "options": {"formula": formula},
                },
                timeout=60,
            )
            if not r.ok:
                raise SystemExit(f"create YN {pair['yn']}: {r.status_code} {r.text[:400]}")
            out.append({"name": pair["yn"], "status": "created", "id": r.json()["id"]})
        time.sleep(0.25)
        ts = tables()
    return out


def retarget_lookups_to_yn():
    """Replace Program/Global Full Gate Credit etc. lookups to read YN text fields."""
    out = []
    ts = tables()
    cfg_by_name = {}
    for t in ts:
        if t["id"] == CFG_ID:
            cfg_by_name = {f["name"]: f for f in t["fields"]}
    prog_link = field_by_name(ZM_ID, "Config (Program Scope)", ts)
    glob_link = field_by_name(ZM_ID, "Config (Global Scope)", ts)

    for pair in YN_PAIRS:
        yn_f = cfg_by_name.get(pair["yn"])
        if not yn_f:
            raise SystemExit(f"missing Config YN {pair['yn']}")
        for prefix, link in (("Program", prog_link), ("Global", glob_link)):
            name = f"{prefix} Config: {pair['rollup_label']}"
            existing = field_by_name(ZM_ID, name, ts)
            if not existing:
                raise SystemExit(f"missing {name}")
            # If already lookup of YN, skip
            opts = existing.get("options") or {}
            if (
                existing.get("type") == "multipleLookupValues"
                and opts.get("fieldIdInLinkedTable") == yn_f["id"]
            ):
                out.append({"name": name, "status": "already_yn_lookup", "id": existing["id"]})
                continue

            legacy = f"{name} — pre-YN"
            r = requests.patch(
                f"{META}/tables/{ZM_ID}/fields/{existing['id']}",
                headers=H,
                json={"name": legacy},
                timeout=60,
            )
            if not r.ok:
                raise SystemExit(f"rename {name}: {r.status_code} {r.text[:300]}")
            time.sleep(0.2)
            c = requests.post(
                f"{META}/tables/{ZM_ID}/fields",
                headers=H,
                json={
                    "name": name,
                    "type": "multipleLookupValues",
                    "description": "C-025 — lookup Config YN text (Yes/No) for blank-safe checkbox precedence",
                    "options": {
                        "recordLinkFieldId": link["id"],
                        "fieldIdInLinkedTable": yn_f["id"],
                    },
                },
                timeout=60,
            )
            if not c.ok:
                requests.patch(
                    f"{META}/tables/{ZM_ID}/fields/{existing['id']}",
                    headers=H,
                    json={"name": name},
                    timeout=60,
                )
                raise SystemExit(f"create YN lookup {name}: {c.status_code} {c.text[:400]}")
            out.append(
                {
                    "name": name,
                    "status": "retargeted_to_yn",
                    "lookup_id": c.json()["id"],
                    "yn_source": pair["yn"],
                    "yn_id": yn_f["id"],
                    "legacy_id": existing["id"],
                }
            )
            time.sleep(0.3)
            ts = tables()
    return out


def refresh_checkbox_drafts():
    out = []
    ts = tables()
    for pair in YN_PAIRS:
        f = field_by_name(ZM_ID, pair["draft"], ts)
        if not f:
            out.append({"draft": pair["draft"], "status": "missing"})
            continue
        formula = checkbox_draft_formula(pair)
        r = requests.patch(
            f"{META}/tables/{ZM_ID}/fields/{f['id']}",
            headers=H,
            json={"options": {"formula": formula}},
            timeout=60,
        )
        if not r.ok:
            raise SystemExit(f"draft update {pair['draft']}: {r.status_code} {r.text[:400]}")
        res = (r.json().get("options") or {}).get("result") or {}
        out.append({"draft": pair["draft"], "status": "updated", "result": res.get("type"), "isValid": (r.json().get("options") or {}).get("isValid")})
        time.sleep(0.25)
    return out


def gate_truth(v):
    if v is True or v == 1 or v == "1" or v == "true" or v is False and False:
        pass
    if v in (True, 1, "1", "true", "TRUE"):
        return True
    if v in (False, 0, "0", "false", "FALSE"):
        return False
    return None


def wait_gate(extra=3.0):
    time.sleep(extra)
    f = get_record(ZM_ID, MID).get("fields") or {}
    return {
        "gate_override": f.get(GATE_OVERRIDE),
        "prog_link": f.get(PROG_LINK),
        "glob_link": f.get(GLOB_LINK),
        "prog_gate": first(f.get("Program Config: Full Gate Credit")),
        "glob_gate": first(f.get("Global Config: Full Gate Credit")),
        "gate_draft": first(f.get(GATE_DRAFT)),
        "gate_draft_bool": gate_truth(first(f.get(GATE_DRAFT))),
    }


def run_matrix(snapshot):
    results = []
    prog0 = snapshot["meeting"].get(PROG_LINK) or [CFG_ROW]
    glob0 = snapshot["meeting"].get(GLOB_LINK) or [CFG_ROW]

    # 1 override Yes
    patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0})
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "Yes"})
    s = wait_gate()
    results.append({"name": "override_yes_wins", "ok": s["gate_draft_bool"] is True, "snap": s})

    # 2 override No
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "No"})
    s = wait_gate()
    results.append({"name": "override_no_wins", "ok": s["gate_draft_bool"] is False, "snap": s})

    # 3 program checked
    clear_field(ZM_ID, MID, GATE_OVERRIDE)
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0})
    s = wait_gate()
    results.append(
        {
            "name": "program_checked_override_blank",
            "ok": s["gate_draft_bool"] is True and s["prog_gate"] == "Yes",
            "snap": s,
        }
    )

    # 4 program unchecked
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    s = wait_gate(3.5)
    results.append(
        {
            "name": "program_unchecked_override_blank",
            "ok": s["gate_draft_bool"] is False and s["prog_gate"] == "No",
            "snap": s,
        }
    )

    # 5 global checked, program absent
    clear_field(ZM_ID, MID, PROG_LINK)
    patch_fields(ZM_ID, MID, {GLOB_LINK: glob0})
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    s = wait_gate(3.5)
    results.append(
        {
            "name": "global_checked_program_absent",
            "ok": s["gate_draft_bool"] is True
            and s["prog_link"] in (None, [])
            and s["glob_gate"] == "Yes",
            "snap": s,
        }
    )

    # 6 global unchecked
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    s = wait_gate(3.5)
    results.append(
        {
            "name": "global_unchecked_program_absent",
            "ok": s["gate_draft_bool"] is False
            and s["prog_link"] in (None, [])
            and s["glob_gate"] == "No",
            "snap": s,
        }
    )

    # 7 fallback
    clear_field(ZM_ID, MID, PROG_LINK)
    clear_field(ZM_ID, MID, GLOB_LINK)
    clear_field(ZM_ID, MID, GATE_OVERRIDE)
    s = wait_gate(3.5)
    results.append(
        {
            "name": "fallback_true_both_links_absent",
            "ok": s["gate_draft_bool"] is True
            and s["prog_link"] in (None, [])
            and s["glob_link"] in (None, []),
            "snap": s,
        }
    )
    return results


def main():
    yn = ensure_config_yn_fields()
    lookups = retarget_lookups_to_yn()
    drafts = refresh_checkbox_drafts()

    cfg_f = get_record(CFG_ID, CFG_ROW).get("fields") or {}
    zm_f = get_record(ZM_ID, MID).get("fields") or {}
    snapshot = {
        "config": {n: cfg_f.get(n) for n in CFG_MUTABLE},
        "meeting": {n: zm_f.get(n) for n in ZM_MUTABLE},
    }

    results = []
    restore_report = []
    try:
        results.extend(run_matrix(snapshot))
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "matrix_exception", "ok": False, "error": str(exc)})
    finally:
        restore_report = restore_from_snapshot(snapshot)
        results.append(
            {
                "name": "restored_config_and_meeting",
                "ok": all(r.get("ok") for r in restore_report),
                "details": restore_report,
            }
        )

    dval = (get_record(ZM_ID, ZM_DEADLINE_FIXTURE).get("fields") or {}).get("Calculated Recording Quiz Deadline")
    looks_date = isinstance(dval, str) and len(dval) >= 8 and dval[0:4].isdigit()
    if isinstance(dval, list) and dval:
        looks_date = isinstance(dval[0], str) and dval[0][0:4].isdigit()
    results.append({"name": "deadline_still_date", "ok": looks_date, "deadline": dval})

    ts = tables()
    eff_types = {}
    all_edit = True
    for s in SETTINGS:
        f = field_by_name(ZM_ID, s["effective"], ts)
        t = (f or {}).get("type")
        eff_types[s["effective"]] = t
        if t == "formula" or not f:
            all_edit = False
    results.append({"name": "effectives_remain_editable", "ok": all_edit, "types": eff_types})
    credit = schmidt_4()
    results.append({"name": "schmidt_credit_4_of_4", "ok": all(t["ok"] for t in credit), "tests": credit})

    out = {
        "approach": "Config YN formulas + Program/Global Lookups of YN (Meta cannot set rollup OR/COUNTA formula)",
        "design_rollup_formula_requested": "IF(COUNTA(values)=0, BLANK(), OR(values))",
        "config_yn": yn,
        "lookups": lookups,
        "drafts": drafts,
        "pretest_snapshot": snapshot,
        "restoration": restore_report,
        "restoration_ok": all(r.get("ok") for r in restore_report) if restore_report else False,
        "results": results,
        "pass": sum(1 for t in results if t.get("ok")),
        "fail": sum(1 for t in results if not t.get("ok")),
    }
    path = PREVIEW / "c025_checkbox_yn_repair_verify.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "pass": out["pass"], "fail": out["fail"], "restoration_ok": out["restoration_ok"], "tests": [(t["name"], t.get("ok")) for t in results]}, indent=2))


if __name__ == "__main__":
    main()
