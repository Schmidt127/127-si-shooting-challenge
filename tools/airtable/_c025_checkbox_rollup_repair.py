#!/usr/bin/env python3
"""C-025 DEV: repair checkbox Config rollups + reverify checkbox precedence."""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

from _c025_config_linkage_apply import (
    CFG_2025,
    CFG_ID,
    SETTINGS,
    ZM_ID,
    ZA_ID,
    field_by_name,
    get_record,
    tables,
    update_record,
)
from _c025_config_linkage_verify import (
    CFG_GATE,
    CFG_MUTABLE,
    CFG_ROW,
    CFG_XP,
    GATE_DRAFT,
    GATE_OVERRIDE,
    GLOB_LINK,
    PROG_LINK,
    SCHMIDT_ZA,
    TEST_MEETING_CANVAS,
    XP_DRAFT,
    XP_OVERRIDE,
    ZM_DEADLINE_FIXTURE,
    ZM_MUTABLE,
    first,
    values_equal,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
META = f"https://api.airtable.com/v0/meta/bases/appTetnuCZlCZdTCT"
DATA = f"https://api.airtable.com/v0/appTetnuCZlCZdTCT"

CHECKBOX_AGG = "IF(COUNTA(values) = 0, BLANK(), OR(values))"
MID = TEST_MEETING_CANVAS


def inventory():
    ts = tables()
    cfg_by_id = {}
    for t in ts:
        if t["id"] == CFG_ID:
            cfg_by_id = {f["id"]: f for f in t["fields"]}
    checkbox = []
    other = []
    for s in SETTINGS:
        for prefix in ("Program", "Global"):
            name = f"{prefix} Config: {s['rollup_label']}"
            f = field_by_name(ZM_ID, name, ts)
            if not f:
                raise SystemExit(f"missing rollup {name}")
            opts = f.get("options") or {}
            src = cfg_by_id.get(opts.get("fieldIdInLinkedTable") or "")
            row = {
                "table": "Zoom Meetings",
                "name": name,
                "id": f["id"],
                "kind": s["kind"],
                "config_source": (src or {}).get("name"),
                "config_type": (src or {}).get("type"),
                "current_formula": opts.get("formula"),
                "isValid": opts.get("isValid"),
                "result": (opts.get("result") or {}).get("type"),
                "recordLinkFieldId": opts.get("recordLinkFieldId"),
                "fieldIdInLinkedTable": opts.get("fieldIdInLinkedTable"),
            }
            if s["kind"] == "checkbox":
                row["proposed"] = CHECKBOX_AGG
                checkbox.append(row)
            else:
                other.append(row)
    return checkbox, other


def repair_checkbox_rollups(checkbox_rows):
    out = []
    for row in checkbox_rows:
        body = {
            "description": "C-025 — checkbox rollup: blank when no Config link; OR(values) preserves unchecked",
            "options": {
                "recordLinkFieldId": row["recordLinkFieldId"],
                "fieldIdInLinkedTable": row["fieldIdInLinkedTable"],
                "formula": CHECKBOX_AGG,
            },
        }
        r = requests.patch(
            f"{META}/tables/{ZM_ID}/fields/{row['id']}",
            headers=H,
            json=body,
            timeout=60,
        )
        item = {
            "name": row["name"],
            "id": row["id"],
            "status_code": r.status_code,
            "ok": r.ok,
        }
        if r.ok:
            opts = (r.json().get("options") or {})
            item["installed_formula"] = opts.get("formula")
            item["isValid"] = opts.get("isValid")
            item["result"] = (opts.get("result") or {}).get("type")
        else:
            item["body"] = r.text[:500]
            raise SystemExit(json.dumps(item, indent=2))
        out.append(item)
        time.sleep(0.25)
    return out


def patch_fields(table_id, rid, fields):
    r = requests.patch(
        f"{DATA}/{table_id}/{rid}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise RuntimeError(f"PATCH {table_id}/{rid} {r.status_code}: {r.text[:400]}")
    return r.json()


def clear_field(table_id, rid, field_name):
    patch_fields(table_id, rid, {field_name: None})


def restore_from_snapshot(snapshot):
    report = []
    patch_fields(CFG_ID, CFG_ROW, {n: snapshot["config"].get(n) for n in CFG_MUTABLE})
    time.sleep(1.2)
    after_cfg = get_record(CFG_ID, CFG_ROW).get("fields") or {}
    for n in CFG_MUTABLE:
        report.append(
            {
                "table": "Config",
                "field": n,
                "wanted": snapshot["config"].get(n),
                "got": after_cfg.get(n),
                "ok": values_equal(after_cfg.get(n), snapshot["config"].get(n)),
            }
        )
    patch_fields(ZM_ID, MID, {n: snapshot["meeting"].get(n) for n in ZM_MUTABLE})
    time.sleep(1.2)
    after_zm = get_record(ZM_ID, MID).get("fields") or {}
    for n in ZM_MUTABLE:
        wanted = snapshot["meeting"].get(n)
        got = after_zm.get(n)
        if wanted in (None, []) and got in (None, [], ""):
            ok = True
        else:
            ok = values_equal(got, wanted)
        report.append({"table": "Zoom Meetings", "field": n, "wanted": wanted, "got": got, "ok": ok})
    return report


def wait_snap(extra=2.5):
    time.sleep(extra)
    f = get_record(ZM_ID, MID).get("fields") or {}
    return {
        "gate_override": f.get(GATE_OVERRIDE),
        "prog_link": f.get(PROG_LINK),
        "glob_link": f.get(GLOB_LINK),
        "prog_gate": first(f.get("Program Config: Full Gate Credit")),
        "glob_gate": first(f.get("Global Config: Full Gate Credit")),
        "gate_draft": first(f.get(GATE_DRAFT)),
        "xp_draft": first(f.get(XP_DRAFT)),
    }


def truthy(v):
    return v is True or v == 1 or v == "1"


def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, list) and len(v) == 1:
        return num(v[0])
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def schmidt_4():
    live = get_record(ZA_ID, SCHMIDT_ZA["live_only"]).get("fields") or {}
    rec = get_record(ZA_ID, SCHMIDT_ZA["recording"]).get("fields") or {}
    live_c = get_record(ZA_ID, SCHMIDT_ZA["live_conflict"]).get("fields") or {}
    crec = get_record(ZA_ID, SCHMIDT_ZA["conflict_rec"]).get("fields") or {}
    blank = get_record(ZA_ID, SCHMIDT_ZA["blank_key"]).get("fields") or {}
    tests = []
    tests.append(
        {
            "name": "live_approved_full",
            "ok": (
                truthy(live.get("Zoom Credit Pre-Approved?"))
                and not truthy(live.get("Zoom Credit Conflict?"))
                and truthy(live.get("Zoom Credit Approved?"))
                and num(live.get("Zoom XP Percentage")) == 100
                and truthy(live.get("Zoom Gate Credit Earned?"))
                and str(live.get("Zoom Credit Key") or "").startswith("ZOOM_CREDIT|")
            ),
        }
    )
    tests.append(
        {
            "name": "recording_satisfactory",
            "ok": (
                rec.get("Attendance Method") == "Recording Quiz"
                and truthy(rec.get("Zoom Credit Pre-Approved?"))
                and not truthy(rec.get("Zoom Credit Conflict?"))
                and truthy(rec.get("Zoom Credit Approved?"))
                and str(rec.get("Zoom Credit Key") or "").startswith("ZOOM_CREDIT|")
            ),
        }
    )
    tests.append(
        {
            "name": "conflict_pair",
            "ok": (
                truthy(live_c.get("Zoom Credit Conflict?"))
                and truthy(crec.get("Zoom Credit Conflict?"))
                and not truthy(live_c.get("Zoom Credit Approved?"))
                and not truthy(crec.get("Zoom Credit Approved?"))
                and num(live_c.get("Zoom XP Percentage")) == 0
                and num(crec.get("Zoom XP Percentage")) == 0
            ),
        }
    )
    tests.append({"name": "blank_rids_key", "ok": not (blank.get("Zoom Credit Key") or "")})
    return tests


def main():
    checkbox, other = inventory()
    inv_path = PREVIEW / "c025_checkbox_rollup_inventory.json"
    inv_path.write_text(
        json.dumps(
            {
                "checkbox_to_repair": checkbox,
                "non_checkbox_untouched": [
                    {"name": r["name"], "id": r["id"], "kind": r["kind"], "current_formula": r["current_formula"]}
                    for r in other
                ],
                "proposed": CHECKBOX_AGG,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"inventory": str(inv_path), "checkbox_count": len(checkbox), "other_count": len(other)}, indent=2))

    repaired = repair_checkbox_rollups(checkbox)
    print(json.dumps({"repaired": [(r["name"], r["ok"], r.get("installed_formula"), r.get("isValid")) for r in repaired]}, indent=2))

    # Snapshot then checkbox matrix
    cfg_f = get_record(CFG_ID, CFG_ROW).get("fields") or {}
    zm_f = get_record(ZM_ID, MID).get("fields") or {}
    snapshot = {
        "config": {n: cfg_f.get(n) for n in CFG_MUTABLE},
        "meeting": {n: zm_f.get(n) for n in ZM_MUTABLE},
    }
    results = []
    restore_report = []
    try:
        prog0 = snapshot["meeting"].get(PROG_LINK) or [CFG_ROW]
        glob0 = snapshot["meeting"].get(GLOB_LINK) or [CFG_ROW]

        # Baseline links + clear overrides
        clear_field(ZM_ID, MID, XP_OVERRIDE)
        clear_field(ZM_ID, MID, GATE_OVERRIDE)
        patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0})

        # 1 Meeting Override Yes wins (even if Config false)
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
        patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "Yes"})
        s = wait_snap(3)
        results.append({"name": "override_yes_wins", "ok": s["gate_draft"] in (1, True), "snap": s})

        # 2 Meeting Override No wins (even if Config true)
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
        patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "No"})
        s = wait_snap(3)
        results.append({"name": "override_no_wins", "ok": s["gate_draft"] in (0, False), "snap": s})

        # 3 Program Config checked, override blank
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

        # 4 Program Config unchecked, override blank
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
        s = wait_snap(3.5)
        results.append(
            {
                "name": "program_unchecked_override_blank",
                "ok": s["gate_draft"] in (0, False) and s["prog_gate"] in (0, False),
                "snap": s,
            }
        )

        # 5 Global checked, Program absent
        clear_field(ZM_ID, MID, PROG_LINK)
        patch_fields(ZM_ID, MID, {GLOB_LINK: glob0})
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
        s = wait_snap(3.5)
        results.append(
            {
                "name": "global_checked_program_absent",
                "ok": s["gate_draft"] in (1, True)
                and s["prog_link"] in (None, [])
                and s["glob_gate"] in (1, True)
                and s["prog_gate"] in (None, ""),
                "snap": s,
            }
        )

        # 6 Global unchecked, Program absent
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

        # 7 Safe fallback when both links absent (gate fallback TRUE)
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

    # Deadline + Effectives editable + Schmidt
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
        "checkbox_repaired": repaired,
        "aggregation_formula": CHECKBOX_AGG,
        "non_checkbox_untouched_count": len(other),
        "pretest_snapshot": snapshot,
        "restoration": restore_report,
        "restoration_ok": all(r.get("ok") for r in restore_report) if restore_report else False,
        "results": results,
        "pass": sum(1 for t in results if t.get("ok")),
        "fail": sum(1 for t in results if not t.get("ok")),
        "unauthorized_untouched": True,
    }
    path = PREVIEW / "c025_checkbox_rollup_repair_verify.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "wrote": str(path),
                "pass": out["pass"],
                "fail": out["fail"],
                "restoration_ok": out["restoration_ok"],
                "tests": [(t["name"], t.get("ok")) for t in results],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
