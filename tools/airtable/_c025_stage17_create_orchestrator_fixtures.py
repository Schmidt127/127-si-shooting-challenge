"""
Create isolated DEV fixtures for Stage 17 orchestrator testing.
Does NOT enable automations. Does NOT write Zoom Meetings.Attendees for recording credit.
Uses Schmidt test enrollment only.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_orchestrator_fixtures.json"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
BASE_EXPECTED = "appTetnuCZlCZdTCT"
TAG = "C025-S17-ORCH-TEST"


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
        with urllib.request.urlopen(req) as resp:
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
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base

    stamp = time.strftime("%Y%m%d-%H%M%S")
    result: dict = {
        "base_id": base,
        "tag": TAG,
        "stamp": stamp,
        "schmidt_enrollment": SCHMIDT_ENROLLMENT,
        "created": {},
        "notes": [],
    }

    # Find a Week record (any)
    st, weeks = api(
        "GET",
        f"https://api.airtable.com/v0/{base}/Weeks?maxRecords=1&fields%5B%5D=Week%20Name",
        token,
    )
    week_id = None
    if st == 200 and (weeks.get("records") or []):
        week_id = weeks["records"][0]["id"]
    result["week_id"] = week_id

    # Create isolated Zoom Meeting — keep 101 safe: Create XP Events unchecked / Awarded if possible
    meeting_fields: dict = {
        "Meeting Name": f"{TAG} meeting {stamp}",
        "Start Time": "2026-07-18T06:30:00.000Z",  # Denver calendar day boundary helper
        "Host Name": f"{TAG}",
        "Brief Description": f"{TAG} isolated DEV fixture — safe for 117 orchestrator tests",
    }
    if week_id:
        meeting_fields["Week"] = [week_id]

    # Read schema for optional safety fields
    st, schema = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    tables = {t["name"]: t for t in (schema.get("tables") or [])} if st == 200 else {}
    zm_fields = {f["name"]: f for f in (tables.get("Zoom Meetings") or {}).get("fields") or []}

    if "Create XP Events" in zm_fields:
        meeting_fields["Create XP Events"] = False
    if "XP Award Status" in zm_fields:
        # Use name + typecast (id form can 422 on some single-selects)
        meeting_fields["XP Award Status"] = "Awarded"
    if "Meeting Status" in zm_fields:
        meeting_fields["Meeting Status"] = "Scheduled"

    meeting2_fields = dict(meeting_fields)
    meeting2_fields["Meeting Name"] = f"{TAG} conflict-meeting {stamp}"
    meeting2_fields["Start Time"] = "2026-07-19T06:30:00.000Z"

    st, m1 = api(
        "POST",
        f"https://api.airtable.com/v0/{base}/Zoom%20Meetings",
        token,
        {"fields": meeting_fields, "typecast": True},
    )
    result["created"]["meeting_eligible"] = {"status": st, "record": m1}
    meeting_id = m1.get("id") if st == 200 else None

    st, m2 = api(
        "POST",
        f"https://api.airtable.com/v0/{base}/Zoom%20Meetings",
        token,
        {"fields": meeting2_fields, "typecast": True},
    )
    result["created"]["meeting_conflict"] = {"status": st, "record": m2}
    meeting_conflict_id = m2.get("id") if st == 200 else None

    if not meeting_id:
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2)[:3000])
        raise SystemExit(1)

    za_table = "Zoom%20Attendance"

    def create_za(label: str, fields: dict) -> dict:
        payload = {"fields": fields, "typecast": True}
        status, body = api("POST", f"https://api.airtable.com/v0/{base}/{za_table}", token, payload)
        return {"label": label, "status": status, "id": body.get("id"), "fields": body.get("fields"), "raw": body}

    # 1 Eligible approved recording quiz
    eligible = create_za(
        "eligible_approved",
        {
            "Attendance Method": "Recording Quiz",
            "Enrollment": [SCHMIDT_ENROLLMENT],
            "Zoom Meeting": [meeting_id],
            "Recording Quiz Review Status": "Satisfactory",
            "Recording Quiz Satisfactory?": True,
            "Recording Quiz Submitted At": "2026-07-18T15:00:00.000Z",
            "Recording Quiz Coach Feedback": f"{TAG} eligible {stamp}",
        },
    )
    result["created"]["eligible_approved"] = eligible

    # 3 Missing approval (Needs Review)
    missing_approval = create_za(
        "missing_approval",
        {
            "Attendance Method": "Recording Quiz",
            "Enrollment": [SCHMIDT_ENROLLMENT],
            "Zoom Meeting": [meeting_id],
            "Recording Quiz Review Status": "Needs Review",
            "Recording Quiz Satisfactory?": False,
            "Recording Quiz Coach Feedback": f"{TAG} missing approval {stamp}",
        },
    )
    result["created"]["missing_approval"] = missing_approval

    # 4 Needs Correction
    needs_correction = create_za(
        "needs_correction",
        {
            "Attendance Method": "Recording Quiz",
            "Enrollment": [SCHMIDT_ENROLLMENT],
            "Zoom Meeting": [meeting_id],
            "Recording Quiz Review Status": "Needs Correction",
            "Recording Quiz Satisfactory?": False,
            "Recording Quiz Coach Feedback": f"{TAG} needs correction {stamp}",
        },
    )
    result["created"]["needs_correction"] = needs_correction

    # 5 Missing Enrollment — may fail create if required; try
    missing_enroll = create_za(
        "missing_enrollment",
        {
            "Attendance Method": "Recording Quiz",
            "Zoom Meeting": [meeting_id],
            "Recording Quiz Review Status": "Satisfactory",
            "Recording Quiz Satisfactory?": True,
            "Recording Quiz Coach Feedback": f"{TAG} missing enrollment {stamp}",
        },
    )
    result["created"]["missing_enrollment"] = missing_enroll

    # 6 Missing Zoom Meeting
    missing_meeting = create_za(
        "missing_meeting",
        {
            "Attendance Method": "Recording Quiz",
            "Enrollment": [SCHMIDT_ENROLLMENT],
            "Recording Quiz Review Status": "Satisfactory",
            "Recording Quiz Satisfactory?": True,
            "Recording Quiz Coach Feedback": f"{TAG} missing meeting {stamp}",
        },
    )
    result["created"]["missing_meeting"] = missing_meeting

    # 9 Live attendance conflict setup on conflict meeting
    if meeting_conflict_id:
        live = create_za(
            "live_sibling",
            {
                "Attendance Method": "Live",
                "Enrollment": [SCHMIDT_ENROLLMENT],
                "Zoom Meeting": [meeting_conflict_id],
                "Live Attendance Confirmed?": True,
                "Recording Quiz Coach Feedback": f"{TAG} live sibling {stamp}",
            },
        )
        result["created"]["live_sibling"] = live

        recording_conflict = create_za(
            "recording_with_live_conflict",
            {
                "Attendance Method": "Recording Quiz",
                "Enrollment": [SCHMIDT_ENROLLMENT],
                "Zoom Meeting": [meeting_conflict_id],
                "Recording Quiz Review Status": "Satisfactory",
                "Recording Quiz Satisfactory?": True,
                "Recording Quiz Coach Feedback": f"{TAG} recording conflict {stamp}",
            },
        )
        result["created"]["recording_with_live_conflict"] = recording_conflict

        # IMPORTANT: do NOT add Schmidt to meeting Attendees via this script for recording path.
        # For conflict formulas that detect live attendance via Live ZA / Live Attendance Confirmed?,
        # live sibling row above should be enough. If formula also requires Attendees roster,
        # note that as observation — we still must not use recording path to write Attendees.
        result["notes"].append(
            "Did not write Zoom Meetings.Attendees for recording fixtures (101 safety)."
        )

    # 13 Date boundary meeting already set; eligible uses it
    # Read back formula fields on eligible
    if eligible.get("id"):
        st, za = api(
            "GET",
            f"https://api.airtable.com/v0/{base}/{za_table}/{eligible['id']}",
            token,
        )
        result["eligible_readback"] = {"status": st, "fields": (za.get("fields") if st == 200 else za)}

    if meeting_conflict_id and result["created"].get("recording_with_live_conflict", {}).get("id"):
        rid = result["created"]["recording_with_live_conflict"]["id"]
        st, za = api("GET", f"https://api.airtable.com/v0/{base}/{za_table}/{rid}", token)
        result["conflict_readback"] = {"status": st, "fields": (za.get("fields") if st == 200 else za)}

    # Snapshot attendees on meetings (must remain empty / unchanged by recording path)
    for key, mid in [("meeting_eligible", meeting_id), ("meeting_conflict", meeting_conflict_id)]:
        if not mid:
            continue
        st, zm = api("GET", f"https://api.airtable.com/v0/{base}/Zoom%20Meetings/{mid}", token)
        fields = zm.get("fields") if st == 200 else {}
        result[f"{key}_attendees_snapshot"] = {
            "status": st,
            "attendees": fields.get("Attendees") if isinstance(fields, dict) else None,
            "create_xp_events": fields.get("Create XP Events") if isinstance(fields, dict) else None,
            "xp_award_status": fields.get("XP Award Status") if isinstance(fields, dict) else None,
            "meeting_status": fields.get("Meeting Status") if isinstance(fields, dict) else None,
        }

    result["paste_blocked"] = True
    result["paste_block_reason"] = "Automations Meta API 403 — Mike must paste v1.1.0 in UI before runs"
    result["manual_test_order"] = [
        "Paste orchestrator v1.1.0 + fix trigger; keep OFF",
        "Confirm no actions after script; webhook blank",
        "Temporarily enable 117 only",
        "Run Test / trigger on eligible_approved",
        "Verify XP then disable 117",
        "Continue remaining scenarios one at a time",
        "Leave 117 OFF",
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2)[:8000])
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
