#!/usr/bin/env python3
"""Read-only diagnose: why Zoom Credit Conflict?=0 while enrollment is in Attendees."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
ZA_ID = "recfqsgM7zDobxsPf"
ENROLL = "recgP9qZYjAhE7NXm"
MEETING = "reczeUT0AJUWMmEOb"
OUT = HERE / "_preview" / "c025_stage17_conflict_mismatch_diagnose.json"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def api(url: str, token: str):
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:2000]}


def scalar(v):
    if v is None:
        return None
    if isinstance(v, list):
        if len(v) == 0:
            return None
        if len(v) == 1:
            return scalar(v[0])
        return [scalar(x) for x in v]
    return v


def main() -> None:
    token = load_token()

    za_fields = [
        "Enrollment",
        "Zoom Meeting",
        "Enrollment RID",
        "Zoom Meeting RID",
        "Preconflict Pair Tag",
        "Meeting Approved Preconflict Pair Tags",
        "Zoom Credit Conflict?",
        "Zoom Credit Approved?",
        "Zoom Credit Pre-Approved?",
        "Attendance Method",
        "Zoom Credit Key",
    ]
    zm_fields = [
        "Attendees",
        "Approved Preconflict Pair Tags",
        "Zoom Meeting Key",
    ]

    st, za = api(
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Attendance')}/{ZA_ID}",
        token,
    )
    if st != 200:
        raise SystemExit(f"ZA fetch failed: {st} {za}")
    zaf = za.get("fields") or {}

    st, zm = api(
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    if st != 200:
        raise SystemExit(f"ZM fetch failed: {st} {zm}")
    zmf = zm.get("fields") or {}

    # Meta formulas for conflict fields
    st, meta = api(f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in meta["tables"]}
    formula_meta = {}
    for tname, wanted in (
        ("Zoom Attendance", za_fields),
        ("Zoom Meetings", ["Approved Preconflict Pair Tags"]),
    ):
        by_name = {f["name"]: f for f in tables[tname]["fields"]}
        for name in wanted:
            f = by_name.get(name)
            if not f:
                formula_meta[f"{tname}.{name}"] = {"present": False}
                continue
            formula_meta[f"{tname}.{name}"] = {
                "present": True,
                "type": f.get("type"),
                "formula": ((f.get("options") or {}).get("formula")),
                "isValid": ((f.get("options") or {}).get("isValid")),
            }

    enrollment_rid = scalar(zaf.get("Enrollment RID"))
    meeting_rid = scalar(zaf.get("Zoom Meeting RID"))
    preconflict_tag = scalar(zaf.get("Preconflict Pair Tag"))
    meeting_approved_tags = zaf.get("Meeting Approved Preconflict Pair Tags")
    attendees = list(zmf.get("Attendees") or [])
    zm_approved_tags = zmf.get("Approved Preconflict Pair Tags")

    # Normalize tags for membership tests
    tags_raw = meeting_approved_tags
    if tags_raw is None:
        tags_str = ""
        tags_list = []
    elif isinstance(tags_raw, list):
        tags_list = [str(scalar(x) or "") for x in tags_raw]
        tags_str = "\n".join(tags_list)
    else:
        tags_str = str(tags_raw)
        tags_list = [t for t in tags_str.replace("\r", "").split("\n") if t != ""]

    tag_str = "" if preconflict_tag is None else str(preconflict_tag)
    tag_in_meeting_approved = False
    if tag_str:
        # Conflict formula typically uses FIND(tag, tags) or exact membership
        tag_in_meeting_approved = tag_str in tags_str or tag_str in tags_list

    enroll_in_attendees = ENROLL in attendees

    # Expected preconflict tag shape from formula docs
    expected_tag_if_preapproved = None
    if enrollment_rid and meeting_rid:
        expected_tag_if_preapproved = f"{enrollment_rid}|{meeting_rid}"

    report = {
        "mode": "read_only",
        "za_id": ZA_ID,
        "meeting_id": MEETING,
        "target_enrollment": ENROLL,
        "values": {
            "Enrollment RID": enrollment_rid,
            "Zoom Meeting RID": meeting_rid,
            "Preconflict Pair Tag": preconflict_tag,
            "Meeting Approved Preconflict Pair Tags": meeting_approved_tags,
            "ZM.Approved Preconflict Pair Tags": zm_approved_tags,
            "Attendees_enrollment_ids": attendees,
            "Zoom Credit Conflict?": zaf.get("Zoom Credit Conflict?"),
            "Zoom Credit Approved?": zaf.get("Zoom Credit Approved?"),
            "Zoom Credit Pre-Approved?": zaf.get("Zoom Credit Pre-Approved?"),
            "Attendance Method": zaf.get("Attendance Method"),
        },
        "comparisons": {
            "enrollment_rid_equals_target": enrollment_rid == ENROLL,
            "meeting_rid_equals_target": meeting_rid == MEETING,
            "enrollment_in_attendees": enroll_in_attendees,
            "preconflict_tag_equals_enrollment_pipe_meeting": tag_str
            == (expected_tag_if_preapproved or ""),
            "preconflict_tag_present_in_meeting_approved_tags": tag_in_meeting_approved,
            "meeting_approved_tags_blank": meeting_approved_tags in (None, "", []),
            "attendees_count": len(attendees),
        },
        "formula_meta": formula_meta,
        "raw_za_selected": {k: zaf.get(k) for k in za_fields},
        "raw_zm_selected": {k: zmf.get(k) for k in zm_fields},
    }

    # Exact mismatch diagnosis (conflict formula does NOT read Attendees)
    mismatches = []
    if enroll_in_attendees and zaf.get("Zoom Credit Conflict?") in (0, None, False):
        mismatches.append(
            {
                "kind": "design_scope",
                "detail": (
                    "Zoom Credit Conflict? does not read Zoom Meetings.Attendees; "
                    "presence of enrollment in Attendees alone cannot set Conflict=1."
                ),
            }
        )
    if tag_str and not tag_in_meeting_approved:
        mismatches.append(
            {
                "kind": "tag_not_in_meeting_approved_tags",
                "preconflict_pair_tag": tag_str,
                "meeting_approved_preconflict_pair_tags": meeting_approved_tags,
                "zm_approved_preconflict_pair_tags": zm_approved_tags,
            }
        )
    if enrollment_rid != ENROLL:
        mismatches.append(
            {
                "kind": "enrollment_rid_mismatch",
                "Enrollment RID": enrollment_rid,
                "Enrollment link / target": ENROLL,
            }
        )
    if meeting_rid != MEETING:
        mismatches.append(
            {
                "kind": "meeting_rid_mismatch",
                "Zoom Meeting RID": meeting_rid,
                "Zoom Meeting link / target": MEETING,
            }
        )
    if expected_tag_if_preapproved and tag_str and tag_str != expected_tag_if_preapproved:
        mismatches.append(
            {
                "kind": "preconflict_tag_shape_mismatch",
                "Preconflict Pair Tag": tag_str,
                "expected_from_rids": expected_tag_if_preapproved,
            }
        )
    if zm_approved_tags != meeting_approved_tags and not (
        zm_approved_tags in (None, "", []) and meeting_approved_tags in (None, "", [])
    ):
        # Lookup should mirror rollup; difference is a mismatch
        mismatches.append(
            {
                "kind": "za_lookup_vs_zm_rollup_mismatch",
                "Meeting Approved Preconflict Pair Tags (ZA lookup)": meeting_approved_tags,
                "Approved Preconflict Pair Tags (ZM rollup)": zm_approved_tags,
            }
        )

    report["mismatches"] = mismatches
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
