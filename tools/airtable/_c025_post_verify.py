#!/usr/bin/env python3
"""C-025 post-apply: verify rollup options, ensure view, run Schmidt DEV tests."""

from __future__ import annotations

import json
import math
import os
from collections import defaultdict
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

tv = dotenv_values(HERE / ".env")
TOKEN = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
os.environ["AIRTABLE_TOKEN"] = TOKEN
os.environ["AIRTABLE_API_TOKEN"] = TOKEN

DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
DATA = f"https://api.airtable.com/v0/{DEV}"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"
ENROLL = "tbl3PFmwbRoabu1YV"

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
    "Enrollment",
    "Zoom Meeting",
]


def tables():
    r = requests.get(f"{META}/tables", headers=H, timeout=120)
    r.raise_for_status()
    return r.json()["tables"]


def table(name):
    for t in tables():
        if t["name"] == name:
            return t
    raise SystemExit(f"missing {name}")


def field(t, name):
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
    out = []
    offset = None
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


def update_record(table_id, record_id, fields):
    r = requests.patch(
        f"{DATA}/{table_id}/{record_id}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"update {record_id} failed {r.status_code}: {r.text[:400]}")
    return r.json()


def create_record(table_id, fields):
    r = requests.post(
        f"{DATA}/{table_id}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"create failed {r.status_code}: {r.text[:500]}")
    return r.json()


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
        "debug": text(f.get("Zoom Credit Debug"))[:300],
        "enrollment_ids": f.get("Enrollment") or [],
        "meeting_ids": f.get("Zoom Meeting") or [],
    }


def get_record(table_id, rid, fields=None):
    params = {}
    if fields:
        params["fields[]"] = fields
    r = requests.get(f"{DATA}/{table_id}/{rid}", headers=H, params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def ensure_view(za):
    name = "Zoom Recording Quiz — Past Deadline"
    for v in za.get("views") or []:
        if v.get("name") == name:
            return {"status": "existed", "id": v.get("id"), "name": name}
    # Meta view create is limited; try and fall back to manual instructions
    r = requests.post(
        f"{META}/tables/{za['id']}/views",
        headers=H,
        json={"name": name, "type": "grid"},
        timeout=60,
    )
    if not r.ok:
        return {
            "status": "manual_required",
            "reason": f"{r.status_code}: {r.text[:300]}",
            "name": name,
            "filters": [
                "Attendance Method = Recording Quiz",
                "Calculated Recording Quiz Deadline is before today",
                "Zoom Credit Approved? unchecked",
            ],
        }
    return {"status": "created_shell", "view": r.json()}


def find_schmidt_enrollments():
    # Try several common name fields
    formulas = [
        "OR(FIND('Schmidt', {Athlete Name}&''), FIND('Schmidt', {Name}&''))",
        "FIND('Schmidt', ARRAYJOIN({Athlete}&''))",
        "OR(FIND('Schmidt', {Enrollment Name}&''), FIND('Schmidt', {Display Name}&''))",
    ]
    for formula in formulas:
        try:
            recs = list_records(ENROLL, formula=formula, max_records=20)
            if recs:
                return recs, formula
        except Exception:
            continue
    # Fallback: scan athletes linked names via formula on Enrollment if has Athlete link
    try:
        recs = list_records(ENROLL, max_records=100)
        matched = []
        for r in recs:
            blob = json.dumps(r.get("fields") or {})
            if "Schmidt" in blob:
                matched.append(r)
        return matched[:20], "client_scan"
    except Exception as e:
        return [], str(e)


def main():
    za = table("Zoom Attendance")
    zm = table("Zoom Meetings")
    rollup = field(zm, "Approved Preconflict Pair Tags")
    lookup = field(za, "Meeting Approved Preconflict Pair Tags")
    report = {
        "rollup_options": (rollup or {}).get("options"),
        "lookup_options": (lookup or {}).get("options"),
        "view": ensure_view(za),
    }

    # Delete leftover probe field if still present
    probe = field(zm, "C025 Schema Write Probe")
    if probe:
        # field delete may not be available; hide by report only
        report["probe_field"] = {"id": probe["id"], "status": "still_present_manual_delete"}

    enrollments, how = find_schmidt_enrollments()
    report["schmidt_find"] = {
        "count": len(enrollments),
        "how": how,
        "ids": [e["id"] for e in enrollments[:10]],
        "names": [
            {
                "id": e["id"],
                "fields": {k: e["fields"].get(k) for k in list(e.get("fields") or {})[:8]},
            }
            for e in enrollments[:5]
        ],
    }

    # Survey all methoded attendance
    recs = list_records(
        ZA,
        fields=CREDIT_FIELDS,
        formula="OR({Attendance Method}='Live',{Attendance Method}='Recording Quiz')",
        max_records=200,
    )
    snaps = [snap(r) for r in recs]
    report["survey_count"] = len(snaps)

    schmidt_ids = {e["id"] for e in enrollments}
    schmidt_snaps = [s for s in snaps if any(x in schmidt_ids for x in s["enrollment_ids"])]
    report["schmidt_attendance_count"] = len(schmidt_snaps)

    tests = []

    def check(name, ok, detail):
        tests.append({"name": name, "ok": bool(ok), "detail": detail})

    # Prefer Schmidt rows; else any DEV rows
    pool = schmidt_snaps or snaps

    live_ok = [
        s
        for s in pool
        if s["method"] == "Live" and s["live_confirmed"] and s["pre_approved"] and not s["conflict"]
    ]
    if live_ok:
        s = live_ok[0]
        expected_xp = math.floor(s["normal_xp"] * s["pct"] / 100) if s["normal_xp"] is not None and s["pct"] is not None else None
        ok = (
            s["pre_approved"]
            and not s["conflict"]
            and s["approved"]
            and s["pct"] == 100
            and s["gate"]
            and bool(s["key"])
            and s["key"].startswith("ZOOM_CREDIT|")
            and (expected_xp is None or s["xp"] == expected_xp)
        )
        check("live_approved_full", ok, {"record": s, "expected_xp": expected_xp, "pool": "schmidt" if s in schmidt_snaps else "any"})
    else:
        check("live_approved_full", False, {"error": "no Live confirmed preapproved non-conflict row"})

    rec_ok = [
        s
        for s in pool
        if s["method"] == "Recording Quiz"
        and s["review"] == "Satisfactory"
        and s["satisfactory"]
        and s["pre_approved"]
        and not s["conflict"]
    ]
    if rec_ok:
        s = rec_ok[0]
        expected_pct = s["eff_pct"] if s["eff_pct"] is not None else 50
        expected_gate = bool(s["eff_gate"])
        expected_xp = (
            math.floor(s["normal_xp"] * expected_pct / 100) if s["normal_xp"] is not None else None
        )
        ok = (
            s["pre_approved"]
            and not s["conflict"]
            and s["approved"]
            and s["pct"] == expected_pct
            and s["gate"] == expected_gate
            and bool(s["key"])
            and (expected_xp is None or s["xp"] == expected_xp)
        )
        check(
            "recording_satisfactory",
            ok,
            {
                "record": s,
                "expected_pct": expected_pct,
                "expected_gate": expected_gate,
                "expected_xp": expected_xp,
            },
        )
    else:
        check("recording_satisfactory", False, {"error": "no Satisfactory recording non-conflict row"})

    groups = defaultdict(list)
    for s in pool:
        if s["enroll_rid"] and s["meeting_rid"]:
            groups[f"{s['enroll_rid']}|{s['meeting_rid']}"].append(s)
    conflict_candidates = []
    for key, rows in groups.items():
        methods = {r["method"] for r in rows}
        if "Live" in methods and "Recording Quiz" in methods:
            conflict_candidates.append({"pair": key, "rows": rows})

    if conflict_candidates:
        pair = conflict_candidates[0]
        both = True
        for r in pair["rows"]:
            if r["method"] not in ("Live", "Recording Quiz"):
                continue
            if not (
                r["conflict"]
                and not r["approved"]
                and r["pct"] == 0
                and (r["xp"] in (0, None))
                and not r["gate"]
            ):
                both = False
        check("conflict_pair", both, pair)
    else:
        check("conflict_pair", False, {"error": "no Live+Recording pair for same enrollment+meeting"})

    blank_enroll = [s for s in snaps if not s["enroll_rid"]]
    blank_meeting = [s for s in snaps if not s["meeting_rid"]]
    if blank_enroll:
        s = blank_enroll[0]
        check("blank_enrollment_key", s["key"] == "", {"record": s})
    else:
        # Create ephemeral blank-link observation using an existing record's key field
        # by reading a fresh create without enrollment if allowed — skip destroy; mark skip
        check("blank_enrollment_key", False, {"error": "no blank Enrollment RID rows; skipped create"})

    if blank_meeting:
        s = blank_meeting[0]
        check("blank_meeting_key", s["key"] == "", {"record": s})
    else:
        check("blank_meeting_key", False, {"error": "no blank Zoom Meeting RID rows; skipped create"})

    report["tests"] = tests
    report["pass"] = sum(1 for t in tests if t["ok"])
    report["fail"] = sum(1 for t in tests if not t["ok"])
    report["total"] = len(tests)
    PREVIEW.joinpath("c025_post_verify.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"pass": report["pass"], "fail": report["fail"], "total": report["total"], "tests": [(t["name"], t["ok"]) for t in tests], "view": report["view"], "rollup_formula": (report["rollup_options"] or {}).get("formula"), "schmidt": report["schmidt_find"]["count"]}, indent=2))


if __name__ == "__main__":
    main()
