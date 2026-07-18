"""Inspect C-025 Stage 17 fixtures for Applied? flags and Attendees (DEV only)."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_downstream_fixture_inspect.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"

ZA_IDS = {
    "eligible": "reciRsLuiJGYcea3U",
    "missing_approval": "recRMXO3Yy6olFlrk",
    "needs_correction": "recRhwglba8cK7NUH",
    "recording_conflict": "recwbD9fKLPRzVhQn",
    "live_sibling": "recVgsm8Zzg51gqNF",
}
MEETING_IDS = {
    "eligible": "recwnEKJAW8hxPSNL",
    "conflict": "rechIfspgLxgO4tL0",
}
SCHMIDT = "recgP9qZYjAhE7NXm"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api_get(base: str, token: str, table: str, rid: str) -> dict:
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}/{rid}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GET {table}/{rid} -> {e.code} {raw[:500]}") from e


def link_ids(val) -> list[str]:
    if not isinstance(val, list):
        return []
    out = []
    for x in val:
        if isinstance(x, dict):
            out.append(x.get("id") or "")
        else:
            out.append(str(x))
    return [x for x in out if x]


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base

    za_rows = {}
    for role, zid in ZA_IDS.items():
        f = api_get(base, token, "Zoom Attendance", zid).get("fields", {})
        za_rows[role] = {
            "id": zid,
            "method": f.get("Attendance Method"),
            "enrollment": link_ids(f.get("Enrollment")),
            "meeting": link_ids(f.get("Zoom Meeting")),
            "approved": f.get("Zoom Credit Approved?"),
            "conflict": f.get("Zoom Credit Conflict?"),
            "pw_flag": f.get("Effective Recording Counts for Perfect Week?"),
            "pw_applied": f.get("Perfect Week Credit Applied?"),
            "gate_earned": f.get("Zoom Gate Credit Earned?"),
            "gate_applied": f.get("Gate Credit Applied?"),
            "review": f.get("Recording Quiz Review Status"),
            "xp_active_key": f.get("Zoom Credit Key"),
        }

    meetings = {}
    for role, mid in MEETING_IDS.items():
        f = api_get(base, token, "Zoom Meetings", mid).get("fields", {})
        attendees = link_ids(f.get("Attendees"))
        meetings[role] = {
            "id": mid,
            "week": link_ids(f.get("Week")),
            "attendees": attendees,
            "attendees_count": len(attendees),
            "schmidt_live": SCHMIDT in attendees,
            "start": f.get("Start") or f.get("Start Date") or f.get("Meeting Start"),
        }

    week_ids = sorted({w for m in meetings.values() for w in m["week"]})

    # List WAS for Schmidt (limited)
    formula = f"FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}))"
    url = (
        f"https://api.airtable.com/v0/{base}/{urllib.parse.quote('Weekly Athlete Summary')}"
        f"?filterByFormula={urllib.parse.quote(formula)}&pageSize=50"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        body = json.load(resp)
    was_hits = []
    for rec in body.get("records", []):
        f = rec.get("fields", {})
        weeks = link_ids(f.get("Week"))
        was_hits.append(
            {
                "id": rec["id"],
                "week": weeks,
                "week_match": any(w in week_ids for w in weeks),
                "zoom_meeting_count": f.get("Perfect Week Zoom Meeting Count"),
                "zoom_attendance_count": f.get("Perfect Week Zoom Attendance Count"),
                "daily_met": f.get("Perfect Week Daily Requirement Met?"),
                "video_count": f.get("Perfect Week Video Count"),
            }
        )

    enr = api_get(base, token, "Enrollments", SCHMIDT).get("fields", {})
    enr_summary = {
        k: enr.get(k)
        for k in (
            "Total Zoom Attendances",
            "Current Level",
            "Next Level",
            "Level Status",
            "Level Gate Rule",
            "Lifetime XP Total",
            "Level Recalc Needed?",
        )
        if k in enr or True
    }

    premature = [
        {"role": role, "id": row["id"], "pw_applied": row["pw_applied"], "gate_applied": row["gate_applied"]}
        for role, row in za_rows.items()
        if row.get("pw_applied") or row.get("gate_applied")
    ]

    out = {
        "base": base,
        "schmidt": SCHMIDT,
        "zoom_attendance": za_rows,
        "meetings": meetings,
        "week_ids_from_meetings": week_ids,
        "was_for_schmidt_count": len(was_hits),
        "was_week_match": [w for w in was_hits if w["week_match"]],
        "was_sample": was_hits[:15],
        "enrollment_summary": enr_summary,
        "premature_applied_to_clear": premature,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, indent=2, default=str)[:5000])
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
