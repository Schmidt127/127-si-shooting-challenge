#!/usr/bin/env python3
"""C-025 DEV: replace broken checkbox rollups with Lookups (Meta API cannot set rollup formulas).

Approved intent: install COUNTA/OR blank-safe behavior for checkbox Config values.
API cannot PATCH rollup.formula (always 422 / formula never stored on create).
Equivalent blank-safe path: Lookup of Config checkbox + draft formulas that treat
link absence vs unchecked via lookup FALSE vs BLANK.
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
    ZA_ID,
    build_effective_formula,
    field_by_name,
    get_record,
    tables,
)
from _c025_checkbox_rollup_repair import (  # reuse matrix/helpers
    CHECKBOX_AGG,
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
    inventory,
    patch_fields,
    restore_from_snapshot,
    schmidt_4,
    wait_snap,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
META = f"https://api.airtable.com/v0/meta/bases/appTetnuCZlCZdTCT"


def replace_checkbox_rollups_with_lookups(checkbox_rows):
    """Rename legacy rollup aside; create Lookup with original name."""
    out = []
    ts = tables()
    for row in checkbox_rows:
        name = row["name"]
        legacy = f"{name} — legacy rollup"
        existing = field_by_name(ZM_ID, name, ts)
        if not existing:
            raise SystemExit(f"missing {name}")

        if existing["type"] == "multipleLookupValues":
            out.append({"name": name, "status": "already_lookup", "id": existing["id"]})
            continue

        # rename rollup aside if not already
        if existing["type"] == "rollup":
            r = requests.patch(
                f"{META}/tables/{ZM_ID}/fields/{existing['id']}",
                headers=H,
                json={"name": legacy},
                timeout=60,
            )
            if not r.ok:
                raise SystemExit(f"rename failed {name}: {r.status_code} {r.text[:300]}")
            time.sleep(0.25)
        elif existing["name"] != legacy:
            # unexpected type
            raise SystemExit(f"unexpected type for {name}: {existing['type']}")

        # create lookup with original name
        body = {
            "name": name,
            "type": "multipleLookupValues",
            "description": (
                "C-025 — checkbox Config lookup (API cannot set rollup COUNTA/OR formula; "
                f"design aggregation was: {CHECKBOX_AGG})"
            ),
            "options": {
                "recordLinkFieldId": row["recordLinkFieldId"],
                "fieldIdInLinkedTable": row["fieldIdInLinkedTable"],
            },
        }
        c = requests.post(f"{META}/tables/{ZM_ID}/fields", headers=H, json=body, timeout=60)
        if not c.ok:
            # try restore name
            requests.patch(
                f"{META}/tables/{ZM_ID}/fields/{existing['id']}",
                headers=H,
                json={"name": name},
                timeout=60,
            )
            raise SystemExit(f"create lookup failed {name}: {c.status_code} {c.text[:400]}")
        created = c.json()
        out.append(
            {
                "name": name,
                "status": "replaced_with_lookup",
                "legacy_rollup_id": existing["id"],
                "legacy_name": legacy,
                "lookup_id": created["id"],
                "lookup_result": (created.get("options") or {}).get("result"),
            }
        )
        time.sleep(0.3)
        ts = tables()
    return out


def refresh_checkbox_draft_formulas():
    """Re-paste draft formulas so they bind to new lookup field IDs."""
    out = []
    ts = tables()
    for s in SETTINGS:
        if s["kind"] != "checkbox":
            continue
        draft = f"{s['effective']} (Config formula draft)"
        f = field_by_name(ZM_ID, draft, ts)
        if not f:
            out.append({"draft": draft, "status": "missing"})
            continue
        formula = build_effective_formula(s)
        r = requests.patch(
            f"{META}/tables/{ZM_ID}/fields/{f['id']}",
            headers=H,
            json={"options": {"formula": formula}},
            timeout=60,
        )
        out.append(
            {
                "draft": draft,
                "status": "updated" if r.ok else "error",
                "code": r.status_code,
                "body": None if r.ok else r.text[:300],
                "isValid": ((r.json().get("options") or {}).get("isValid") if r.ok else None),
            }
        )
        if not r.ok:
            raise SystemExit(json.dumps(out[-1], indent=2))
        time.sleep(0.25)
    return out


def run_matrix(snapshot):
    results = []
    prog0 = snapshot["meeting"].get(PROG_LINK) or [CFG_ROW]
    glob0 = snapshot["meeting"].get(GLOB_LINK) or [CFG_ROW]
    clear_field(ZM_ID, MID, GATE_OVERRIDE)
    patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0})

    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "Yes"})
    s = wait_snap(3)
    results.append({"name": "override_yes_wins", "ok": s["gate_draft"] in (1, True), "snap": s})

    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "No"})
    s = wait_snap(3)
    results.append({"name": "override_no_wins", "ok": s["gate_draft"] in (0, False), "snap": s})

    clear_field(ZM_ID, MID, GATE_OVERRIDE)
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0})
    s = wait_snap(3)
    results.append(
        {
            "name": "program_checked_override_blank",
            "ok": s["gate_draft"] in (1, True) and s["prog_gate"] in (1, True),
            "snap": s,
        }
    )

    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    s = wait_snap(3.5)
    results.append(
        {
            "name": "program_unchecked_override_blank",
            "ok": s["gate_draft"] in (0, False) and s["prog_gate"] in (0, False),
            "snap": s,
        }
    )

    clear_field(ZM_ID, MID, PROG_LINK)
    patch_fields(ZM_ID, MID, {GLOB_LINK: glob0})
    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
    s = wait_snap(3.5)
    results.append(
        {
            "name": "global_checked_program_absent",
            "ok": s["gate_draft"] in (1, True)
            and s["prog_link"] in (None, [])
            and s["glob_gate"] in (1, True),
            "snap": s,
        }
    )

    patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
    s = wait_snap(3.5)
    results.append(
        {
            "name": "global_unchecked_program_absent",
            "ok": s["gate_draft"] in (0, False)
            and s["prog_link"] in (None, [])
            and s["glob_gate"] in (0, False),
            "snap": s,
        }
    )

    clear_field(ZM_ID, MID, PROG_LINK)
    clear_field(ZM_ID, MID, GLOB_LINK)
    clear_field(ZM_ID, MID, GATE_OVERRIDE)
    s = wait_snap(3.5)
    results.append(
        {
            "name": "fallback_true_both_links_absent",
            "ok": s["gate_draft"] in (1, True)
            and s["prog_link"] in (None, [])
            and s["glob_link"] in (None, []),
            "snap": s,
        }
    )
    return results


def main():
    checkbox, other = inventory()
    # Confirm Meta cannot set rollup formula — switch path
    replaced = replace_checkbox_rollups_with_lookups(checkbox)
    drafts = refresh_checkbox_draft_formulas()

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

    # Confirm probe field leftovers
    probe = field_by_name(ZM_ID, "C025 Checkbox Rollup Probe", ts)

    out = {
        "note": "Meta API cannot install rollup aggregation formulas; checkbox rollups replaced with Lookups of same name. Design COUNTA/OR intent preserved via lookup false vs blank + draft IF chain.",
        "design_aggregation": CHECKBOX_AGG,
        "non_checkbox_untouched": [{"name": r["name"], "id": r["id"], "kind": r["kind"]} for r in other],
        "replaced": replaced,
        "drafts_refreshed": drafts,
        "pretest_snapshot": snapshot,
        "restoration": restore_report,
        "restoration_ok": all(r.get("ok") for r in restore_report) if restore_report else False,
        "probe_still_present": bool(probe),
        "probe_id": (probe or {}).get("id"),
        "results": results,
        "pass": sum(1 for t in results if t.get("ok")),
        "fail": sum(1 for t in results if not t.get("ok")),
    }
    path = PREVIEW / "c025_checkbox_lookup_repair_verify.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "wrote": str(path),
                "pass": out["pass"],
                "fail": out["fail"],
                "restoration_ok": out["restoration_ok"],
                "tests": [(t["name"], t.get("ok")) for t in results],
                "probe_still_present": out["probe_still_present"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
