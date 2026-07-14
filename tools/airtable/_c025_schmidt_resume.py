#!/usr/bin/env python3
"""C-025 resume Schmidt recording + conflict fixtures (reuse existing live row)."""

from __future__ import annotations

import json
import math
import os
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get("AIRTABLE_API_TOKEN") or ""
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
DEV = "appTetnuCZlCZdTCT"
DATA = f"https://api.airtable.com/v0/{DEV}"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"
SCHMIDT = "recgP9qZYjAhE7NXm"
LIVE_EXISTING = "rec9EEtEf3AS5GYCf"


def get(rid):
    r = requests.get(f"{DATA}/{ZA}/{rid}", headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def create(fields):
    r = requests.post(f"{DATA}/{ZA}", headers=H, json={"fields": fields, "typecast": True}, timeout=60)
    if not r.ok:
        raise SystemExit(f"create {r.status_code}: {r.text[:500]}")
    return r.json()


def list_meetings():
    r = requests.get(f"{DATA}/{ZM}", headers=H, params={"pageSize": 20, "maxRecords": 20}, timeout=60)
    r.raise_for_status()
    return r.json().get("records") or []


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


def text(v):
    if v is None:
        return ""
    if isinstance(v, list):
        return ",".join(text(x) for x in v)
    return str(v)


def snap(rec):
    f = rec.get("fields") or {}
    return {
        "id": rec["id"],
        "method": text(f.get("Attendance Method")),
        "pre_approved": truthy(f.get("Zoom Credit Pre-Approved?")),
        "conflict": truthy(f.get("Zoom Credit Conflict?")),
        "approved": truthy(f.get("Zoom Credit Approved?")),
        "pct": num(f.get("Zoom XP Percentage")),
        "xp": num(f.get("Zoom XP Amount")),
        "gate": truthy(f.get("Zoom Gate Credit Earned?")),
        "key": text(f.get("Zoom Credit Key")),
        "normal_xp": num(f.get("Normal Live Zoom XP")),
        "eff_pct": num(f.get("Effective Recording XP Percentage")),
        "eff_gate": truthy(f.get("Effective Recording Counts for Level Gate?")),
        "meeting_tags": text(f.get("Meeting Approved Preconflict Pair Tags")),
        "preconflict_tag": text(f.get("Preconflict Pair Tag")),
        "debug": text(f.get("Zoom Credit Debug"))[:350],
        "meeting_ids": f.get("Zoom Meeting") or [],
    }


def wait(rid, sec=4):
    time.sleep(sec)
    return snap(get(rid))


def check(tests, name, ok, detail):
    tests.append({"name": name, "ok": bool(ok), "detail": detail})


def review_options():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    for t in r.json()["tables"]:
        if t["name"] == "Zoom Attendance":
            for f in t["fields"]:
                if f["name"] == "Recording Quiz Review Status":
                    return [c.get("name") for c in (f.get("options") or {}).get("choices") or []]
    return []


def main():
    tests = []
    created = []
    live0 = snap(get(LIVE_EXISTING))
    m1 = (live0["meeting_ids"] or [None])[0]
    meetings = list_meetings()
    m2 = None
    for m in meetings:
        if m["id"] != m1:
            m2 = m["id"]
            break
    if not m2:
        m2 = m1

    choices = review_options()
    sat = "Satisfactory" if "Satisfactory" in choices else (choices[0] if choices else "Satisfactory")

    # Live baseline (before conflict recording on same meeting)
    ok_live = (
        live0["pre_approved"]
        and not live0["conflict"]
        and live0["approved"]
        and live0["pct"] == 100
        and live0["gate"]
        and live0["xp"] == 40
        and live0["key"].startswith("ZOOM_CREDIT|")
    )
    check(tests, "live_approved_full", ok_live, {"record": live0})

    # Recording on separate meeting
    rec = create(
        {
            "Enrollment": [SCHMIDT],
            "Zoom Meeting": [m2],
            "Attendance Method": "Recording Quiz",
            "Recording Quiz Review Status": sat,
            "Recording Quiz Satisfactory?": True,
            "Normal Live Zoom XP": 40,
        }
    )
    created.append(rec["id"])
    rec_s = wait(rec["id"], 5)
    expected_pct = rec_s["eff_pct"] if rec_s["eff_pct"] is not None else 50
    expected_gate = bool(rec_s["eff_gate"])
    expected_xp = math.floor((rec_s["normal_xp"] or 0) * expected_pct / 100)
    ok_rec = (
        rec_s["pre_approved"]
        and not rec_s["conflict"]
        and rec_s["approved"]
        and rec_s["pct"] == expected_pct
        and rec_s["gate"] == expected_gate
        and rec_s["xp"] == expected_xp
        and rec_s["key"].startswith("ZOOM_CREDIT|")
    )
    check(
        tests,
        "recording_satisfactory",
        ok_rec,
        {
            "record": rec_s,
            "expected_pct": expected_pct,
            "expected_gate": expected_gate,
            "expected_xp": expected_xp,
            "m2": m2,
            "m1": m1,
            "same_meeting": m1 == m2,
        },
    )

    # Conflict: recording on same meeting as live
    if m1 == m2:
        # already on same meeting via recording above
        conflict_rec_id = rec["id"]
    else:
        crec = create(
            {
                "Enrollment": [SCHMIDT],
                "Zoom Meeting": [m1],
                "Attendance Method": "Recording Quiz",
                "Recording Quiz Review Status": sat,
                "Recording Quiz Satisfactory?": True,
                "Normal Live Zoom XP": 40,
            }
        )
        created.append(crec["id"])
        conflict_rec_id = crec["id"]

    time.sleep(6)
    conflict_live = wait(LIVE_EXISTING, 2)
    conflict_rec = wait(conflict_rec_id, 2)
    both = True
    for r in (conflict_live, conflict_rec):
        if not (
            r["conflict"]
            and not r["approved"]
            and r["pct"] == 0
            and (r["xp"] in (0, None))
            and not r["gate"]
        ):
            both = False
    check(tests, "conflict_pair", both, {"live": conflict_live, "recording": conflict_rec})

    orphan = create({"Attendance Method": "Live", "Live Attendance Confirmed?": True})
    created.append(orphan["id"])
    orphan_s = wait(orphan["id"], 2)
    check(tests, "blank_rids_key", orphan_s["key"] == "", {"record": orphan_s})

    # View existence
    za_meta = requests.get(f"{META}/tables", headers=H, timeout=120).json()["tables"]
    za = next(t for t in za_meta if t["name"] == "Zoom Attendance")
    view_name = "Zoom Recording Quiz — Past Deadline"
    view = next((v for v in (za.get("views") or []) if v.get("name") == view_name), None)
    # Also check marker field from earlier inspect
    marker = next((f for f in za.get("fields") or [] if "Past Deadline" in f.get("name", "")), None)

    report = {
        "created": created,
        "live_existing": LIVE_EXISTING,
        "tests": tests,
        "pass": sum(1 for t in tests if t["ok"]),
        "fail": sum(1 for t in tests if not t["ok"]),
        "total": len(tests),
        "view": {"found": bool(view), "view": view, "marker_field": marker.get("name") if marker else None},
        "review_options": choices,
    }
    PREVIEW.joinpath("c025_schmidt_verify.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"pass": report["pass"], "fail": report["fail"], "total": report["total"], "tests": [(t["name"], t["ok"]) for t in tests], "view": report["view"], "created": created}, indent=2))


if __name__ == "__main__":
    main()
