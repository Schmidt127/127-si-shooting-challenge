#!/usr/bin/env python3
"""C-025: fix rollup formula + create Schmidt DEV fixture rows + verify."""

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
PREVIEW.mkdir(exist_ok=True)

TOKEN = (dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN")
         or dotenv_values(HERE / ".env").get("AIRTABLE_API_TOKEN") or "")
os.environ["AIRTABLE_TOKEN"] = TOKEN
os.environ["AIRTABLE_API_TOKEN"] = TOKEN

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
DATA = f"https://api.airtable.com/v0/{DEV}"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"
ENROLL = "tbl3PFmwbRoabu1YV"
SCHMIDT = "recgP9qZYjAhE7NXm"

CREDIT_FIELDS = [
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
    "Normal Live Zoom XP",
    "Effective Recording XP Percentage",
    "Effective Recording Counts for Level Gate?",
    "Preconflict Pair Tag",
    "Meeting Approved Preconflict Pair Tags",
    "Zoom Credit Debug",
]


def tables():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json()["tables"]


def tby(name):
    for t in tables():
        if t["name"] == name:
            return t
    raise SystemExit(name)


def fby(t, name):
    for f in t.get("fields") or []:
        if f.get("name") == name:
            return f
    return None


def list_records(table_id, fields=None, formula=None, max_records=100):
    params = {"pageSize": 100, "maxRecords": max_records}
    if fields:
        params["fields[]"] = fields
    if formula:
        params["filterByFormula"] = formula
    out, offset = [], None
    while True:
        p = dict(params)
        if offset:
            p["offset"] = offset
        r = requests.get(f"{DATA}/{table_id}", headers=H, params=p, timeout=120)
        r.raise_for_status()
        data = r.json()
        out.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset or len(out) >= max_records:
            break
    return out[:max_records]


def create(table_id, fields):
    r = requests.post(f"{DATA}/{table_id}", headers=H, json={"fields": fields, "typecast": True}, timeout=60)
    if not r.ok:
        raise SystemExit(f"create {r.status_code}: {r.text[:600]}")
    return r.json()


def update(table_id, rid, fields):
    r = requests.patch(
        f"{DATA}/{table_id}/{rid}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"update {r.status_code}: {r.text[:600]}")
    return r.json()


def get(table_id, rid, fields=None):
    # Avoid fields[] on single-record GET (422 intermittent on this base); filter client-side.
    r = requests.get(f"{DATA}/{table_id}/{rid}", headers=H, timeout=60)
    r.raise_for_status()
    rec = r.json()
    if fields:
        f = rec.get("fields") or {}
        rec["fields"] = {k: f[k] for k in fields if k in f}
    return rec


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
        "live_confirmed": truthy(f.get("Live Attendance Confirmed?")),
        "review": text(f.get("Recording Quiz Review Status")),
        "satisfactory": truthy(f.get("Recording Quiz Satisfactory?")),
        "pre_approved": truthy(f.get("Zoom Credit Pre-Approved?")),
        "conflict": truthy(f.get("Zoom Credit Conflict?")),
        "approved": truthy(f.get("Zoom Credit Approved?")),
        "pct": num(f.get("Zoom XP Percentage")),
        "xp": num(f.get("Zoom XP Amount")),
        "gate": truthy(f.get("Zoom Gate Credit Earned?")),
        "key": text(f.get("Zoom Credit Key")),
        "enroll_rid": text(f.get("Enrollment RID")),
        "meeting_rid": text(f.get("Zoom Meeting RID")),
        "normal_xp": num(f.get("Normal Live Zoom XP")),
        "eff_pct": num(f.get("Effective Recording XP Percentage")),
        "eff_gate": truthy(f.get("Effective Recording Counts for Level Gate?")),
        "preconflict_tag": text(f.get("Preconflict Pair Tag")),
        "meeting_tags": text(f.get("Meeting Approved Preconflict Pair Tags")),
        "debug": text(f.get("Zoom Credit Debug"))[:400],
    }


def fix_rollup():
    zm = tby("Zoom Meetings")
    rollup = fby(zm, "Approved Preconflict Pair Tags")
    if not rollup:
        return {"ok": False, "error": "missing rollup"}
    attempts = []
    for body in (
        {"options": {"formula": "ARRAYJOIN(values)"}},
        {
            "options": {
                "recordLinkFieldId": rollup["options"]["recordLinkFieldId"],
                "fieldIdInLinkedTable": rollup["options"]["fieldIdInLinkedTable"],
                "formula": "ARRAYJOIN(values)",
            }
        },
        {"options": {"formula": 'ARRAYJOIN(values, ",")'}},
    ):
        r = requests.patch(
            f"{META}/tables/{zm['id']}/fields/{rollup['id']}",
            headers=H,
            json=body,
            timeout=60,
        )
        attempts.append({"status": r.status_code, "body": r.text[:400], "sent": body})
        if r.ok:
            opts = (r.json() or {}).get("options") or {}
            return {"ok": True, "options": opts, "attempts": attempts}
    # Re-read regardless
    zm = tby("Zoom Meetings")
    rollup = fby(zm, "Approved Preconflict Pair Tags")
    return {"ok": False, "options": (rollup or {}).get("options"), "attempts": attempts}


def review_options():
    za = tby("Zoom Attendance")
    f = fby(za, "Recording Quiz Review Status")
    opts = ((f or {}).get("options") or {}).get("choices") or []
    return [c.get("name") for c in opts]


def pick_meetings():
    # Prefer meetings that already have effective percentage / gate fields writable or present
    fields = [
        "Name",
        "Meeting Name",
        "Effective Recording XP Percentage",
        "Recording XP Percentage",
        "Effective Recording Counts for Level Gate?",
        "RecordId",
    ]
    # discover which exist
    zm = tby("Zoom Meetings")
    names = {f["name"] for f in zm.get("fields") or []}
    use = [f for f in fields if f in names]
    recs = list_records(ZM, fields=use, max_records=20)
    return recs, use, names


def wait_refresh(rid, seconds=3):
    time.sleep(seconds)
    return snap(get(ZA, rid, CREDIT_FIELDS))


def main():
    report = {"rollup_fix": fix_rollup(), "review_options": review_options()}
    meetings, used_fields, zm_names = pick_meetings()
    report["meeting_fields_used"] = used_fields
    report["meetings_sample"] = [
        {"id": m["id"], "fields": m.get("fields")} for m in meetings[:5]
    ]

    if len(meetings) < 1:
        raise SystemExit("no Zoom Meetings in DEV")

    # Prefer two distinct meetings for live-only then conflict on second
    m1 = meetings[0]["id"]
    m2 = meetings[1]["id"] if len(meetings) > 1 else meetings[0]["id"]

    # Ensure meeting-level effective values if those are editable fields on Zoom Meetings
    # If lookups point to fields on meetings that are blank, set them when writable.
    zm = tby("Zoom Meetings")
    writable_sets = []
    for mid in {m1, m2}:
        patch = {}
        # Common meeting field names for effective values (editable numbers/checkboxes)
        for fname, val in (
            ("Effective Recording XP Percentage", 50),
            ("Recording XP Percentage", 50),
            ("Effective Recording Counts for Level Gate?", True),
            ("Recording Counts for Level Gate?", True),
        ):
            f = fby(zm, fname)
            if f and f.get("type") in ("number", "percent", "checkbox"):
                patch[fname] = val
        if patch:
            try:
                update(ZM, mid, patch)
                writable_sets.append({"meeting": mid, "patch": patch, "ok": True})
            except SystemExit as e:
                writable_sets.append({"meeting": mid, "patch": patch, "ok": False, "error": str(e)})
    report["meeting_patches"] = writable_sets

    # Choose Satisfactory option name
    choices = report["review_options"]
    sat = "Satisfactory" if "Satisfactory" in choices else (choices[0] if choices else "Satisfactory")

    created = []
    # 1) Live on m1
    live = create(
        ZA,
        {
            "Enrollment": [SCHMIDT],
            "Zoom Meeting": [m1],
            "Attendance Method": "Live",
            "Live Attendance Confirmed?": True,
            "Normal Live Zoom XP": 40,
        },
    )
    created.append(live["id"])
    live_s = wait_refresh(live["id"], 4)

    # 2) Recording on m2 (separate meeting => no conflict) then verify
    rec = create(
        ZA,
        {
            "Enrollment": [SCHMIDT],
            "Zoom Meeting": [m2],
            "Attendance Method": "Recording Quiz",
            "Recording Quiz Review Status": sat,
            "Recording Quiz Satisfactory?": True,
            "Normal Live Zoom XP": 40,
        },
    )
    created.append(rec["id"])
    # If m1==m2 this will conflict with live; use m2 only when distinct
    rec_s = wait_refresh(rec["id"], 4)

    # 3) Conflict pair on shared meeting: if m1!=m2, add recording on m1 as well
    conflict_live = live_s
    conflict_rec = None
    if m1 != m2:
        crec = create(
            ZA,
            {
                "Enrollment": [SCHMIDT],
                "Zoom Meeting": [m1],
                "Attendance Method": "Recording Quiz",
                "Recording Quiz Review Status": sat,
                "Recording Quiz Satisfactory?": True,
                "Normal Live Zoom XP": 40,
            },
        )
        created.append(crec["id"])
        time.sleep(5)
        conflict_live = wait_refresh(live["id"], 2)
        conflict_rec = wait_refresh(crec["id"], 2)
    else:
        # already conflicted by design
        time.sleep(5)
        conflict_live = wait_refresh(live["id"], 2)
        conflict_rec = wait_refresh(rec["id"], 2)

    tests = []

    def check(name, ok, detail):
        tests.append({"name": name, "ok": bool(ok), "detail": detail})

    # Live (non-conflict preferred when m1!=m2: after conflict step live may conflict)
    # Re-evaluate: if conflict set, use live_s taken before conflict recording created
    live_check = live_s
    expected_xp = (
        math.floor(live_check["normal_xp"] * 100 / 100)
        if live_check["normal_xp"] is not None
        else None
    )
    ok_live = (
        live_check["pre_approved"]
        and not live_check["conflict"]
        and live_check["approved"]
        and live_check["pct"] == 100
        and live_check["gate"]
        and live_check["key"].startswith("ZOOM_CREDIT|")
        and (expected_xp is None or live_check["xp"] == expected_xp)
    )
    check("live_approved_full", ok_live, {"record": live_check, "expected_xp": expected_xp, "meeting": m1})

    # Recording on m2 when distinct
    if m1 != m2:
        expected_pct = rec_s["eff_pct"] if rec_s["eff_pct"] is not None else 50
        expected_gate = bool(rec_s["eff_gate"])
        expected_rxp = (
            math.floor(rec_s["normal_xp"] * expected_pct / 100) if rec_s["normal_xp"] is not None else None
        )
        ok_rec = (
            rec_s["pre_approved"]
            and not rec_s["conflict"]
            and rec_s["approved"]
            and rec_s["pct"] == expected_pct
            and rec_s["gate"] == expected_gate
            and rec_s["key"].startswith("ZOOM_CREDIT|")
            and (expected_rxp is None or rec_s["xp"] == expected_rxp)
        )
        check(
            "recording_satisfactory",
            ok_rec,
            {
                "record": rec_s,
                "expected_pct": expected_pct,
                "expected_gate": expected_gate,
                "expected_xp": expected_rxp,
                "meeting": m2,
            },
        )
    else:
        check("recording_satisfactory", False, {"error": "only one meeting available; skipped isolated recording"})

    # Conflict
    if conflict_rec is not None:
        both = True
        rows = [conflict_live, conflict_rec]
        for r in rows:
            if not (
                r["conflict"]
                and not r["approved"]
                and r["pct"] == 0
                and (r["xp"] in (0, None))
                and not r["gate"]
            ):
                both = False
        check("conflict_pair", both, {"live": conflict_live, "recording": conflict_rec})
    else:
        check("conflict_pair", False, {"error": "conflict fixture missing"})

    # Blank keys already validated previously — reconfirm via orphan create
    orphan = create(ZA, {"Attendance Method": "Live", "Live Attendance Confirmed?": True})
    created.append(orphan["id"])
    orphan_s = wait_refresh(orphan["id"], 2)
    check("blank_rids_key", orphan_s["key"] == "", {"record": orphan_s})

    report["created_record_ids"] = created
    report["tests"] = tests
    report["pass"] = sum(1 for t in tests if t["ok"])
    report["fail"] = sum(1 for t in tests if not t["ok"])
    report["total"] = len(tests)
    PREVIEW.joinpath("c025_schmidt_verify.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "pass": report["pass"],
                "fail": report["fail"],
                "total": report["total"],
                "tests": [(t["name"], t["ok"]) for t in tests],
                "created": created,
                "rollup_ok": report["rollup_fix"].get("ok"),
                "rollup_options_keys": list((report["rollup_fix"].get("options") or {}).keys()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
