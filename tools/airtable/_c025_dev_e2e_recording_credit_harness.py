#!/usr/bin/env python3
"""C-025 DEV E2E recording-credit harness (no public Fillout).

Modes:
  plan | offline | live --confirm-write

Live path drives Schmidt recording fixture through Needs Review → Satisfactory
and asserts formula credit outputs. XP Event create via automation is optional
(--allow-xp-create) and OFF by default — paste/run 117c in Airtable for live XP.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get("AIRTABLE_API_TOKEN")
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
DATA = "https://api.airtable.com/v0/appTetnuCZlCZdTCT"
ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"

RECORDING_ZA = "recHkB9aER3vCvBsL"
DEADLINE_ZM = "reczeUT0AJUWMmEOb"
CANVAS_ZM = "rech5YbJNUzBRY6LQ"

MUTABLE = [
    "Attendance Method",
    "Recording Quiz Review Status",
    "Recording Quiz Satisfactory?",
]


def get_record(table, rid):
    r = requests.get(f"{DATA}/{table}/{rid}", headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def patch(table, rid, fields):
    r = requests.patch(f"{DATA}/{table}/{rid}", headers=H, json={"fields": fields, "typecast": True}, timeout=60)
    if not r.ok:
        raise RuntimeError(f"{r.status_code} {r.text[:400]}")
    return r.json()


def truthy(v):
    if v is True or v == 1 or v == "1":
        return True
    if isinstance(v, list) and len(v) == 1:
        return truthy(v[0])
    return False


def first(v):
    if isinstance(v, list):
        return v[0] if v else None
    return v


def offline():
    # Reuse contract helpers
    from tests.test_c025_automation_contracts import can_create_xp, email_decision, zoom_credit_key

    tests = []
    ok, reason = can_create_xp(
        approved=True, conflict=False, xp_amount=20, existing_source_keys=set(), enroll="recE", meeting="recM"
    )
    tests.append({"name": "xp_first", "ok": ok and reason == "ok"})
    ok2, reason2 = can_create_xp(
        approved=True,
        conflict=False,
        xp_amount=20,
        existing_source_keys={zoom_credit_key("recE", "recM")},
        enroll="recE",
        meeting="recM",
    )
    tests.append({"name": "xp_idempotent", "ok": (not ok2) and reason2 == "skipped_exists"})
    eok, ereason, _ = email_decision(None, True, "T", set(), "recE", "recM")
    tests.append({"name": "email_safe_default", "ok": (not eok) and ereason == "skipped_config_missing"})
    return {"pass": sum(1 for t in tests if t["ok"]), "fail": sum(1 for t in tests if not t["ok"]), "tests": tests}


def live(confirm: bool, allow_xp: bool):
    if not confirm:
        return {"error": "pass --confirm-write"}
    snap = {}
    results = []
    za = get_record(ZA, RECORDING_ZA)
    fields = za.get("fields") or {}
    for n in MUTABLE:
        snap[n] = fields.get(n)

    try:
        # Drive intake without Fillout
        patch(
            ZA,
            RECORDING_ZA,
            {
                "Attendance Method": "Recording Quiz",
                "Recording Quiz Review Status": "Needs Review",
                "Recording Quiz Satisfactory?": False,
            },
        )
        time.sleep(2)
        mid = get_record(ZA, RECORDING_ZA).get("fields") or {}
        results.append(
            {
                "name": "needs_review_state",
                "ok": mid.get("Recording Quiz Review Status") == "Needs Review",
                "snap": {
                    "status": mid.get("Recording Quiz Review Status"),
                    "approved": mid.get("Zoom Credit Approved?"),
                },
            }
        )

        patch(
            ZA,
            RECORDING_ZA,
            {
                "Recording Quiz Review Status": "Satisfactory",
                "Recording Quiz Satisfactory?": True,
            },
        )
        time.sleep(3)
        after = get_record(ZA, RECORDING_ZA).get("fields") or {}
        results.append(
            {
                "name": "satisfactory_credit",
                "ok": truthy(after.get("Zoom Credit Approved?"))
                and first(after.get("Zoom XP Percentage")) is not None
                and bool(after.get("Zoom Credit Key")),
                "pct": after.get("Zoom XP Percentage"),
                "amount": after.get("Zoom XP Amount"),
                "gate": after.get("Zoom Gate Credit Earned?"),
                "key": after.get("Zoom Credit Key"),
                "approved": after.get("Zoom Credit Approved?"),
                "eff_xp": after.get("Effective Recording XP Percentage"),
            }
        )

        # Deadline still a date on fixture meeting
        d = (get_record(ZM, DEADLINE_ZM).get("fields") or {}).get("Calculated Recording Quiz Deadline")
        looks = isinstance(d, str) and len(d) >= 8 and d[0:4].isdigit()
        results.append({"name": "deadline_date", "ok": looks, "deadline": d})

        # Canvas meeting effectives still formula values
        canvas = get_record(ZM, CANVAS_ZM).get("fields") or {}
        results.append(
            {
                "name": "effective_xp_formula",
                "ok": canvas.get("Effective Recording XP Percentage") in (50, 50.0),
                "value": canvas.get("Effective Recording XP Percentage"),
            }
        )

        if allow_xp:
            results.append(
                {
                    "name": "xp_create_note",
                    "ok": True,
                    "note": "allow_xp_create set — run 117c in Airtable on this recordId after paste; harness does not call scripting API",
                }
            )
        else:
            results.append(
                {
                    "name": "xp_create_skipped_by_default",
                    "ok": True,
                    "note": "Formulas assert credit readiness; paste 117c for XP Event create",
                }
            )
    finally:
        # restore
        try:
            patch(ZA, RECORDING_ZA, {k: snap.get(k) for k in MUTABLE})
            time.sleep(1.5)
            got = get_record(ZA, RECORDING_ZA).get("fields") or {}
            restore_ok = True
            for k in MUTABLE:
                wanted = snap.get(k)
                g = got.get(k)
                if wanted in (None, False, "") and g in (None, False, ""):
                    continue
                if wanted != g:
                    # checkbox False vs absent
                    if wanted is False and not truthy(g):
                        continue
                    restore_ok = False
            results.append({"name": "restoration_ok", "ok": restore_ok, "snapshot": snap, "after": {k: got.get(k) for k in MUTABLE}})
        except Exception as exc:  # noqa: BLE001
            results.append({"name": "restoration_ok", "ok": False, "error": str(exc)})

    return {
        "results": results,
        "pass": sum(1 for r in results if r.get("ok")),
        "fail": sum(1 for r in results if "ok" in r and not r.get("ok")),
        "allow_xp_create": allow_xp,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["plan", "offline", "live"])
    p.add_argument("--confirm-write", action="store_true")
    p.add_argument("--allow-xp-create", action="store_true")
    args = p.parse_args()
    if args.mode == "plan":
        out = {
            "fixture_za": RECORDING_ZA,
            "steps": [
                "Set Attendance Method=Recording Quiz",
                "Needs Review → Satisfactory",
                "Assert Zoom Credit Approved?/XP%/Gate/Key",
                "Restore mutable fields",
            ],
            "fillout_not_required": True,
        }
    elif args.mode == "offline":
        out = offline()
    else:
        out = live(args.confirm_write, args.allow_xp_create)
    path = PREVIEW / "c025_dev_e2e_recording_credit_harness.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), **{k: out.get(k) for k in ("pass", "fail", "error", "count") if k in out or True}}, default=str, indent=2)[:1500])
    print(json.dumps({"summary": {k: out[k] for k in out if k in ("pass", "fail", "error", "tests", "results")}}, indent=2)[:2000])


if __name__ == "__main__":
    main()
