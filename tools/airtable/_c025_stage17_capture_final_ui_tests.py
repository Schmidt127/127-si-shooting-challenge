"""
Capture DEV record state after Mike runs Airtable UI Tests for 057/042.

Usage (after Mike enables → Test → OFF):
  python tools/airtable/_c025_stage17_capture_final_ui_tests.py
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ENV = Path(__file__).resolve().parent / ".env"
PREP = Path(__file__).resolve().parent / "_preview" / "c025_stage17_final_ui_test_prep.json"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_final_ui_test_capture.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"


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

    def get(self, table: str, rid: str) -> dict:
        url = f"https://api.airtable.com/v0/{self.base}/{urllib.parse.quote(table)}/{rid}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.token}"})
        try:
            with urllib.request.urlopen(req) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"GET {table}/{rid} -> {e.code} {raw[:500]}") from e


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base
    prep = json.loads(PREP.read_text(encoding="utf-8"))
    fx = prep["fixtures"]
    at = Airtable(base, token)

    za = at.get("Zoom Attendance", fx["zoom_attendance_eligible"]).get("fields", {})
    meeting = at.get("Zoom Meetings", fx["zoom_meeting"]).get("fields", {})
    was = at.get("Weekly Athlete Summary", fx["was_id"]).get("fields", {})
    enr = at.get("Enrollments", fx["enrollment"]).get("fields", {})

    before = prep["before"]
    after = {
        "za_eligible": {
            "pw_applied": za.get("Perfect Week Credit Applied?"),
            "gate_applied": za.get("Gate Credit Applied?"),
        },
        "meeting_attendees": link_ids(meeting.get("Attendees")),
        "was": {
            "automation_status": was.get("Perfect Week Automation Status"),
            "automation_error": was.get("Perfect Week Automation Error"),
            "zoom_meeting_count": was.get("Perfect Week Zoom Meeting Count"),
            "zoom_attendance_count": was.get("Perfect Week Zoom Attendance Count"),
            "zoom_requirement_met": was.get("Perfect Week Zoom Requirement Met?"),
            "zoom_requirement_status": was.get("Perfect Week Zoom Requirement Status"),
            "daily_met": was.get("Perfect Week Daily Requirement Met?"),
            "video_count": was.get("Perfect Week Video Count"),
            "eligible": was.get("Perfect Week Eligible?"),
        },
        "enrollment": {
            "current_level": link_ids(enr.get("Current Level")),
            "next_level": link_ids(enr.get("Next Level")),
            "level_status": enr.get("Level Status"),
            "level_recalc": enr.get("Level Recalc Needed?"),
            "total_zoom_formula": enr.get("Total Zoom Attendances"),
        },
    }

    checks = {
        "attendees_still_empty": after["meeting_attendees"] == [],
        "pw_applied_true": after["za_eligible"]["pw_applied"] is True,
        "gate_applied_true": after["za_eligible"]["gate_applied"] is True,
        "was_zoom_attendance_ge_1": (after["was"]["zoom_attendance_count"] or 0) >= 1,
        "was_ready_or_error": after["was"]["automation_status"] in ("Ready", "Error", "Pending"),
        "057_likely_ran": after["was"]["automation_status"] == "Ready"
        and (after["was"]["zoom_attendance_count"] or 0) >= 1,
        "042_likely_ran": after["za_eligible"]["gate_applied"] is True,
    }

    out = {
        "base": base,
        "fixtures": fx,
        "before": before,
        "after": after,
        "checks": checks,
        "note": "Airtable run-history status/outputs must be pasted by Mike (API cannot read them).",
    }
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"checks": checks, "after": after}, indent=2, default=str))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
