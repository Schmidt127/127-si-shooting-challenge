#!/usr/bin/env python3
"""C-025 DEV Config-linkage verification.

Modes:
  plan     — print live test plan (no Airtable calls)
  offline  — run precedence unit checks + syntax helpers (no Airtable)
  live     — REQUIRES --confirm-write (Mike authorization)

Live rules:
  - Snapshot every field that may be written BEFORE any mutation
  - Guaranteed restore via try/finally from that snapshot
  - Draft formula fields are read-only (assertions only)
  - Never convert Effective* fields
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from _c025_config_linkage_apply import (
    CFG_2025,
    CFG_ID,
    MEETINGS,
    SETTINGS,
    ZA_ID,
    ZM_ID,
    build_effective_formula,
    checkbox_truthy,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

TEST_MEETING_CANVAS = "rech5YbJNUzBRY6LQ"
CFG_ROW = CFG_2025

SCHMIDT_ZA = {
    "live_only": "recRIu3ld00t9AKKR",
    "live_conflict": "rec9EEtEf3AS5GYCf",
    "recording": "recHkB9aER3vCvBsL",
    "conflict_rec": "rec2GKdH8UURJIy09",
    "blank_key": "recqddsE2Okt8gdQP",
}
ZM_DEADLINE_FIXTURE = "reczeUT0AJUWMmEOb"

# Exact fields live mode may mutate
CFG_MUTABLE = [
    "Zoom Recording XP Percent of Live",
    "Recording Gives Full Zoom Gate Credit?",
]
ZM_MUTABLE = [
    "Recording XP Percentage — Meeting Override",
    "Full Gate Credit — Meeting Override",
    "Config (Program Scope)",
    "Config (Global Scope)",
]

EFFECTIVE_NAMES = [s["effective"] for s in SETTINGS]
DRAFT_NAMES = [f"{s['effective']} (Config formula draft)" for s in SETTINGS]

XP_OVERRIDE = "Recording XP Percentage — Meeting Override"
XP_DRAFT = "Effective Recording XP Percentage (Config formula draft)"
GATE_OVERRIDE = "Full Gate Credit — Meeting Override"
GATE_DRAFT = "Effective Recording Counts for Level Gate? (Config formula draft)"
PROG_LINK = "Config (Program Scope)"
GLOB_LINK = "Config (Global Scope)"
CFG_XP = "Zoom Recording XP Percent of Live"
CFG_GATE = "Recording Gives Full Zoom Gate Credit?"


def first(v):
    if isinstance(v, list):
        return v[0] if v else None
    return v


def resolve_expected(meeting_fields: dict, s: dict):
    ov = meeting_fields.get(s["override"])
    if s["kind"] == "checkbox":
        if ov == "Yes":
            return True
        if ov == "No":
            return False
    else:
        if ov not in (None, ""):
            return ov

    prog = first(meeting_fields.get(f"Program Config: {s['rollup_label']}"))
    if prog not in (None, ""):
        if s["kind"] == "checkbox":
            return checkbox_truthy(prog)
        return prog

    glob = first(meeting_fields.get(f"Global Config: {s['rollup_label']}"))
    if glob not in (None, ""):
        if s["kind"] == "checkbox":
            return checkbox_truthy(glob)
        return glob

    return s["fallback"]


def offline_precedence_unit_tests() -> list[dict]:
    s = SETTINGS[0]
    tests = []
    fields = {
        s["override"]: 10,
        f"Program Config: {s['rollup_label']}": 25,
        f"Global Config: {s['rollup_label']}": 40,
    }
    got = resolve_expected(fields, s)
    tests.append({"name": "override_wins", "ok": got == 10, "expected": 10, "got": got})

    fields = {
        f"Program Config: {s['rollup_label']}": 25,
        f"Global Config: {s['rollup_label']}": 40,
    }
    got = resolve_expected(fields, s)
    tests.append({"name": "program_wins", "ok": got == 25, "expected": 25, "got": got})

    fields = {f"Global Config: {s['rollup_label']}": 40}
    got = resolve_expected(fields, s)
    tests.append({"name": "global_wins", "ok": got == 40, "expected": 40, "got": got})

    got = resolve_expected({}, s)
    tests.append({"name": "fallback_50", "ok": got == 50, "expected": 50, "got": got})

    gate = next(x for x in SETTINGS if x["key"] == "gate")
    got = resolve_expected({gate["override"]: "Yes", f"Program Config: {gate['rollup_label']}": 0}, gate)
    tests.append({"name": "checkbox_override_yes", "ok": got is True, "expected": True, "got": got})
    got = resolve_expected({gate["override"]: "No", f"Program Config: {gate['rollup_label']}": 1}, gate)
    tests.append({"name": "checkbox_override_no", "ok": got is False, "expected": False, "got": got})
    got = resolve_expected({f"Program Config: {gate['rollup_label']}": 0}, gate)
    tests.append({"name": "checkbox_config_unchecked", "ok": got is False, "expected": False, "got": got})

    for setting in SETTINGS:
        formula = build_effective_formula(setting)
        ok = bool(formula) and setting["override"] in formula and "BLANK()" in formula
        tests.append({"name": f"formula_shape_{setting['key']}", "ok": ok, "len": len(formula)})
    return tests


def live_test_plan() -> dict:
    return {
        "writes_allowed_only_with": "--confirm-write",
        "base": "appTetnuCZlCZdTCT",
        "records_modified": [
            {
                "table": "Config",
                "table_id": CFG_ID,
                "record_id": CFG_ROW,
                "fields": CFG_MUTABLE,
            },
            {
                "table": "Zoom Meetings",
                "table_id": ZM_ID,
                "record_id": TEST_MEETING_CANVAS,
                "fields": ZM_MUTABLE,
            },
        ],
        "restoration": "try/finally from pre-test snapshot (exact original values)",
        "will_not_do": [
            "convert Effective*",
            "write draft formulas",
            "delete fields",
            "117a-f",
            "C-027",
            "PROD",
        ],
    }


def cmd_offline() -> int:
    tests = offline_precedence_unit_tests()
    out = {
        "mode": "offline",
        "airtable_writes": False,
        "unit_tests": tests,
        "pass": sum(1 for t in tests if t["ok"]),
        "fail": sum(1 for t in tests if not t["ok"]),
        "total": len(tests),
        "live_plan": live_test_plan(),
    }
    path = PREVIEW / "c025_config_linkage_verify_offline.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "pass": out["pass"], "fail": out["fail"], "total": out["total"], "airtable_writes": False}, indent=2))
    return 0 if out["fail"] == 0 else 1


def cmd_plan() -> int:
    plan = live_test_plan()
    path = PREVIEW / "c025_config_linkage_verify_plan.json"
    path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "plan": plan}, indent=2))
    return 0


def values_equal(a: Any, b: Any) -> bool:
    """Compare Airtable values allowing list link order and checkbox 0/1."""
    if a is None and b in (None, False, 0, ""):
        # clearing unchecked checkbox vs missing — treat carefully
        if b is False or b == 0:
            return a in (None, False, 0)
        return a in (None, "")
    if b is None and a in (None, False, 0, ""):
        if a is False or a == 0:
            return b in (None, False, 0)
        return b in (None, "")
    if isinstance(a, list) and isinstance(b, list):
        return sorted(map(str, a)) == sorted(map(str, b))
    if checkbox_truthy(a) or checkbox_truthy(b) or a in (0, False) or b in (0, False):
        if a in (None, "", False, 0, True, 1, "1") and b in (None, "", False, 0, True, 1, "1"):
            return checkbox_truthy(a) == checkbox_truthy(b)
    return a == b


def cmd_live(confirm_write: bool, also_sync_effectives: bool) -> int:
    if not confirm_write:
        print(json.dumps({"error": "live mode refused — pass --confirm-write after Mike approval", "airtable_writes": False}, indent=2))
        return 2

    if also_sync_effectives:
        print(json.dumps({"error": "--also-sync-effectives refused for this approved run (Effectives read-only / no sync)", "airtable_writes": False}, indent=2))
        return 2

    import requests
    from dotenv import dotenv_values
    from _c025_config_linkage_apply import get_record, tables, field_by_name

    token = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get("AIRTABLE_API_TOKEN")
    if not token:
        print(json.dumps({"error": "missing Airtable token"}, indent=2))
        return 2
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = f"https://api.airtable.com/v0/appTetnuCZlCZdTCT"
    meta = f"https://api.airtable.com/v0/meta/bases/appTetnuCZlCZdTCT"
    mid = TEST_MEETING_CANVAS
    results: list[dict] = []
    restore_report: list[dict] = []
    snapshot: dict[str, Any] = {"config": {}, "meeting": {}, "logged_at": None}
    wrote_anything = False

    def patch_fields(table_id: str, rid: str, fields: dict) -> dict:
        nonlocal wrote_anything
        # Drop keys whose value is a sentinel? Keep None for clear.
        body = {"fields": fields, "typecast": True}
        r = requests.patch(f"{data}/{table_id}/{rid}", headers=h, json=body, timeout=60)
        if not r.ok:
            raise RuntimeError(f"PATCH {table_id}/{rid} {r.status_code}: {r.text[:500]}")
        wrote_anything = True
        return r.json()

    def clear_or_set(table_id: str, rid: str, field_name: str, value: Any) -> None:
        # Airtable clears with null
        patch_fields(table_id, rid, {field_name: value})

    def restore_from_snapshot() -> list[dict]:
        """Best-effort restore every snapshotted field. Errors recorded, not swallowed silently."""
        report = []
        # Config
        cfg_patch = {}
        for name in CFG_MUTABLE:
            cfg_patch[name] = snapshot["config"].get(name)
        try:
            if cfg_patch:
                patch_fields(CFG_ID, CFG_ROW, cfg_patch)
            time.sleep(1.5)
            after = get_record(CFG_ID, CFG_ROW).get("fields") or {}
            for name in CFG_MUTABLE:
                ok = values_equal(after.get(name), snapshot["config"].get(name))
                report.append(
                    {
                        "table": "Config",
                        "record": CFG_ROW,
                        "field": name,
                        "wanted": snapshot["config"].get(name),
                        "got": after.get(name),
                        "ok": ok,
                    }
                )
        except Exception as exc:  # noqa: BLE001
            report.append({"table": "Config", "record": CFG_ROW, "error": str(exc), "ok": False})

        # Meeting — clearables may need null
        try:
            zm_patch = {}
            for name in ZM_MUTABLE:
                zm_patch[name] = snapshot["meeting"].get(name)
            patch_fields(ZM_ID, mid, zm_patch)
            time.sleep(1.5)
            after = get_record(ZM_ID, mid).get("fields") or {}
            for name in ZM_MUTABLE:
                wanted = snapshot["meeting"].get(name)
                got = after.get(name)
                # link blank: API may omit key
                if wanted in (None, []) and got in (None, [], ""):
                    ok = True
                else:
                    ok = values_equal(got, wanted)
                report.append(
                    {
                        "table": "Zoom Meetings",
                        "record": mid,
                        "field": name,
                        "wanted": wanted,
                        "got": got,
                        "ok": ok,
                    }
                )
        except Exception as exc:  # noqa: BLE001
            report.append({"table": "Zoom Meetings", "record": mid, "error": str(exc), "ok": False})
        return report

    def snap_xp(wait: float = 2.5) -> dict:
        time.sleep(wait)
        f = get_record(ZM_ID, mid).get("fields") or {}
        return {
            "override": f.get(XP_OVERRIDE),
            "prog_link": f.get(PROG_LINK),
            "glob_link": f.get(GLOB_LINK),
            "prog_rollup": first(f.get("Program Config: Recording XP %")),
            "glob_rollup": first(f.get("Global Config: Recording XP %")),
            "effective": f.get("Effective Recording XP Percentage"),
            "draft": first(f.get(XP_DRAFT)),
            "gate_draft": first(f.get(GATE_DRAFT)),
            "gate_override": f.get(GATE_OVERRIDE),
        }

    # ---- Preflight: schema ----
    ts = tables()
    zm_missing = []
    for name in ZM_MUTABLE + [XP_DRAFT, GATE_DRAFT] + EFFECTIVE_NAMES[:3]:
        if not field_by_name(ZM_ID, name, ts):
            zm_missing.append(name)
    for name in CFG_MUTABLE:
        if not field_by_name(CFG_ID, name, ts):
            zm_missing.append(f"Config.{name}")

    editable_ok = True
    effectives_types = {}
    for name in EFFECTIVE_NAMES:
        f = field_by_name(ZM_ID, name, ts)
        if not f:
            editable_ok = False
            effectives_types[name] = None
            continue
        effectives_types[name] = f.get("type")
        if f.get("type") == "formula":
            editable_ok = False

    draft_readonly_check = {}
    for name in DRAFT_NAMES:
        f = field_by_name(ZM_ID, name, ts)
        draft_readonly_check[name] = {
            "present": bool(f),
            "type": (f or {}).get("type"),
            "will_write": False,
        }

    if zm_missing:
        print(json.dumps({"error": "required fields missing — refuse live run", "missing": zm_missing}, indent=2))
        return 2
    if not editable_ok:
        print(json.dumps({"error": "Effective* not all editable — refuse (would not convert; schema unexpected)", "types": effectives_types}, indent=2))
        return 2

    # ---- Snapshot originals (required before writes) ----
    try:
        cfg_rec = get_record(CFG_ID, CFG_ROW)
        zm_rec = get_record(ZM_ID, mid)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": "required record GET failed — refuse live run", "detail": str(exc)}, indent=2))
        return 2

    cfg_f = cfg_rec.get("fields") or {}
    zm_f = zm_rec.get("fields") or {}
    for name in CFG_MUTABLE:
        snapshot["config"][name] = cfg_f.get(name)
    for name in ZM_MUTABLE:
        snapshot["meeting"][name] = zm_f.get(name)
    snapshot["logged_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Refuse if critical snapshots empty for links (tests assume links exist or we restore blanks)
    print(json.dumps({"pretest_snapshot": snapshot, "effectives_still_editable": effectives_types, "drafts_read_only": draft_readonly_check}, indent=2))

    restoration_error = None
    try:
        try:
            # Baseline canvas from snapshot links; clear XP/Gate overrides for tier tests
            clear_or_set(ZM_ID, mid, XP_OVERRIDE, None)
            clear_or_set(ZM_ID, mid, GATE_OVERRIDE, None)
            # Ensure program link for program test (use original if present else CFG_ROW)
            prog0 = snapshot["meeting"].get(PROG_LINK) or [CFG_ROW]
            glob0 = snapshot["meeting"].get(GLOB_LINK) or [CFG_ROW]
            patch_fields(ZM_ID, mid, {PROG_LINK: prog0, GLOB_LINK: glob0})
            patch_fields(CFG_ID, CFG_ROW, {CFG_XP: 40, CFG_GATE: True})

            # 2) Program Config when override blank (Global also linked same row is OK)
            s_prog = snap_xp()
            results.append(
                {
                    "name": "program_config_applies_override_blank",
                    "ok": s_prog["draft"] == 40 and s_prog["override"] in (None, ""),
                    "snap": s_prog,
                }
            )

            # 1) Override wins
            patch_fields(ZM_ID, mid, {XP_OVERRIDE: 10})
            s_ov = snap_xp()
            results.append({"name": "override_wins_over_program", "ok": s_ov["draft"] == 10, "snap": s_ov})

            # clear override → back to program/config 40
            clear_or_set(ZM_ID, mid, XP_OVERRIDE, None)
            s_back = snap_xp()
            results.append({"name": "clear_override_back_to_program", "ok": s_back["draft"] == 40, "snap": s_back})

            # 3) Global only — Program absent, Global present
            clear_or_set(ZM_ID, mid, PROG_LINK, None)
            patch_fields(ZM_ID, mid, {GLOB_LINK: glob0 if glob0 else [CFG_ROW]})
            patch_fields(CFG_ID, CFG_ROW, {CFG_XP: 40})
            s_glob = snap_xp(3.0)
            results.append(
                {
                    "name": "global_config_when_program_absent",
                    "ok": s_glob["draft"] == 40 and s_glob["prog_link"] in (None, []) and bool(s_glob["glob_link"]),
                    "snap": s_glob,
                }
            )

            # 4) Fallback — both links absent
            clear_or_set(ZM_ID, mid, PROG_LINK, None)
            clear_or_set(ZM_ID, mid, GLOB_LINK, None)
            s_fb = snap_xp(3.0)
            results.append(
                {
                    "name": "safe_fallback_50",
                    "ok": s_fb["draft"] == 50 and s_fb["prog_link"] in (None, []) and s_fb["glob_link"] in (None, []),
                    "snap": s_fb,
                }
            )

            # Checkbox: Config unchecked must win over fallback true
            patch_fields(ZM_ID, mid, {PROG_LINK: prog0, GLOB_LINK: glob0})
            clear_or_set(ZM_ID, mid, GATE_OVERRIDE, None)
            patch_fields(CFG_ID, CFG_ROW, {CFG_GATE: False})
            time.sleep(3)
            s_gate = snap_xp(0.5)
            results.append(
                {
                    "name": "checkbox_config_unchecked_not_fallback",
                    "ok": s_gate["gate_draft"] in (0, False),
                    "snap": s_gate,
                }
            )
        except Exception as exc:  # noqa: BLE001
            results.append({"name": "live_matrix_exception", "ok": False, "error": str(exc)})
    finally:
        # Guaranteed restoration — even on assertion/read/write/exception
        try:
            restore_report = restore_from_snapshot()
            results.append(
                {
                    "name": "restored_config_and_meeting",
                    "ok": all(r.get("ok") for r in restore_report if "field" in r),
                    "details": restore_report,
                }
            )
        except Exception as exc:  # noqa: BLE001
            restoration_error = str(exc)
            results.append({"name": "restored_config_and_meeting", "ok": False, "error": restoration_error})

    # Post-restore GETs (outside mutation try; after finally)
    # 5 & 6 already covered in restore report; re-assert equality
    try:
        cfg_after = get_record(CFG_ID, CFG_ROW).get("fields") or {}
        zm_after = get_record(ZM_ID, mid).get("fields") or {}
        cfg_ok = all(values_equal(cfg_after.get(n), snapshot["config"].get(n)) for n in CFG_MUTABLE)
        zm_ok = True
        for n in ZM_MUTABLE:
            wanted = snapshot["meeting"].get(n)
            got = zm_after.get(n)
            if wanted in (None, []) and got in (None, [], ""):
                continue
            if not values_equal(got, wanted):
                zm_ok = False
        results.append({"name": "post_restore_config_equals_pretest", "ok": cfg_ok, "snapshot": snapshot["config"], "after": {n: cfg_after.get(n) for n in CFG_MUTABLE}})
        results.append({"name": "post_restore_meeting_equals_pretest", "ok": zm_ok, "snapshot": snapshot["meeting"], "after": {n: zm_after.get(n) for n in ZM_MUTABLE}})
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "post_restore_recheck", "ok": False, "error": str(exc)})

    # Deadline
    try:
        dval = (get_record(ZM_ID, ZM_DEADLINE_FIXTURE).get("fields") or {}).get("Calculated Recording Quiz Deadline")
        looks_date = isinstance(dval, str) and len(dval) >= 8 and dval[0:4].isdigit()
        if isinstance(dval, list) and dval:
            looks_date = isinstance(dval[0], str) and dval[0][0:4].isdigit()
        results.append({"name": "deadline_still_date", "ok": looks_date, "deadline": dval})
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "deadline_still_date", "ok": False, "error": str(exc)})

    # Effectives still editable (meta re-check)
    try:
        ts2 = tables()
        still = {}
        all_edit = True
        for name in EFFECTIVE_NAMES:
            f = field_by_name(ZM_ID, name, ts2)
            t = (f or {}).get("type")
            still[name] = t
            if t == "formula" or not f:
                all_edit = False
        results.append({"name": "effectives_remain_editable", "ok": all_edit, "types": still})
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "effectives_remain_editable", "ok": False, "error": str(exc)})

    # Schmidt 4/4
    def truthy(v):
        if v is True or v == 1 or v == "1":
            return True
        if isinstance(v, list) and len(v) == 1:
            return truthy(v[0])
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

    credit_tests = []
    try:
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
        credit_tests.append({"name": "live_approved_full", "ok": live_ok, "record": SCHMIDT_ZA["live_only"]})

        rec_ok = (
            rec.get("Attendance Method") == "Recording Quiz"
            and truthy(rec.get("Zoom Credit Pre-Approved?"))
            and not truthy(rec.get("Zoom Credit Conflict?"))
            and truthy(rec.get("Zoom Credit Approved?"))
            and str(rec.get("Zoom Credit Key") or "").startswith("ZOOM_CREDIT|")
        )
        credit_tests.append({"name": "recording_satisfactory", "ok": rec_ok, "record": SCHMIDT_ZA["recording"], "pct": num(rec.get("Zoom XP Percentage"))})

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
        credit_tests.append({"name": "blank_rids_key", "ok": blank_ok, "key": blank.get("Zoom Credit Key")})

        results.append(
            {
                "name": "schmidt_credit_4_of_4",
                "ok": all(t["ok"] for t in credit_tests),
                "tests": credit_tests,
            }
        )
    except Exception as exc:  # noqa: BLE001
        results.append({"name": "schmidt_credit_4_of_4", "ok": False, "error": str(exc)})

    out = {
        "mode": "live",
        "confirm_write": True,
        "pretest_snapshot": snapshot,
        "effectives_pre_types": effectives_types,
        "drafts_read_only": True,
        "wrote_anything": wrote_anything,
        "restoration": restore_report,
        "restoration_error": restoration_error,
        "results": results,
        "pass": sum(1 for t in results if t.get("ok")),
        "fail": sum(1 for t in results if not t.get("ok")),
        "unauthorized_systems_untouched": {
            "PROD": True,
            "Make": True,
            "Vercel": True,
            "AWS": True,
            "emails": True,
            "XP_Event_creates": True,
            "Effective_conversion": True,
            "117a_f": True,
            "C-027": True,
        },
    }
    path = PREVIEW / "c025_config_linkage_verify_live.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "wrote": str(path),
                "pass": out["pass"],
                "fail": out["fail"],
                "tests": [(t["name"], t.get("ok")) for t in results],
                "restoration_ok": all(r.get("ok", False) for r in restore_report if "field" in r) if restore_report else False,
            },
            indent=2,
        )
    )
    return 0 if out["fail"] == 0 else 1


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="C-025 Config linkage verify")
    p.add_argument("mode", choices=["plan", "offline", "live"])
    p.add_argument("--confirm-write", action="store_true")
    p.add_argument("--also-sync-effectives", action="store_true")
    args = p.parse_args(argv)
    if args.mode == "plan":
        return cmd_plan()
    if args.mode == "offline":
        return cmd_offline()
    return cmd_live(args.confirm_write, args.also_sync_effectives)


if __name__ == "__main__":
    raise SystemExit(main())
