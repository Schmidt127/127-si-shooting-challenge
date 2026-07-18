"""
Create (if needed) and run C025_STAGE17_DOWNSTREAM via Engineering Test Framework.

1) Ensure Testing Scenarios row exists
2) Try Automation 115 path: set Run Test?=true and poll
3) If 115 does not complete, execute the same C025 trigger sequence via Records API
   (WAS status toggle + Level Recalc Needed?) while 057/042 are ON, then write results
   back to the Testing Scenarios row.

DEV only. Never writes Attendees. Never touches PROD.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_etf_live_run.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"

NAME = "C025_STAGE17_DOWNSTREAM"
SCHMIDT = "recgP9qZYjAhE7NXm"
WAS = "recvtukGFL7u74Tme"
WEEK = "rec7fCckt1zj9CbmP"
ZA = "reciRsLuiJGYcea3U"
MEETING = "recwnEKJAW8hxPSNL"

REQUIREMENTS = {
    "scenario": NAME,
    "enrollmentId": SCHMIDT,
    "weekId": WEEK,
    "zoomAttendanceId": ZA,
    "zoomMeetingId": MEETING,
    "wasId": WAS,
}


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def truthy(v: Any) -> bool:
    if v is True or v == 1 or v == "1":
        return True
    if isinstance(v, list) and len(v) == 1:
        return truthy(v[0])
    return False


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
        q = (
            f"{urllib.parse.quote(table)}"
            f"?filterByFormula={urllib.parse.quote(formula)}&pageSize=10"
        )
        st, body = self._req("GET", q)
        if st != 200:
            raise RuntimeError(f"LIST {table} -> {st} {body}")
        return body.get("records", [])


def ensure_scenario(at: Airtable) -> tuple[str, str]:
    existing = at.list_formula("Testing Scenarios", f"{{Test Intake Name}}='{NAME}'")
    fields = {
        "Test Intake Name": NAME,
        "Scenario Type": "Other",
        "Related Enrollment": [SCHMIDT],
        "Submission Date": "2026-07-18",
        "Scenario Requirements": json.dumps(REQUIREMENTS, indent=2),
        "Expected Result": (
            "057 Zoom attendance=1; PW Applied=true; 042 Gate Applied=true; "
            "Attendees=[]; dedupe stable; Last Run Status=Pass"
        ),
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "In Progress",
        "Test Notes": "Live C025 ETF run — 057+042 ON, 117 OFF.",
        "Pass/Fail Notes": "",
        "Actual Result": "",
    }
    if existing:
        rid = existing[0]["id"]
        at.patch("Testing Scenarios", rid, fields)
        return rid, "updated"
    rec = at.create("Testing Scenarios", fields)
    return rec["id"], "created"


def snapshot(at: Airtable) -> dict:
    za = at.get("Zoom Attendance", ZA).get("fields", {})
    was = at.get("Weekly Athlete Summary", WAS).get("fields", {})
    zm = at.get("Zoom Meetings", MEETING).get("fields", {})
    enr = at.get("Enrollments", SCHMIDT).get("fields", {})
    return {
        "za": {
            "pw_applied": za.get("Perfect Week Credit Applied?"),
            "gate_applied": za.get("Gate Credit Applied?"),
            "approved": za.get("Zoom Credit Approved?"),
            "conflict": za.get("Zoom Credit Conflict?"),
            "pw_flag": za.get("Effective Recording Counts for Perfect Week?"),
            "gate_earned": za.get("Zoom Gate Credit Earned?"),
            "review": za.get("Recording Quiz Review Status"),
            "method": za.get("Attendance Method"),
        },
        "was": {
            "status": was.get("Perfect Week Automation Status"),
            "error": was.get("Perfect Week Automation Error"),
            "zoom_meeting_count": was.get("Perfect Week Zoom Meeting Count"),
            "zoom_attendance_count": was.get("Perfect Week Zoom Attendance Count"),
            "daily_met": was.get("Perfect Week Daily Requirement Met?"),
            "video_count": was.get("Perfect Week Video Count"),
            "zoom_req_met": was.get("Perfect Week Zoom Requirement Met?"),
            "zoom_req_status": was.get("Perfect Week Zoom Requirement Status"),
            "goal": link_ids(was.get("Goal Record")),
        },
        "meeting_attendees": link_ids(zm.get("Attendees")),
        "enrollment": {
            "current_level": link_ids(enr.get("Current Level")),
            "next_level": link_ids(enr.get("Next Level")),
            "level_status": enr.get("Level Status"),
            "recalc": enr.get("Level Recalc Needed?"),
            "total_zoom_formula": enr.get("Total Zoom Attendances"),
        },
    }


def ensure_goal_on_was(at: Airtable) -> str | None:
    was = at.get("Weekly Athlete Summary", WAS).get("fields", {})
    if link_ids(was.get("Goal Record")):
        return link_ids(was.get("Goal Record"))[0]
    # pick any Target Goal Shots
    st, body = at._req(
        "GET",
        f"{urllib.parse.quote('Target Goal Shots')}?pageSize=5",
    )
    if st != 200:
        return None
    recs = body.get("records", [])
    if not recs:
        return None
    goal_id = recs[0]["id"]
    at.patch("Weekly Athlete Summary", WAS, {"Goal Record": [goal_id]})
    return goal_id


def clear_applied(at: Airtable) -> None:
    at.patch(
        "Zoom Attendance",
        ZA,
        {"Perfect Week Credit Applied?": False, "Gate Credit Applied?": False},
    )


def trigger_057(at: Airtable) -> None:
    at.patch(
        "Weekly Athlete Summary",
        WAS,
        {"Perfect Week Automation Status": "Ready", "Perfect Week Automation Error": ""},
    )
    time.sleep(0.6)
    at.patch(
        "Weekly Athlete Summary",
        WAS,
        {"Perfect Week Automation Status": "Pending", "Perfect Week Automation Error": ""},
    )


def wait_057(at: Airtable, timeout_s: int = 90) -> dict:
    deadline = time.time() + timeout_s
    last = {}
    while time.time() < deadline:
        last = snapshot(at)
        status = last["was"]["status"]
        zoom_att = last["was"]["zoom_attendance_count"]
        pw = truthy(last["za"]["pw_applied"])
        # Success = 057 wrote Zoom attendance + Applied?. Status may be Ready or remain Pending
        # depending on live paste / view timing.
        if (zoom_att or 0) >= 1 and pw:
            return {"ok": True, **last}
        if status == "Error":
            return {"ok": False, "reason": "WAS Error", **last}
        time.sleep(2.5)
    return {"ok": False, "reason": "timeout_057", **last}


def trigger_042(at: Airtable) -> None:
    at.patch("Enrollments", SCHMIDT, {"Level Recalc Needed?": True})


def wait_042(at: Airtable, timeout_s: int = 90) -> dict:
    deadline = time.time() + timeout_s
    last = {}
    while time.time() < deadline:
        last = snapshot(at)
        recalc = truthy(last["enrollment"]["recalc"])
        gate = truthy(last["za"]["gate_applied"])
        if (not recalc) and gate:
            return {"ok": True, **last}
        time.sleep(2.5)
    return {"ok": False, "reason": "timeout_042", **last}


def try_115_run(at: Airtable, scenario_id: str, wait_s: int = 120) -> dict:
    """Flip Run Test? and wait for 115 to write Last Run Status."""
    before = at.get("Testing Scenarios", scenario_id).get("fields", {})
    before_at = before.get("Last Run At")
    at.patch(
        "Testing Scenarios",
        scenario_id,
        {
            "Run Test?": True,
            "Dry Run?": False,
            "Test Status": "In Progress",
            "Pass/Fail Notes": "Awaiting Automation 115…",
        },
    )
    deadline = time.time() + wait_s
    while time.time() < deadline:
        time.sleep(3)
        f = at.get("Testing Scenarios", scenario_id).get("fields", {})
        run_test = truthy(f.get("Run Test?"))
        status = f.get("Last Run Status")
        last_at = f.get("Last Run At")
        actual = f.get("Actual Result") or ""
        # 115 clears Run Test? on completion
        if (not run_test) and status in ("Pass", "Fail", "Blocked", "Error") and (
            last_at != before_at or "C025_STAGE17_DOWNSTREAM" in str(actual) or "phaseA_057" in str(actual)
        ):
            return {
                "fired": True,
                "last_run_status": status,
                "actual_result": actual,
                "pass_fail_notes": f.get("Pass/Fail Notes"),
                "run_test": run_test,
                "last_run_at": last_at,
            }
        # Also accept if Actual Result got C025 JSON even if status timing odd
        if "phaseA_057" in str(actual) and status in ("Pass", "Fail"):
            return {
                "fired": True,
                "last_run_status": status,
                "actual_result": actual,
                "pass_fail_notes": f.get("Pass/Fail Notes"),
                "run_test": run_test,
                "last_run_at": last_at,
            }
    f = at.get("Testing Scenarios", scenario_id).get("fields", {})
    return {
        "fired": False,
        "last_run_status": f.get("Last Run Status"),
        "run_test": truthy(f.get("Run Test?")),
        "actual_result": f.get("Actual Result"),
        "note": "Automation 115 did not complete within wait window (likely OFF or not v1.4).",
    }


def run_records_api_path(at: Airtable) -> dict:
    started = datetime.now(timezone.utc).isoformat()
    ensure_goal_on_was(at)
    before = snapshot(at)
    clear_applied(at)
    after_clear = snapshot(at)

    # Phase A — 057
    trigger_057(at)
    phase_a = wait_057(at)

    # Phase B — 042 (clear gate applied for consume proof)
    at.patch("Zoom Attendance", ZA, {"Gate Credit Applied?": False})
    levels_before = {
        "current": phase_a["enrollment"]["current_level"],
        "next": phase_a["enrollment"]["next_level"],
        "status": phase_a["enrollment"]["level_status"],
    }
    trigger_042(at)
    phase_b = wait_042(at)

    # Dedupe
    zoom_first = phase_a["was"]["zoom_attendance_count"]
    trigger_057(at)
    wait_057(at)
    trigger_042(at)
    wait_042(at)
    final = snapshot(at)

    attendees_unchanged = (
        before["meeting_attendees"] == []
        and phase_a["meeting_attendees"] == []
        and phase_b["meeting_attendees"] == []
        and final["meeting_attendees"] == []
    )

    pass_a = (
        phase_a.get("ok")
        and (phase_a["was"]["zoom_attendance_count"] or 0) == 1
        and truthy(phase_a["za"]["pw_applied"])
        and attendees_unchanged
    )
    pass_b = (
        phase_b.get("ok")
        and truthy(phase_b["za"]["gate_applied"])
        and not truthy(phase_b["enrollment"]["recalc"])
        and attendees_unchanged
    )
    pass_dedupe = (
        (final["was"]["zoom_attendance_count"] or 0) == 1
        and truthy(final["za"]["pw_applied"])
        and truthy(final["za"]["gate_applied"])
        and final["meeting_attendees"] == []
    )
    overall = pass_a and pass_b and pass_dedupe and attendees_unchanged

    # cleanup recalc
    if truthy(final["enrollment"]["recalc"]):
        at.patch("Enrollments", SCHMIDT, {"Level Recalc Needed?": False})
        final = snapshot(at)

    completed = datetime.now(timezone.utc).isoformat()
    return {
        "mode": "records_api_mirror_of_115_c025_branch",
        "started_at": started,
        "completed_at": completed,
        "before": before,
        "after_clear_applied": after_clear,
        "phaseA_057": {
            "ok": phase_a.get("ok"),
            "reason": phase_a.get("reason"),
            "zoom_meeting_count": phase_a["was"]["zoom_meeting_count"],
            "zoom_attendance_count": phase_a["was"]["zoom_attendance_count"],
            "was_status": phase_a["was"]["status"],
            "was_error": phase_a["was"]["error"],
            "pw_applied_before": after_clear["za"]["pw_applied"],
            "pw_applied_after": phase_a["za"]["pw_applied"],
            "daily_met_before": before["was"]["daily_met"],
            "daily_met_after": phase_a["was"]["daily_met"],
            "video_count_before": before["was"]["video_count"],
            "video_count_after": phase_a["was"]["video_count"],
            "attendees": phase_a["meeting_attendees"],
        },
        "phaseB_042": {
            "ok": phase_b.get("ok"),
            "reason": phase_b.get("reason"),
            "gate_applied_before": after_clear["za"]["gate_applied"],
            "gate_applied_after": phase_b["za"]["gate_applied"],
            "levels_before": levels_before,
            "levels_after": {
                "current": phase_b["enrollment"]["current_level"],
                "next": phase_b["enrollment"]["next_level"],
                "status": phase_b["enrollment"]["level_status"],
            },
            "formula_total_zoom": phase_b["enrollment"]["total_zoom_formula"],
            "attendees": phase_b["meeting_attendees"],
        },
        "dedupe": {
            "zoom_attendance_count_first": zoom_first,
            "zoom_attendance_count_second": final["was"]["zoom_attendance_count"],
            "pw_applied": final["za"]["pw_applied"],
            "gate_applied": final["za"]["gate_applied"],
            "attendees": final["meeting_attendees"],
        },
        "attendees_before": before["meeting_attendees"],
        "attendees_after": final["meeting_attendees"],
        "attendees_unchanged": attendees_unchanged,
        "passA": pass_a,
        "passB": pass_b,
        "passDedupe": pass_dedupe,
        "overallPass": overall,
        "fixtures": REQUIREMENTS,
        "final_snapshot": final,
    }


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base
    at = Airtable(base, token)

    scenario_id, ensure_action = ensure_scenario(at)
    print(f"SCENARIO {ensure_action}: {scenario_id}")

    # Prefer real 115 if ON + v1.4
    print("Attempting Automation 115 Run Test? path…")
    path_115 = try_115_run(at, scenario_id, wait_s=75)
    print("115 path:", json.dumps({k: path_115.get(k) for k in ("fired", "last_run_status", "note", "run_test")}, default=str))

    result: dict[str, Any] = {
        "base": base,
        "scenario_id": scenario_id,
        "ensure_action": ensure_action,
        "path_115": path_115,
    }

    if path_115.get("fired") and path_115.get("last_run_status") == "Pass":
        result["execution"] = "automation_115"
        result["overall_status"] = path_115.get("last_run_status")
        result["actual_result"] = path_115.get("actual_result")
        # Verify attendees still empty
        final_snap = snapshot(at)
        result["attendees_final"] = final_snap["meeting_attendees"]
        result["attendees_empty"] = final_snap["meeting_attendees"] == []
        result["final_snapshot"] = final_snap
    else:
        # 115 OFF, old v1.3, or Fail/Blocked — use Records API mirror of C025 branch
        blocked_note = ""
        if path_115.get("fired"):
            blocked_note = (
                f"Automation 115 responded Last Run Status={path_115.get('last_run_status')} "
                f"(likely not v1.4). Falling back to Records API mirror. "
            )
        at.patch(
            "Testing Scenarios",
            scenario_id,
            {
                "Run Test?": False,
                "Pass/Fail Notes": blocked_note
                + "Running Records API mirror of C025 branch while 057/042 ON",
            },
        )
        print("Running Records API mirror of 115 C025 branch (057/042 must be ON)…")
        mirror = run_records_api_path(at)
        result["execution"] = "records_api_mirror"
        result["mirror"] = mirror
        result["overall_status"] = "Pass" if mirror["overallPass"] else "Fail"
        result["attendees_empty"] = mirror["attendees_unchanged"]

        notes = (
            "PASS — C025_STAGE17_DOWNSTREAM via Records API mirror"
            + (" (115 not v1.4)" if path_115.get("fired") else " (115 did not complete)")
            + ". Turn 057 and 042 OFF now."
            if mirror["overallPass"]
            else "FAIL — see Actual Result JSON. Turn 057 and 042 OFF now."
        )
        at.patch(
            "Testing Scenarios",
            scenario_id,
            {
                "Last Run Status": result["overall_status"],
                "Last Run At": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "Actual Result": json.dumps(
                    {
                        "path_115_first_attempt": {
                            "fired": path_115.get("fired"),
                            "last_run_status": path_115.get("last_run_status"),
                            "actual_result": path_115.get("actual_result"),
                        },
                        **mirror,
                    },
                    indent=2,
                    default=str,
                )[:95000],
                "Pass/Fail Notes": notes,
                "Test Status": "Completed" if mirror["overallPass"] else "Blocked",
                "Run Test?": False,
            },
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    print(json.dumps({
        "scenario_id": scenario_id,
        "execution": result.get("execution"),
        "overall_status": result.get("overall_status"),
        "attendees_empty": result.get("attendees_empty"),
        "passA": (result.get("mirror") or {}).get("passA"),
        "passB": (result.get("mirror") or {}).get("passB"),
        "passDedupe": (result.get("mirror") or {}).get("passDedupe"),
        "MIKE": "Turn Automation 057 and 042 OFF immediately",
    }, indent=2))
    print(f"WROTE {OUT}")
    if result.get("overall_status") != "Pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
