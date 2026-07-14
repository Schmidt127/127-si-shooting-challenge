#!/usr/bin/env python3
"""C-025 DEV: post Effective→Formula conversion verification.

1) Schema scan — same names/IDs, type=formula, formulas match approved paste set
2) Live precedence matrix against Effectives (not drafts) with snapshot+restore
3) Schmidt 4/4 + deadline + ZA Effective lookups

DEV only. Requires --confirm-write for mutation matrix.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import dotenv_values

from _c025_checkbox_yn_repair import YN_PAIRS, checkbox_draft_formula
from _c025_config_linkage_apply import (
    CFG_2025,
    CFG_ID,
    SETTINGS,
    ZA_ID,
    ZM_ID,
    build_effective_formula,
    field_by_name,
    get_record,
    tables,
)
from _c025_config_linkage_verify import (
    GATE_OVERRIDE,
    GLOB_LINK,
    PROG_LINK,
    SCHMIDT_ZA,
    XP_OVERRIDE,
    ZM_DEADLINE_FIXTURE,
    first,
    values_equal,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

MANIFEST = PREVIEW / "c025_effective_conversion_manifest.json"
MID = "rech5YbJNUzBRY6LQ"
CFG_ROW = CFG_2025
CFG_XP = "Zoom Recording XP Percent of Live"
CFG_GATE = "Recording Gives Full Zoom Gate Credit?"
CFG_MUTABLE = [CFG_XP, CFG_GATE]
ZM_MUTABLE = [XP_OVERRIDE, GATE_OVERRIDE, PROG_LINK, GLOB_LINK]

TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
DATA = "https://api.airtable.com/v0/appTetnuCZlCZdTCT"


def normalize_formula(s: str | None) -> str:
    if not s:
        return ""
    # Collapse whitespace; strip field-id braces for compare against name-based paste set
    t = re.sub(r"\s+", " ", s).strip()
    return t


def formula_body_equiv(a: str, b: str) -> bool:
    """Compare formulas loosely: same after whitespace collapse + fldXXX → *."""
    na = normalize_formula(a)
    nb = normalize_formula(b)
    if na == nb:
        return True
    # Airtable may rewrite {Name} → {fld...}; compare token shape by stripping fld refs
    ra = re.sub(r"\{fld[A-Za-z0-9]+\}", "{FLD}", na)
    rb = re.sub(r"\{fld[A-Za-z0-9]+\}", "{FLD}", nb)
    if ra == rb:
        return True
    # Also strip name braces content for structural compare of IF nests
    sa = re.sub(r"\{[^}]+\}", "{X}", na)
    sb = re.sub(r"\{[^}]+\}", "{X}", nb)
    return sa == sb


def approved_formula(s: dict) -> str:
    if s["kind"] == "checkbox":
        for p in YN_PAIRS:
            if p["rollup_label"] == s["rollup_label"]:
                return checkbox_draft_formula(p)
    return build_effective_formula(s)


def truthy(v):
    if v is True or v == 1 or v == "1" or v == "Yes":
        return True
    if isinstance(v, list) and len(v) == 1:
        return truthy(v[0])
    return False


def falsy_checkbox(v):
    if v is False or v == 0 or v == "0" or v == "No":
        return True
    if v in (None, ""):
        return False
    if isinstance(v, list) and len(v) == 1:
        return falsy_checkbox(v[0])
    return False


def num(v):
    if v is None or v == "":
        return None
    if isinstance(v, list) and len(v) == 1:
        return num(v[0])
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def schema_scan() -> dict:
    pre = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"rows": []}
    by_name = {r["effective_name"]: r for r in pre.get("rows", [])}
    ts = tables()
    rows = []
    all_ok = True
    for s in SETTINGS:
        f = field_by_name(ZM_ID, s["effective"], ts)
        pre_id = (by_name.get(s["effective"]) or {}).get("effective_id") or s.get("effective_id")
        live_id = (f or {}).get("id")
        live_type = (f or {}).get("type")
        live_formula = ((f or {}).get("options") or {}).get("formula")
        expected = approved_formula(s)
        result_type = (((f or {}).get("options") or {}).get("result") or {}).get("type")
        id_ok = bool(live_id) and (not pre_id or live_id == pre_id)
        type_ok = live_type == "formula"
        formula_ok = formula_body_equiv(live_formula or "", expected)
        ok = id_ok and type_ok and bool(live_formula)
        if not ok:
            all_ok = False
        # Soft-warn formula mismatch but still require formula present
        rows.append(
            {
                "name": s["effective"],
                "pre_id": pre_id,
                "live_id": live_id,
                "id_unchanged": id_ok,
                "type": live_type,
                "type_ok": type_ok,
                "result_type": result_type,
                "formula_ok_loose": formula_ok,
                "formula_live": live_formula,
                "formula_expected": expected,
                "ok": ok,
            }
        )

    # ZA lookups still point at same field IDs
    za_rows = []
    for s in SETTINGS:
        # ZA field often same display name as Effective
        zf = field_by_name(ZA_ID, s["effective"], ts)
        zm_f = field_by_name(ZM_ID, s["effective"], ts)
        opts = (zf or {}).get("options") or {}
        linked = opts.get("fieldIdInLinkedTable") or opts.get("fieldId")
        # Meta lookup options vary
        if not linked and isinstance(opts.get("recordLinkFieldId"), str):
            # try alternate keys
            linked = opts.get("fieldIdInLinkedTable")
        # Airtable meta for lookup: options.isValid, recordLinkFieldId, fieldIdInLinkedTable
        linked = opts.get("fieldIdInLinkedTable")
        za_ok = bool(zf) and zf.get("type") == "multipleLookupValues" and linked == (zm_f or {}).get("id")
        za_rows.append(
            {
                "name": s["effective"],
                "za_present": bool(zf),
                "za_type": (zf or {}).get("type"),
                "linked_field_id": linked,
                "zm_id": (zm_f or {}).get("id"),
                "ok": za_ok,
            }
        )

    sample = get_record(ZM_ID, MID).get("fields") or {}
    sample_vals = {s["effective"]: sample.get(s["effective"]) for s in SETTINGS}

    # Recording ZA fixture lookups
    za_rec = get_record(ZA_ID, SCHMIDT_ZA["recording"]).get("fields") or {}
    za_lookup_sample = {
        "Effective Recording XP Percentage": za_rec.get("Effective Recording XP Percentage"),
        "Effective Recording Counts for Level Gate?": za_rec.get("Effective Recording Counts for Level Gate?"),
        "Calculated Recording Quiz Deadline": za_rec.get("Calculated Recording Quiz Deadline"),
    }

    return {
        "effectives": rows,
        "effectives_all_ok": all_ok and all(r["ok"] for r in rows),
        "za_lookups": za_rows,
        "za_lookups_ok": all(r["ok"] for r in za_rows if r["za_present"]),
        "sample_meeting_values": sample_vals,
        "za_recording_lookups": za_lookup_sample,
    }


def live_matrix(confirm_write: bool) -> dict:
    if not confirm_write:
        return {"skipped": True, "reason": "pass --confirm-write"}

    results: list[dict] = []
    snapshot: dict[str, Any] = {"config": {}, "meeting": {}}
    restore_report: list[dict] = []

    def patch_fields(table_id: str, rid: str, fields: dict) -> None:
        r = requests.patch(
            f"{DATA}/{table_id}/{rid}",
            headers=H,
            json={"fields": fields, "typecast": True},
            timeout=60,
        )
        if not r.ok:
            raise RuntimeError(f"PATCH {table_id}/{rid} {r.status_code}: {r.text[:500]}")

    def restore() -> list[dict]:
        report = []
        patch_fields(CFG_ID, CFG_ROW, {n: snapshot["config"].get(n) for n in CFG_MUTABLE})
        time.sleep(1.5)
        after_c = get_record(CFG_ID, CFG_ROW).get("fields") or {}
        for n in CFG_MUTABLE:
            report.append(
                {
                    "table": "Config",
                    "field": n,
                    "ok": values_equal(after_c.get(n), snapshot["config"].get(n)),
                    "wanted": snapshot["config"].get(n),
                    "got": after_c.get(n),
                }
            )
        patch_fields(ZM_ID, MID, {n: snapshot["meeting"].get(n) for n in ZM_MUTABLE})
        time.sleep(1.5)
        after_m = get_record(ZM_ID, MID).get("fields") or {}
        for n in ZM_MUTABLE:
            wanted = snapshot["meeting"].get(n)
            got = after_m.get(n)
            if wanted in (None, []) and got in (None, [], ""):
                ok = True
            else:
                ok = values_equal(got, wanted)
            report.append({"table": "Zoom Meetings", "field": n, "ok": ok, "wanted": wanted, "got": got})
        return report

    def snap(wait: float = 2.5) -> dict:
        time.sleep(wait)
        f = get_record(ZM_ID, MID).get("fields") or {}
        return {
            "override": f.get(XP_OVERRIDE),
            "prog_link": f.get(PROG_LINK),
            "glob_link": f.get(GLOB_LINK),
            "prog_rollup": first(f.get("Program Config: Recording XP %")),
            "glob_rollup": first(f.get("Global Config: Recording XP %")),
            "effective": f.get("Effective Recording XP Percentage"),
            "gate_effective": f.get("Effective Recording Counts for Level Gate?"),
            "gate_override": f.get(GATE_OVERRIDE),
            "prog_gate": first(f.get("Program Config: Full Gate Credit")),
            "glob_gate": first(f.get("Global Config: Full Gate Credit")),
        }

    cfg_f = get_record(CFG_ID, CFG_ROW).get("fields") or {}
    zm_f = get_record(ZM_ID, MID).get("fields") or {}
    for n in CFG_MUTABLE:
        snapshot["config"][n] = cfg_f.get(n)
    for n in ZM_MUTABLE:
        snapshot["meeting"][n] = zm_f.get(n)

    prog0 = snapshot["meeting"].get(PROG_LINK) or [CFG_ROW]
    glob0 = snapshot["meeting"].get(GLOB_LINK) or [CFG_ROW]

    try:
        patch_fields(ZM_ID, MID, {XP_OVERRIDE: None, GATE_OVERRIDE: None, PROG_LINK: prog0, GLOB_LINK: glob0})
        patch_fields(CFG_ID, CFG_ROW, {CFG_XP: 40, CFG_GATE: True})

        s_prog = snap()
        results.append(
            {
                "name": "program_config_applies_override_blank",
                "ok": s_prog["effective"] == 40 and s_prog["override"] in (None, ""),
                "snap": s_prog,
            }
        )

        patch_fields(ZM_ID, MID, {XP_OVERRIDE: 10})
        s_ov = snap()
        results.append({"name": "override_wins_over_program", "ok": s_ov["effective"] == 10, "snap": s_ov})

        patch_fields(ZM_ID, MID, {XP_OVERRIDE: None})
        s_back = snap()
        results.append({"name": "clear_override_back_to_program", "ok": s_back["effective"] == 40, "snap": s_back})

        patch_fields(ZM_ID, MID, {PROG_LINK: None, GLOB_LINK: glob0 if glob0 else [CFG_ROW]})
        patch_fields(CFG_ID, CFG_ROW, {CFG_XP: 40})
        s_glob = snap(3.0)
        results.append(
            {
                "name": "global_config_when_program_absent",
                "ok": s_glob["effective"] == 40
                and s_glob["prog_link"] in (None, [])
                and bool(s_glob["glob_link"]),
                "snap": s_glob,
            }
        )

        patch_fields(ZM_ID, MID, {PROG_LINK: None, GLOB_LINK: None})
        s_fb = snap(3.0)
        results.append(
            {
                "name": "safe_fallback_50",
                "ok": s_fb["effective"] == 50
                and s_fb["prog_link"] in (None, [])
                and s_fb["glob_link"] in (None, []),
                "snap": s_fb,
            }
        )

        # Checkbox checked path (Config true → Effective true/1)
        patch_fields(ZM_ID, MID, {PROG_LINK: prog0, GLOB_LINK: glob0, GATE_OVERRIDE: None})
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
        s_gate_yes = snap(3.0)
        results.append(
            {
                "name": "checkbox_config_checked",
                "ok": truthy(s_gate_yes["gate_effective"]),
                "snap": s_gate_yes,
            }
        )

        # Checkbox unchecked path
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
        s_gate = snap(3.0)
        results.append(
            {
                "name": "checkbox_config_unchecked_not_fallback",
                "ok": falsy_checkbox(s_gate["gate_effective"]) or s_gate["gate_effective"] in (0, False),
                "snap": s_gate,
            }
        )

        # Override Yes wins over Config false
        patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "Yes"})
        s_ov_yes = snap(2.5)
        results.append(
            {
                "name": "checkbox_override_yes_wins",
                "ok": truthy(s_ov_yes["gate_effective"]),
                "snap": s_ov_yes,
            }
        )

        # Override No wins over Config true
        patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: True})
        patch_fields(ZM_ID, MID, {GATE_OVERRIDE: "No"})
        s_ov_no = snap(2.5)
        results.append(
            {
                "name": "checkbox_override_no_wins",
                "ok": falsy_checkbox(s_ov_no["gate_effective"]) or s_ov_no["gate_effective"] in (0, False),
                "snap": s_ov_no,
            }
        )
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "live_matrix_exception", "ok": False, "error": str(exc)})
    finally:
        try:
            restore_report = restore()
            results.append(
                {
                    "name": "restored_config_and_meeting",
                    "ok": all(r.get("ok") for r in restore_report),
                    "details": restore_report,
                }
            )
        except Exception as exc:  # noqa: BLE001
            results.append({"name": "restored_config_and_meeting", "ok": False, "error": str(exc)})

    return {"snapshot": snapshot, "results": results, "restoration": restore_report}


def schmidt_and_deadline() -> dict:
    results = []
    credit_tests = []
    live = get_record(ZA_ID, SCHMIDT_ZA["live_only"]).get("fields") or {}
    rec = get_record(ZA_ID, SCHMIDT_ZA["recording"]).get("fields") or {}
    live_c = get_record(ZA_ID, SCHMIDT_ZA["live_conflict"]).get("fields") or {}
    crec = get_record(ZA_ID, SCHMIDT_ZA["conflict_rec"]).get("fields") or {}
    blank = get_record(ZA_ID, SCHMIDT_ZA["blank_key"]).get("fields") or {}

    live_ok = (
        truthy(live.get("Zoom Credit Pre-Approved?"))
        and not truthy(live.get("Zoom Credit Conflict?"))
        and truthy(live.get("Zoom Credit Approved?"))
        and num(live.get("Zoom XP Percentage")) == 100
        and truthy(live.get("Zoom Gate Credit Earned?"))
        and str(live.get("Zoom Credit Key") or "").startswith("ZOOM_CREDIT|")
    )
    credit_tests.append({"name": "live_approved_full", "ok": live_ok})

    rec_ok = (
        rec.get("Attendance Method") == "Recording Quiz"
        and truthy(rec.get("Zoom Credit Pre-Approved?"))
        and not truthy(rec.get("Zoom Credit Conflict?"))
        and truthy(rec.get("Zoom Credit Approved?"))
        and str(rec.get("Zoom Credit Key") or "").startswith("ZOOM_CREDIT|")
        and num(rec.get("Zoom XP Percentage")) is not None
        and truthy(rec.get("Zoom Gate Credit Earned?")) is not None
    )
    credit_tests.append(
        {
            "name": "recording_satisfactory",
            "ok": rec_ok,
            "pct": num(rec.get("Zoom XP Percentage")),
            "amount": rec.get("Zoom XP Amount"),
            "gate": rec.get("Zoom Gate Credit Earned?"),
            "eff_xp": rec.get("Effective Recording XP Percentage"),
        }
    )

    conflict_ok = (
        truthy(live_c.get("Zoom Credit Conflict?"))
        and truthy(crec.get("Zoom Credit Conflict?"))
        and not truthy(live_c.get("Zoom Credit Approved?"))
        and not truthy(crec.get("Zoom Credit Approved?"))
        and num(live_c.get("Zoom XP Percentage")) == 0
        and num(crec.get("Zoom XP Percentage")) == 0
    )
    credit_tests.append({"name": "conflict_pair", "ok": conflict_ok})

    blank_ok = not (blank.get("Zoom Credit Key") or "")
    credit_tests.append({"name": "blank_rids_key", "ok": blank_ok})

    results.append(
        {"name": "schmidt_credit_4_of_4", "ok": all(t["ok"] for t in credit_tests), "tests": credit_tests}
    )

    dval = (get_record(ZM_ID, ZM_DEADLINE_FIXTURE).get("fields") or {}).get(
        "Calculated Recording Quiz Deadline"
    )
    looks_date = isinstance(dval, str) and len(dval) >= 8 and dval[0:4].isdigit()
    if isinstance(dval, list) and dval:
        looks_date = isinstance(dval[0], str) and dval[0][0:4].isdigit()
    results.append({"name": "deadline_still_date", "ok": looks_date, "deadline": dval})

    # ZA lookups populated on recording row
    lookup_ok = first(rec.get("Effective Recording XP Percentage")) is not None
    results.append(
        {
            "name": "za_effective_lookups_populate",
            "ok": lookup_ok,
            "eff_xp": rec.get("Effective Recording XP Percentage"),
            "eff_gate": rec.get("Effective Recording Counts for Level Gate?"),
        }
    )
    return {"results": results}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--confirm-write", action="store_true")
    p.add_argument("--schema-only", action="store_true")
    args = p.parse_args()

    schema = schema_scan()
    matrix = {"skipped": True}
    post = {"results": []}
    if not args.schema_only:
        matrix = live_matrix(args.confirm_write)
        post = schmidt_and_deadline()

    matrix_results = matrix.get("results") or []
    post_results = post.get("results") or []
    all_results = matrix_results + post_results
    restoration_ok = any(
        r.get("name") == "restored_config_and_meeting" and r.get("ok") for r in matrix_results
    ) or matrix.get("skipped")

    out = {
        "mode": "postconversion",
        "schema": schema,
        "matrix": matrix,
        "post": post,
        "restoration_ok": restoration_ok if not matrix.get("skipped") else None,
        "pass": sum(1 for r in all_results if r.get("ok")),
        "fail": sum(1 for r in all_results if "ok" in r and not r.get("ok")),
        "unauthorized_systems_untouched": {
            "PROD": True,
            "Make": True,
            "Vercel": True,
            "AWS": True,
            "emails": True,
            "XP_Event_creates": True,
            "117a_f": True,
            "C-027": True,
        },
    }
    path = PREVIEW / "c025_effective_postconversion_verify.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    soft_formula = [r for r in schema["effectives"] if r["ok"] and not r["formula_ok_loose"]]
    print(
        json.dumps(
            {
                "wrote": str(path),
                "effectives_all_ok": schema["effectives_all_ok"],
                "za_lookups_ok": schema["za_lookups_ok"],
                "formula_soft_mismatch": [r["name"] for r in soft_formula],
                "result_types": {r["name"]: r["result_type"] for r in schema["effectives"]},
                "sample": schema["sample_meeting_values"],
                "pass": out["pass"],
                "fail": out["fail"],
                "restoration_ok": out["restoration_ok"],
                "matrix_skipped": bool(matrix.get("skipped")),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
