#!/usr/bin/env python3
"""Deeper read-only inspection of first-live ZA / meeting / XP (no writes, no token print)."""
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
SOURCE_KEY = f"ZOOM_CREDIT|{ENROLL}|{MEETING}"
OUT = HERE / "_preview" / "c025_stage17_first_live_prod_inspect.json"


def load_token() -> str:
    env = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def api(method, url, token):
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:2000]}


def list_all(table, token, formula=None, fields=None):
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
        st, body = api("GET", url, token)
        if st != 200:
            raise SystemExit(f"list fail {table} {st} {body}")
        records.extend(body.get("records") or [])
        offset = body.get("offset")
        if not offset:
            break
    return records


def main():
    token = load_token()
    st, za = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Attendance')}/{ZA_ID}",
        token,
    )
    zaf = za.get("fields") or {}
    # Keep only relevant fields
    keep = [
        "Attendance Method",
        "Enrollment",
        "Zoom Meeting",
        "Enrollment RID",
        "Zoom Meeting RID",
        "Zoom Credit Key",
        "Zoom Credit Approved?",
        "Zoom Credit Conflict?",
        "Zoom XP Amount",
        "Recording Quiz Review Status",
        "Recording Quiz Satisfactory?",
        "Zoom Gate Credit Earned?",
        "Gate Credit Applied?",
        "Effective Recording Counts for Perfect Week?",
        "Perfect Week Credit Applied?",
        "Recording Approval Email Sent At",
        "Recording Approval Email Send Key",
    ]
    za_view = {k: zaf.get(k) for k in keep}

    st, meeting = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    mf = meeting.get("fields") or {}
    attendees = mf.get("Attendees") or []
    meeting_view = {
        "Zoom Meeting Key": mf.get("Zoom Meeting Key"),
        "Meeting Status": mf.get("Meeting Status"),
        "attendee_count": len(attendees),
        "enrollment_in_attendees": ENROLL in attendees,
        "Create XP Events": mf.get("Create XP Events"),
        "XP Award Status": mf.get("XP Award Status"),
        "Effective Recording XP Percentage": mf.get("Effective Recording XP Percentage"),
    }

    credit_xp = list_all(
        "XP Events",
        token,
        formula=f"{{Source Key}}='{SOURCE_KEY}'",
        fields=["Source Key", "XP Points", "Active?", "Awarded By", "XP Bucket", "XP Source", "Enrollment", "Zoom Meeting"],
    )
    mkey = mf.get("Zoom Meeting Key") or ""
    live_formula = f"AND(FIND('ZOOM_ATTEND_BASE|', {{Source Key}}), FIND('{ENROLL}', {{Source Key}}))"
    live_xp = list_all(
        "XP Events",
        token,
        formula=live_formula,
        fields=["Source Key", "XP Points", "Active?", "Awarded By", "Zoom Meeting"],
    )
    live_for_meeting = []
    for r in live_xp:
        f = r.get("fields") or {}
        zm = f.get("Zoom Meeting") or []
        sk = str(f.get("Source Key") or "")
        if MEETING in zm or (mkey and f"ZOOM_ATTEND_BASE|{mkey}|{ENROLL}" == sk):
            live_for_meeting.append(
                {
                    "id": r["id"],
                    "Source Key": f.get("Source Key"),
                    "XP Points": f.get("XP Points"),
                    "Active?": f.get("Active?"),
                    "Awarded By": f.get("Awarded By"),
                }
            )

    # Sibling ZA rows for same enrollment+meeting
    siblings = list_all(
        "Zoom Attendance",
        token,
        formula=f"AND({{Enrollment RID}}='{ENROLL}', {{Zoom Meeting RID}}='{MEETING}')",
        fields=["Attendance Method", "Zoom Credit Approved?", "Zoom Credit Conflict?", "Zoom Credit Key"],
    )

    out = {
        "za": {"id": ZA_ID, "fields": za_view},
        "meeting": {"id": MEETING, "fields": meeting_view},
        "zoom_credit_xp": [
            {
                "id": r["id"],
                **{k: (r.get("fields") or {}).get(k) for k in ["Source Key", "XP Points", "Active?", "Awarded By", "XP Bucket", "XP Source"]},
            }
            for r in credit_xp
        ],
        "live_xp_for_meeting": live_for_meeting,
        "sibling_za_count": len(siblings),
        "sibling_za": [
            {
                "id": r["id"],
                "Attendance Method": (r.get("fields") or {}).get("Attendance Method"),
                "Approved": (r.get("fields") or {}).get("Zoom Credit Approved?"),
                "Conflict": (r.get("fields") or {}).get("Zoom Credit Conflict?"),
            }
            for r in siblings
        ],
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
