"""
Prepare isolated DEV fixtures for final Airtable UI Tests of 057/042.

Hard rules:
- DEV only
- Never write Attendees
- Do not enable automations (API 403 anyway)
- Clear Applied? on named C-025 eligible fixture before Mike Test
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_final_ui_test_prep.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"

SCHMIDT = "recgP9qZYjAhE7NXm"
WEEK = "rec7fCckt1zj9CbmP"
ZA_ELIGIBLE = "reciRsLuiJGYcea3U"
MEETING = "recwnEKJAW8hxPSNL"
MEETING_CONFLICT = "rechIfspgLxgO4tL0"
TAG = "C025-S17-DOWNSTREAM-UI-TEST"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def link_ids(val: Any) -> list[str]:
    if not isinstance(val, list):
        return []
    out = []
    for x in val:
        if isinstance(x, dict):
            out.append(x.get("id") or "")
        else:
            out.append(str(x))
    return [x for x in out if x]


class Airtable:
    def __init__(self, base: str, token: str):
        self.base = base
        self.token = token

    def _req(self, method: str, path: str, body: dict | None = None) -> tuple[int, Any]:
        url = f"https://api.airtable.com/v0/{self.base}/{path}"
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
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

    def get(self, table: str, rid: str) -> dict:
        st, body = self._req("GET", f"{urllib.parse.quote(table)}/{rid}")
        if st != 200:
            raise RuntimeError(f"GET {table}/{rid} -> {st} {body}")
        return body

    def patch(self, table: str, rid: str, fields: dict) -> dict:
        if "Attendees" in fields:
            raise RuntimeError("Refuse Attendees write")
        st, body = self._req(
            "PATCH",
            f"{urllib.parse.quote(table)}/{rid}",
            {"fields": fields, "typecast": True},
        )
        if st not in (200, 201):
            raise RuntimeError(f"PATCH {table}/{rid} -> {st} {body}")
        time.sleep(0.25)
        return body

    def create(self, table: str, fields: dict) -> dict:
        if "Attendees" in fields:
            raise RuntimeError("Refuse Attendees write")
        st, body = self._req(
            "POST",
            urllib.parse.quote(table),
            {"fields": fields, "typecast": True},
        )
        if st not in (200, 201):
            raise RuntimeError(f"POST {table} -> {st} {body}")
        time.sleep(0.25)
        return body

    def list_formula(self, table: str, formula: str) -> list[dict]:
        q = f"{urllib.parse.quote(table)}?filterByFormula={urllib.parse.quote(formula)}&pageSize=20"
        st, body = self._req("GET", q)
        if st != 200:
            raise RuntimeError(f"LIST {table} -> {st} {body}")
        return body.get("records", [])


def snapshot_za(at: Airtable, za_id: str) -> dict:
    f = at.get("Zoom Attendance", za_id).get("fields", {})
    return {
        "id": za_id,
        "pw_applied": f.get("Perfect Week Credit Applied?"),
        "gate_applied": f.get("Gate Credit Applied?"),
        "approved": f.get("Zoom Credit Approved?"),
        "conflict": f.get("Zoom Credit Conflict?"),
        "pw_flag": f.get("Effective Recording Counts for Perfect Week?"),
        "gate_earned": f.get("Zoom Gate Credit Earned?"),
        "review": f.get("Recording Quiz Review Status"),
        "meeting": link_ids(f.get("Zoom Meeting")),
        "enrollment": link_ids(f.get("Enrollment")),
    }


def snapshot_meeting(at: Airtable, mid: str) -> dict:
    f = at.get("Zoom Meetings", mid).get("fields", {})
    return {"id": mid, "attendees": link_ids(f.get("Attendees")), "week": link_ids(f.get("Week"))}


def snapshot_was(at: Airtable, was_id: str) -> dict:
    f = at.get("Weekly Athlete Summary", was_id).get("fields", {})
    keys = [
        "Enrollment",
        "Week",
        "Perfect Week Automation Status",
        "Perfect Week Automation Error",
        "Perfect Week Daily Requirement Met?",
        "Perfect Week Daily Check Status",
        "Perfect Week Video Count",
        "Perfect Week Zoom Meeting Count",
        "Perfect Week Zoom Attendance Count",
        "Perfect Week Zoom Requirement Met?",
        "Perfect Week Zoom Requirement Status",
        "Perfect Week Eligible?",
        "Perfect Week Homework Requirement Met?",
        "Perfect Week Calculation Queue?",
    ]
    return {"id": was_id, "fields": {k: f.get(k) for k in keys}}


def snapshot_enrollment(at: Airtable, eid: str) -> dict:
    f = at.get("Enrollments", eid).get("fields", {})
    keys = [
        "Current Level",
        "Next Level",
        "Level Gate Rule",
        "Level Status",
        "Level Recalc Needed?",
        "Total Zoom Attendances",
        "Lifetime XP Total",
    ]
    return {"id": eid, "fields": {k: f.get(k) for k in keys}}


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base
    at = Airtable(base, token)

    # Clear premature Applied? on eligible fixture only
    before_clear = snapshot_za(at, ZA_ELIGIBLE)
    at.patch(
        "Zoom Attendance",
        ZA_ELIGIBLE,
        {"Perfect Week Credit Applied?": False, "Gate Credit Applied?": False},
    )
    after_clear = snapshot_za(at, ZA_ELIGIBLE)

    # Find Goal Record for Schmidt (optional — table name varies)
    goal_id = None
    for table_name in ("Goals", "Goal Records", "Athlete Goals", "Shooting Goals"):
        try:
            goals = at.list_formula(
                table_name,
                f"FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}))",
            )
            if goals:
                goal_id = goals[0]["id"]
                break
        except RuntimeError:
            continue

    # Also try from Enrollment linked Goal Record field if present
    if not goal_id:
        enr_f = at.get("Enrollments", SCHMIDT).get("fields", {})
        for key in ("Goal Record", "Goals", "Current Goal"):
            ids = link_ids(enr_f.get(key))
            if ids:
                goal_id = ids[0]
                break

    # Find existing tagged WAS or create
    existing = at.list_formula(
        "Weekly Athlete Summary",
        f"AND(FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}})), FIND('{WEEK}', ARRAYJOIN({{Week}})))",
    )
    was_id = None
    was_created = False
    if existing:
        was_id = existing[0]["id"]
    else:
        fields: dict[str, Any] = {
            "Enrollment": [SCHMIDT],
            "Week": [WEEK],
            "Perfect Week Automation Status": "Pending",
            "Perfect Week Automation Error": "",
            "Perfect Week Zoom Meeting Count": None,
            "Perfect Week Zoom Attendance Count": None,
        }
        # Optional marker in error/detail fields until Test runs
        fields["Perfect Week Daily Check Detail"] = f"{TAG} isolated fixture — safe to Test 057"
        if goal_id:
            fields["Goal Record"] = [goal_id]
        created = at.create("Weekly Athlete Summary", fields)
        was_id = created["id"]
        was_created = True

    # Ensure Pending status for queue / Test clarity
    at.patch(
        "Weekly Athlete Summary",
        was_id,
        {
            "Perfect Week Automation Status": "Pending",
            "Perfect Week Automation Error": "",
            "Perfect Week Daily Check Detail": f"{TAG} ready for 057 Test",
        },
    )

    # Gate rule min zoom
    enr = snapshot_enrollment(at, SCHMIDT)
    gate_rule_ids = link_ids(enr["fields"].get("Level Gate Rule"))
    gate_detail = None
    if gate_rule_ids:
        gf = at.get("Level Gate Rules", gate_rule_ids[0]).get("fields", {})
        gate_detail = {
            "id": gate_rule_ids[0],
            "minimum_zoom": gf.get("Minimum Zoom Meetings"),
            "gate_enabled": gf.get("Gate Enabled?"),
        }

    # Ensure Level Recalc Needed? is unchecked before Mike enables 042
    # (Mike will Test with recordId; do not leave recalc checked while OFF)
    at.patch("Enrollments", SCHMIDT, {"Level Recalc Needed?": False})

    out = {
        "base": base,
        "tag": TAG,
        "automations_api": 403,
        "cursor_cannot_enable_or_test": True,
        "mike_confirmed_paste": {
            "057": "v1.3 OFF",
            "042": "v3.1 OFF",
            "117": "v1.1.1 OFF (do not test this task)",
        },
        "cleared_applied": {"before": before_clear, "after": after_clear},
        "fixtures": {
            "enrollment": SCHMIDT,
            "week": WEEK,
            "zoom_attendance_eligible": ZA_ELIGIBLE,
            "zoom_meeting": MEETING,
            "zoom_meeting_conflict": MEETING_CONFLICT,
            "was_id": was_id,
            "was_created": was_created,
            "goal_id": goal_id,
        },
        "before": {
            "za_eligible": snapshot_za(at, ZA_ELIGIBLE),
            "meeting": snapshot_meeting(at, MEETING),
            "meeting_conflict": snapshot_meeting(at, MEETING_CONFLICT),
            "was": snapshot_was(at, was_id),
            "enrollment": snapshot_enrollment(at, SCHMIDT),
            "gate_rule": gate_detail,
        },
        "mike_test_card": {
            "test1_057": [
                "Enable ONLY Automation 057",
                f"Use Test / Run with recordId = {was_id}",
                "Capture run status + outputs + errors from run history",
                "Disable Automation 057 immediately",
            ],
            "test2_042": [
                "Confirm 057 is OFF",
                "Enable ONLY Automation 042",
                f"Use Test / Run with recordId = {SCHMIDT}",
                "Optional: if using view trigger instead, check Level Recalc Needed? then uncheck after",
                "Capture run status + outputs (incl effectiveZoomCountOut if configured) + errors",
                "Disable Automation 042 immediately",
            ],
            "dedupe_rerun": [
                "With 057 OFF and 042 OFF, re-enable one at a time and Test the same recordId once more",
                "Confirm Applied? stays true; Zoom attendance count stays 1; Attendees still empty",
                "Disable again",
            ],
            "after_mike_runs": "Tell Cursor 'UI tests done' so Records API capture can finalize docs",
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, indent=2, default=str))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
