#!/usr/bin/env python3
"""
Prepare dedicated DEV fixture for C-025 Automation 117f controlled tests.

DEV only (appTetnuCZlCZdTCT). Schmidt test enrollment only.
Does NOT enable 117f, does NOT set webhook URLs, does NOT write parent emails.
Does NOT modify Zoom Meetings.Attendees on the happy-path meeting.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_117f_dev_fixture.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
TAG = "C025-117f-DEV-EMAIL"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:800]}
        return e.code, parsed


def main() -> None:
    env = load_env()
    base = env.get("AIRTABLE_BASE_ID") or BASE_EXPECTED
    token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN") or ""
    assert base == BASE_EXPECTED, base
    assert token, "missing token"

    stamp = time.strftime("%Y%m%d-%H%M%S")
    result: dict = {
        "base_id": base,
        "tag": TAG,
        "stamp": stamp,
        "enrollment_id": SCHMIDT_ENROLLMENT,
        "notes": [
            "Happy-path meeting keeps Attendees empty (101-safe).",
            "Conflict meeting places Schmidt on Attendees once for Conflict=1 path.",
            "No webhook URL, PAT, or parent recipient written by this script.",
            "Parent To: for live Gmail must be Mike-controlled test inbox via Make testMode only.",
        ],
        "created": {},
        "verified": {},
    }

    st, weeks = api(
        "GET",
        f"https://api.airtable.com/v0/{base}/Weeks?maxRecords=1&fields%5B%5D=Week%20Name",
        token,
    )
    week_id = None
    if st == 200 and (weeks.get("records") or []):
        week_id = weeks["records"][0]["id"]
    result["week_id"] = week_id

    def meeting_fields(name: str, start: str, *, email_enabled_override: str) -> dict:
        fields: dict = {
            "Meeting Name": name,
            "Start Time": start,
            "Host Name": TAG,
            "Brief Description": f"{TAG} dedicated 117f email fixture {stamp}",
            "Approval Email Enabled — Meeting Override": email_enabled_override,
            "Approval Email Timing — Meeting Override": "On Satisfactory",
            "Approval Email Template Key — Meeting Override": "ZOOM_RECORDING_APPROVED",
        }
        if week_id:
            fields["Week"] = [week_id]
        fields["Create XP Events"] = False
        fields["Meeting Status"] = "Completed"
        return fields

    happy_fields = meeting_fields(
        f"{TAG} happy {stamp}",
        "2026-07-20T18:00:00.000Z",
        email_enabled_override="Yes",
    )
    disabled_fields = meeting_fields(
        f"{TAG} disabled {stamp}",
        "2026-07-20T19:00:00.000Z",
        email_enabled_override="No",
    )
    conflict_fields = meeting_fields(
        f"{TAG} conflict {stamp}",
        "2026-07-20T20:00:00.000Z",
        email_enabled_override="Yes",
    )
    # Conflict fixture: live attendee + recording quiz for same enrollment/meeting.
    conflict_fields["Attendees"] = [SCHMIDT_ENROLLMENT]

    meetings = {}
    for key, fields in (
        ("happy", happy_fields),
        ("disabled", disabled_fields),
        ("conflict", conflict_fields),
    ):
        st, body = api(
            "POST",
            f"https://api.airtable.com/v0/{base}/Zoom%20Meetings",
            token,
            {"fields": fields, "typecast": True},
        )
        meetings[key] = {"status": st, "id": body.get("id"), "raw": body}
        result["created"][f"meeting_{key}"] = {
            "status": st,
            "id": body.get("id"),
            "name": fields["Meeting Name"],
        }
        if st != 200:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
            raise SystemExit(f"meeting_{key} create failed: {st} {body}")

    def create_za(label: str, meeting_id: str, *, feedback: str) -> dict:
        fields = {
            "Attendance Method": "Recording Quiz",
            "Enrollment": [SCHMIDT_ENROLLMENT],
            "Zoom Meeting": [meeting_id],
            "Recording Quiz Review Status": "Satisfactory",
            "Recording Quiz Satisfactory?": True,
            "Recording Quiz Submitted At": "2026-07-20T17:00:00.000Z",
            "Recording Quiz Coach Feedback": feedback,
        }
        # Explicitly clear stamps if writable
        fields["Recording Approval Email Send Key"] = ""
        st, body = api(
            "POST",
            f"https://api.airtable.com/v0/{base}/Zoom%20Attendance",
            token,
            {"fields": fields, "typecast": True},
        )
        # Clear Sent At / Send Key after create if typecast ignored blanks
        rid = body.get("id")
        if st == 200 and rid:
            api(
                "PATCH",
                f"https://api.airtable.com/v0/{base}/Zoom%20Attendance/{rid}",
                token,
                {
                    "fields": {
                        "Recording Approval Email Send Key": "",
                        "Recording Approval Email Sent At": None,
                    },
                    "typecast": True,
                },
            )
        return {"label": label, "status": st, "id": rid, "raw": body}

    zas = {}
    for key, mid in (
        ("happy", meetings["happy"]["id"]),
        ("disabled", meetings["disabled"]["id"]),
        ("conflict", meetings["conflict"]["id"]),
    ):
        zas[key] = create_za(key, mid, feedback=f"{TAG} {key} {stamp}")
        result["created"][f"za_{key}"] = {
            "status": zas[key]["status"],
            "id": zas[key]["id"],
            "label": key,
        }
        if zas[key]["status"] != 200:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
            raise SystemExit(f"za_{key} create failed")

    # Conflict=1 requires approved LIVE + REC preconflict tags on the same meeting.
    conflict_meeting_id = meetings["conflict"]["id"]
    st, live_body = api(
        "POST",
        f"https://api.airtable.com/v0/{base}/Zoom%20Attendance",
        token,
        {
            "fields": {
                "Attendance Method": "Live",
                "Enrollment": [SCHMIDT_ENROLLMENT],
                "Zoom Meeting": [conflict_meeting_id],
                "Live Attendance Confirmed?": True,
            },
            "typecast": True,
        },
    )
    result["created"]["za_conflict_live"] = {
        "status": st,
        "id": live_body.get("id"),
        "label": "conflict_live",
    }
    if st != 200:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        raise SystemExit(f"za_conflict_live create failed: {st} {live_body}")

    time.sleep(2)

    verify_fields = [
        "Attendance Method",
        "Recording Quiz Satisfactory?",
        "Zoom Credit Conflict?",
        "Enrollment RID",
        "Zoom Meeting RID",
        "Recording Approval Email Send Key",
        "Recording Approval Email Sent At",
        "Effective Recording Approval Email Enabled?",
        "Effective Recording Approval Email Timing",
        "Effective Recording Approval Email Template Key",
        "Zoom Meeting",
        "Enrollment",
    ]

    for key, za in zas.items():
        rid = za["id"]
        qs = "&".join(f"fields%5B%5D={urllib.request.quote(f)}" for f in verify_fields)
        st, body = api(
            "GET",
            f"https://api.airtable.com/v0/{base}/Zoom%20Attendance/{rid}?{qs}",
            token,
        )
        fields = (body.get("fields") or {}) if st == 200 else {}
        # Redact nothing needed — no emails on ZA
        result["verified"][key] = {
            "status": st,
            "id": rid,
            "fields": fields,
            "expected_send_key": (
                f"ZOOM_REC_EMAIL|{SCHMIDT_ENROLLMENT}|{meetings[key]['id']}"
                if meetings[key].get("id")
                else None
            ),
        }

    # Snapshot meeting Attendees only as boolean presence (no PII)
    for key, m in meetings.items():
        mid = m["id"]
        st, body = api(
            "GET",
            f"https://api.airtable.com/v0/{base}/Zoom%20Meetings/{mid}"
            f"?fields%5B%5D=Attendees"
            f"&fields%5B%5D=Effective%20Recording%20Approval%20Email%20Enabled%3F"
            f"&fields%5B%5D=Effective%20Recording%20Approval%20Email%20Timing"
            f"&fields%5B%5D=Effective%20Recording%20Approval%20Email%20Template%20Key"
            f"&fields%5B%5D=Approval%20Email%20Enabled%20%E2%80%94%20Meeting%20Override",
            token,
        )
        fields = (body.get("fields") or {}) if st == 200 else {}
        attendees = fields.get("Attendees") or []
        result["verified"][f"meeting_{key}"] = {
            "status": st,
            "id": mid,
            "attendee_count": len(attendees),
            "effective_email_enabled": fields.get("Effective Recording Approval Email Enabled?"),
            "effective_timing": fields.get("Effective Recording Approval Email Timing"),
            "effective_template": fields.get("Effective Recording Approval Email Template Key"),
            "override_enabled": fields.get("Approval Email Enabled — Meeting Override"),
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
