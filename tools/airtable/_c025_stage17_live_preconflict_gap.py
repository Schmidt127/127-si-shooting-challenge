#!/usr/bin/env python3
"""Read-only: diagnose missing |LIVE preconflict tag for enrollment+meeting."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
ENROLL = "recgP9qZYjAhE7NXm"
MEETING = "reczeUT0AJUWMmEOb"
OUT = HERE / "_preview" / "c025_stage17_live_preconflict_gap.json"


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
        url, headers={"Authorization": f"Bearer {token}"}, method="GET"
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


def list_all(table: str, token: str, formula: str | None = None, fields=None):
    records = []
    offset = None
    while True:
        params = []
        if formula:
            params.append("filterByFormula=" + urllib.parse.quote(formula))
        if fields:
            for f in fields:
                params.append("fields[]=" + urllib.parse.quote(f))
        if offset:
            params.append(f"offset={offset}")
        url = f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}"
        if params:
            url += "?" + "&".join(params)
        st, body = api(url, token)
        if st != 200:
            raise SystemExit(f"list {table} {st}: {json.dumps(body)[:500]}")
        records.extend(body.get("records") or [])
        offset = body.get("offset")
        if not offset:
            break
    return records


def main() -> None:
    token = load_token()

    # Resolve Pre-Approved formula field IDs → names
    st, meta = api(f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in meta["tables"]}
    za_fields = {f["id"]: f for f in tables["Zoom Attendance"]["fields"]}
    za_by_name = {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
    zm_by_name = {f["name"]: f for f in tables["Zoom Meetings"]["fields"]}

    def resolve_formula(fid_formula: str | None) -> str | None:
        if not fid_formula:
            return None
        out = fid_formula
        for fid, f in za_fields.items():
            out = out.replace("{" + fid + "}", "{" + f["name"] + "}")
        return out

    pre_approved = za_by_name.get("Zoom Credit Pre-Approved?")
    preconflict = za_by_name.get("Preconflict Pair Tag")
    conflict = za_by_name.get("Zoom Credit Conflict?")
    rollup = zm_by_name.get("Approved Preconflict Pair Tags")

    # All ZA rows for this meeting
    za_for_meeting = list_all(
        "Zoom Attendance",
        token,
        formula=f"{{Zoom Meeting RID}}='{MEETING}'",
        fields=[
            "Attendance Method",
            "Enrollment",
            "Enrollment RID",
            "Zoom Meeting RID",
            "Zoom Credit Pre-Approved?",
            "Preconflict Pair Tag",
            "Zoom Credit Conflict?",
            "Zoom Credit Approved?",
            "Recording Quiz Review Status",
            "Recording Quiz Satisfactory?",
        ],
    )
    # All ZA rows for this enrollment
    za_for_enroll = list_all(
        "Zoom Attendance",
        token,
        formula=f"{{Enrollment RID}}='{ENROLL}'",
        fields=[
            "Attendance Method",
            "Enrollment RID",
            "Zoom Meeting RID",
            "Zoom Credit Pre-Approved?",
            "Preconflict Pair Tag",
            "Zoom Meeting",
        ],
    )
    # Exact pair
    za_pair = list_all(
        "Zoom Attendance",
        token,
        formula=f"AND({{Enrollment RID}}='{ENROLL}',{{Zoom Meeting RID}}='{MEETING}')",
        fields=[
            "Attendance Method",
            "Enrollment RID",
            "Zoom Meeting RID",
            "Zoom Credit Pre-Approved?",
            "Preconflict Pair Tag",
            "Zoom Credit Conflict?",
            "Zoom Credit Approved?",
        ],
    )

    st, meeting = api(
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    mf = meeting.get("fields") or {} if st == 200 else {}
    attendees = list(mf.get("Attendees") or [])

    live_rows = [
        r
        for r in za_for_meeting
        if (r.get("fields") or {}).get("Attendance Method") == "Live"
    ]
    live_for_enroll = []
    for r in live_rows:
        f = r.get("fields") or {}
        rid = f.get("Enrollment RID")
        if isinstance(rid, list):
            rid = rid[0] if rid else None
        if rid == ENROLL or ENROLL in (f.get("Enrollment") or []):
            live_for_enroll.append(r)

    rec_for_enroll = []
    for r in za_pair:
        if (r.get("fields") or {}).get("Attendance Method") == "Recording Quiz":
            rec_for_enroll.append(r)

    # Rollup config
    rollup_info = None
    if rollup:
        opts = rollup.get("options") or {}
        rollup_info = {
            "type": rollup.get("type"),
            "options": {
                k: opts.get(k)
                for k in (
                    "isValid",
                    "recordLinkFieldId",
                    "fieldIdInLinkedTable",
                    "aggregationFunction",
                )
            },
        }
        # resolve linked field names
        link_id = opts.get("recordLinkFieldId")
        field_in_linked = opts.get("fieldIdInLinkedTable")
        link_name = next(
            (f["name"] for f in tables["Zoom Meetings"]["fields"] if f["id"] == link_id),
            None,
        )
        linked_field_name = next(
            (f["name"] for f in tables["Zoom Attendance"]["fields"] if f["id"] == field_in_linked),
            None,
        )
        rollup_info["recordLinkFieldName"] = link_name
        rollup_info["fieldInLinkedTableName"] = linked_field_name

    report = {
        "mode": "read_only",
        "meeting_id": MEETING,
        "enrollment_id": ENROLL,
        "expected_live_tag": f"{ENROLL}|LIVE",
        "expected_rec_tag": f"{ENROLL}|REC",
        "meeting": {
            "attendee_count": len(attendees),
            "enrollment_in_attendees": ENROLL in attendees,
            "Approved Preconflict Pair Tags": mf.get("Approved Preconflict Pair Tags"),
        },
        "formulas": {
            "Zoom Credit Pre-Approved?": resolve_formula(
                ((pre_approved or {}).get("options") or {}).get("formula")
            ),
            "Preconflict Pair Tag": resolve_formula(
                ((preconflict or {}).get("options") or {}).get("formula")
            ),
            "Zoom Credit Conflict?": resolve_formula(
                ((conflict or {}).get("options") or {}).get("formula")
            ),
        },
        "rollup": rollup_info,
        "za_rows_for_pair": [
            {
                "id": r["id"],
                **{
                    k: (r.get("fields") or {}).get(k)
                    for k in [
                        "Attendance Method",
                        "Enrollment RID",
                        "Zoom Meeting RID",
                        "Zoom Credit Pre-Approved?",
                        "Preconflict Pair Tag",
                        "Zoom Credit Conflict?",
                        "Zoom Credit Approved?",
                    ]
                },
            }
            for r in za_pair
        ],
        "live_za_rows_on_meeting": [
            {
                "id": r["id"],
                "Enrollment RID": (r.get("fields") or {}).get("Enrollment RID"),
                "Pre-Approved": (r.get("fields") or {}).get("Zoom Credit Pre-Approved?"),
                "Preconflict Pair Tag": (r.get("fields") or {}).get("Preconflict Pair Tag"),
            }
            for r in live_rows
        ],
        "live_za_for_this_enrollment": [
            {"id": r["id"], "fields": r.get("fields")} for r in live_for_enroll
        ],
        "recording_za_for_pair": [
            {"id": r["id"], "fields": r.get("fields")} for r in rec_for_enroll
        ],
        "counts": {
            "za_on_meeting": len(za_for_meeting),
            "live_za_on_meeting": len(live_rows),
            "live_za_for_enrollment": len(live_for_enroll),
            "za_for_enrollment_any_meeting": len(za_for_enroll),
            "za_exact_pair": len(za_pair),
        },
    }

    # Cause classification
    if len(live_for_enroll) == 0:
        cause = (
            "No Zoom Attendance row with Attendance Method=Live exists for "
            f"Enrollment {ENROLL} + Meeting {MEETING}. "
            "Preconflict Pair Tag |LIVE is produced only by a Pre-Approved Live ZA formula "
            "(not by Zoom Meetings.Attendees, and not by Automation 101/117)."
        )
        producer = (
            "Formula Zoom Attendance.Preconflict Pair Tag "
            "(when Attendance Method=Live AND Zoom Credit Pre-Approved?=1); "
            "rolled up by Zoom Meetings.Approved Preconflict Pair Tags"
        )
        why = (
            "Attendees link proves live roster membership for Automation 101, but Stage 17 "
            "conflict tags are sourced from Zoom Attendance rows. No Live ZA row ⇒ no |LIVE tag."
        )
        fix = (
            "Smallest safe PROD fix: create one Zoom Attendance record for this Enrollment+Meeting "
            "with Attendance Method=Live (and whatever checkbox Pre-Approved Live path requires, "
            "typically Live Credit Eligible? / equivalent so Zoom Credit Pre-Approved?=1). "
            "Do not remove Attendees. Do not touch ZOOM_ATTEND_BASE XP. Do not enable/disable automations. "
            "After the Live ZA exists with Preconflict Pair Tag=rec…|LIVE, Conflict? should become 1 "
            "and recording approval should drop (then soft-void recording XP if still active)."
        )
    else:
        live = live_for_enroll[0]
        f = live.get("fields") or {}
        cause = "Live ZA exists but Preconflict Pair Tag is blank or Pre-Approved!=1"
        producer = "Formula Zoom Attendance.Preconflict Pair Tag"
        why = {
            "live_za_id": live["id"],
            "Pre-Approved": f.get("Zoom Credit Pre-Approved?"),
            "Preconflict Pair Tag": f.get("Preconflict Pair Tag"),
        }
        fix = (
            "Inspect Live ZA Pre-Approved inputs; correct the Live eligibility checkbox/fields "
            "so Pre-Approved=1 and Preconflict Pair Tag emits |LIVE. No Attendees/XP/automation changes."
        )

    report["diagnosis"] = {
        "producer": producer,
        "cause": cause,
        "why_not_created": why,
        "smallest_safe_prod_fix": fix,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
