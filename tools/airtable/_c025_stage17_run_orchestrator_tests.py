"""
C-025 Stage 17 orchestrator DEV harness (v1.1.0 equivalent).

Why: Automations Meta API returns 403 — Cursor cannot enable/disable/run
Airtable Automations. Mike confirmed 117 v1.1.0 is pasted and OFF.

This harness executes the same business logic as
117-zoom-recording-credit-orchestrator.js against DEV records via REST,
keeping Automation 117 OFF (safer than leaving it ON).

Hard rules:
- DEV base only
- Never write Zoom Meetings.Attendees
- webhookUrl blank => no email/Make
- Soft-void only (Active?=false); no XP deletes by default
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
from zoneinfo import ZoneInfo

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_orchestrator_test_results.json"
BASE_EXPECTED = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
VERSION = "v1.1.0"
AWARDED_BY = "117-orchestrator-v1.1.0"
REASON_PUBLIC = "Zoom recording quiz credit"
BUCKET = "Zoom Attendance"
SOURCE = "Zoom Meeting Recording Quiz"
DENVER = ZoneInfo("America/Denver")

FIXTURES = {
    "eligible": "reciRsLuiJGYcea3U",
    "missing_approval": "recRMXO3Yy6olFlrk",
    "needs_correction": "recRhwglba8cK7NUH",
    "missing_enrollment": "recf3nLZDDCEupt3e",
    "missing_meeting": "recgwpubxhs76fXUZ",
    "live_sibling": "recVgsm8Zzg51gqNF",
    "recording_conflict": "recwbD9fKLPRzVhQn",
    "meeting_eligible": "recwnEKJAW8hxPSNL",
    "meeting_conflict": "rechIfspgLxgO4tL0",
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
            raise RuntimeError("Refuse write to Attendees")
        st, body = self._req(
            "PATCH",
            f"{urllib.parse.quote(table)}/{rid}",
            {"fields": fields, "typecast": True},
        )
        if st != 200:
            raise RuntimeError(f"PATCH {table}/{rid} -> {st} {body}")
        return body

    def create(self, table: str, fields: dict) -> dict:
        if "Attendees" in fields:
            raise RuntimeError("Refuse write to Attendees")
        st, body = self._req(
            "POST",
            urllib.parse.quote(table),
            {"fields": fields, "typecast": True},
        )
        if st != 200:
            raise RuntimeError(f"POST {table} -> {st} {body}")
        return body

    def find_xp_by_source_key(self, source_key: str) -> list[dict]:
        formula = urllib.parse.quote(f"{{Source Key}}='{source_key}'")
        st, body = self._req(
            "GET",
            f"XP%20Events?filterByFormula={formula}&maxRecords=10",
        )
        if st != 200:
            raise RuntimeError(f"XP query -> {st} {body}")
        return body.get("records") or []


def as_list_ids(val: Any) -> list[str]:
    if not val:
        return []
    if isinstance(val, list):
        out = []
        for x in val:
            if isinstance(x, dict) and x.get("id"):
                out.append(x["id"])
            elif isinstance(x, str):
                out.append(x)
        return out
    if isinstance(val, dict) and val.get("id"):
        return [val["id"]]
    return []


def truthy(val: Any) -> bool:
    if val is True or val == 1 or val == "1":
        return True
    if isinstance(val, list) and len(val) == 1:
        return truthy(val[0])
    return False


def text(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        if not val:
            return ""
        return text(val[0])
    return str(val).strip()


def number(val: Any) -> float | None:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, list) and len(val) == 1:
        return number(val[0])
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def denver_date_key_from_iso(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    local = dt.astimezone(DENVER)
    return local.strftime("%Y-%m-%d")


def date_only_from_key(date_key: str) -> str:
    # Airtable dateTime: noon UTC on that calendar day (matches orchestrator)
    y, m, d = date_key.split("-")
    return f"{y}-{m}-{d}T12:00:00.000Z"


def snapshot_meeting(at: Airtable, meeting_id: str | None) -> dict:
    if not meeting_id:
        return {"attendees": [], "create_xp": None, "award_status": None, "meeting_status": None}
    rec = at.get("Zoom Meetings", meeting_id)
    f = rec.get("fields") or {}
    return {
        "attendees": as_list_ids(f.get("Attendees")),
        "create_xp": f.get("Create XP Events"),
        "award_status": f.get("XP Award Status"),
        "meeting_status": f.get("Meeting Status"),
        "start_time": f.get("Start Time"),
    }


def snapshot_za(at: Airtable, rid: str) -> dict:
    rec = at.get("Zoom Attendance", rid)
    f = rec.get("fields") or {}
    return {
        "id": rid,
        "method": f.get("Attendance Method"),
        "enrollment": as_list_ids(f.get("Enrollment")),
        "meeting": as_list_ids(f.get("Zoom Meeting")),
        "review": f.get("Recording Quiz Review Status"),
        "satisfactory": f.get("Recording Quiz Satisfactory?"),
        "correction_count": f.get("Recording Quiz Correction Count"),
        "approved": f.get("Zoom Credit Approved?"),
        "conflict": f.get("Zoom Credit Conflict?"),
        "amount": f.get("Zoom XP Amount"),
        "key": f.get("Zoom Credit Key"),
        "debug": f.get("Zoom Credit Debug"),
        "gate_earned": f.get("Zoom Gate Credit Earned?"),
        "gate_applied": f.get("Gate Credit Applied?"),
        "pw_flag": f.get("Effective Recording Counts for Perfect Week?"),
        "pw_applied": f.get("Perfect Week Credit Applied?"),
        "send_key": f.get("Recording Approval Email Send Key"),
        "sent_at": f.get("Recording Approval Email Sent At"),
    }


def run_orchestrator(at: Airtable, record_id: str, webhook_url: str = "") -> dict:
    """Mirror 117 orchestrator v1.1.0 outputs."""
    out: dict[str, Any] = {
        "statusOut": "",
        "errorOut": "",
        "debugStep": "",
        "actionOut": "",
        "normalizeAction": "",
        "reviewAction": "",
        "actionCOut": "",  # xp
        "actionDOut": "",  # gate
        "actionEOut": "",  # pw
        "actionFOut": "",  # email
        "xpEventId": "",
        "xpPoints": "",
        "sourceKeyOut": "",
        "attendeesWriteAttempted": False,
        "version": VERSION,
    }
    try:
        out["debugStep"] = "1 - Validate input"
        if not record_id or not str(record_id).startswith("rec"):
            raise RuntimeError(f"Invalid recordId: {record_id}")

        za = at.get("Zoom Attendance", record_id)
        f = dict(za.get("fields") or {})

        method = text(f.get("Attendance Method"))
        if method and method != "Recording Quiz":
            out.update(statusOut="skipped", actionOut="skipped_not_recording_quiz", debugStep="complete")
            return out

        enroll_ids = as_list_ids(f.get("Enrollment"))
        meeting_ids = as_list_ids(f.get("Zoom Meeting"))
        if not enroll_ids:
            raise RuntimeError("Missing Enrollment link on Zoom Attendance")
        if not meeting_ids:
            raise RuntimeError("Missing Zoom Meeting link on Zoom Attendance")

        # A normalize
        out["debugStep"] = "4A - Normalize"
        normalize_patch: dict = {}
        if not text(f.get("Recording Quiz Review Status")):
            normalize_patch["Recording Quiz Review Status"] = "Needs Review"
        if not f.get("Recording Quiz Submitted At"):
            normalize_patch["Recording Quiz Submitted At"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        normalize_action = "skipped_already_normalized"
        if normalize_patch:
            at.patch("Zoom Attendance", record_id, normalize_patch)
            normalize_action = "normalized"
            f = dict(at.get("Zoom Attendance", record_id).get("fields") or {})
        out["normalizeAction"] = normalize_action

        # B review
        out["debugStep"] = "4B - Coach review"
        review_status = text(f.get("Recording Quiz Review Status"))
        sat = truthy(f.get("Recording Quiz Satisfactory?"))
        review_patch: dict = {}
        review_action = "skipped_unchanged"
        if review_status == "Satisfactory" and not sat:
            review_patch["Recording Quiz Satisfactory?"] = True
            review_patch["Recording Quiz Reviewed At"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            review_action = "marked_satisfactory"
        elif review_status == "Needs Correction" and sat:
            review_patch["Recording Quiz Satisfactory?"] = False
            review_patch["Recording Quiz Needs Correction At"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            cur = number(f.get("Recording Quiz Correction Count")) or 0
            review_patch["Recording Quiz Correction Count"] = cur + 1
            review_action = "marked_needs_correction"
        if review_patch:
            at.patch("Zoom Attendance", record_id, review_patch)
            f = dict(at.get("Zoom Attendance", record_id).get("fields") or {})
        out["reviewAction"] = review_action

        # C XP
        out["debugStep"] = "4C - XP"
        key = text(f.get("Zoom Credit Key"))
        approved = truthy(f.get("Zoom Credit Approved?"))
        conflict = truthy(f.get("Zoom Credit Conflict?"))
        amount = number(f.get("Zoom XP Amount")) or 0
        out["sourceKeyOut"] = key
        if not key:
            raise RuntimeError("Blank Zoom Credit Key — refuse XP create")

        meeting_id = meeting_ids[0]
        meeting = at.get("Zoom Meetings", meeting_id)
        mf = meeting.get("fields") or {}
        activity_date = None
        start = mf.get("Start Time")
        if isinstance(start, str) and start:
            activity_date = date_only_from_key(denver_date_key_from_iso(start))
        week_ids = as_list_ids(mf.get("Week"))

        existing_rows = at.find_xp_by_source_key(key)
        existing = existing_rows[0] if existing_rows else None
        existing_f = (existing.get("fields") if existing else {}) or {}

        xp_action = "skipped_not_approved"
        if not approved or conflict or amount <= 0:
            if existing and truthy(existing_f.get("Active?")):
                at.patch("XP Events", existing["id"], {"Active?": False})
                xp_action = "deactivated_on_conflict"
                out["xpEventId"] = existing["id"]
                out["xpPoints"] = "0"
            else:
                xp_action = "skipped_not_approved" if (not approved or conflict) else "skipped_zero_amount"
                out["xpEventId"] = existing["id"] if existing else ""
        elif existing:
            awarded_by = text(existing_f.get("Awarded By"))
            if awarded_by and awarded_by != AWARDED_BY and "117" not in awarded_by:
                raise RuntimeError(f"Source Key {key} owned by another automation ({awarded_by}); refuse steal")
            patch: dict = {}
            if number(existing_f.get("XP Points")) != amount:
                patch["XP Points"] = amount
            if not truthy(existing_f.get("Active?")):
                patch["Active?"] = True
            if patch:
                at.patch("XP Events", existing["id"], patch)
                xp_action = "updated"
            else:
                xp_action = "skipped_exists"
            out["xpEventId"] = existing["id"]
            out["xpPoints"] = str(int(amount) if amount == int(amount) else amount)
        else:
            create_fields = {
                "Source Key": key,
                "XP Points": amount,
                "Active?": True,
                "Enrollment": enroll_ids,
                "XP Bucket": BUCKET,
                "XP Source": SOURCE,
                "XP Reason Public": REASON_PUBLIC,
                "XP Reason Debug": text(f.get("Zoom Credit Debug")) or f"C-025 {VERSION} {key}",
                "Awarded By": AWARDED_BY,
                "Zoom Meeting": meeting_ids,
            }
            if week_ids:
                create_fields["Week"] = week_ids
            if activity_date:
                create_fields["XP Activity Date"] = activity_date
            created = at.create("XP Events", create_fields)
            xp_action = "created"
            out["xpEventId"] = created["id"]
            out["xpPoints"] = str(int(amount) if amount == int(amount) else amount)

        out["actionCOut"] = xp_action

        # D gate flag only
        out["debugStep"] = "4D - Gate"
        gate_earned = truthy(f.get("Zoom Gate Credit Earned?"))
        gate_already = truthy(f.get("Gate Credit Applied?"))
        if conflict:
            gate_action = "skipped_conflict"
        elif not gate_earned:
            gate_action = "skipped_no_gate_credit"
        elif gate_already:
            gate_action = "skipped_already_applied"
        else:
            at.patch("Zoom Attendance", record_id, {"Gate Credit Applied?": True})
            gate_action = "marked_gate_applied_flag_only"
            f = dict(at.get("Zoom Attendance", record_id).get("fields") or {})
        out["actionDOut"] = gate_action

        # E PW flag only
        out["debugStep"] = "4E - Perfect Week"
        pw_flag = truthy(f.get("Effective Recording Counts for Perfect Week?"))
        pw_already = truthy(f.get("Perfect Week Credit Applied?"))
        if conflict:
            pw_action = "skipped_conflict"
        elif not approved or not pw_flag:
            pw_action = "skipped_flag_off"
        elif pw_already:
            pw_action = "skipped_already_applied"
        else:
            at.patch("Zoom Attendance", record_id, {"Perfect Week Credit Applied?": True})
            pw_action = "marked_perfect_week_applied_flag_only"
        out["actionEOut"] = pw_action

        # F email
        out["debugStep"] = "4F - Email"
        if not webhook_url:
            email_action = "skipped_webhook_blank"
        else:
            email_action = "skipped_email_send_disabled_in_v1_1_0"
        out["actionFOut"] = email_action

        out["statusOut"] = "success"
        out["actionOut"] = (
            xp_action
            if xp_action not in ("skipped_not_approved", "skipped_zero_amount")
            else (
                normalize_action
                if normalize_action != "skipped_already_normalized"
                else (review_action if review_action != "skipped_unchanged" else xp_action)
            )
        )
        out["errorOut"] = ""
        out["debugStep"] = "complete"
        out["attendeesWriteAttempted"] = False
        return out
    except Exception as e:  # noqa: BLE001 — harness captures orchestrator-style errors
        out["statusOut"] = "error"
        out["errorOut"] = str(e)
        out["actionOut"] = "error"
        out["debugStep"] = "error"
        out["attendeesWriteAttempted"] = False
        return out


def xp_snapshot(at: Airtable, xp_id: str | None) -> dict | None:
    if not xp_id:
        return None
    rec = at.get("XP Events", xp_id)
    f = rec.get("fields") or {}
    return {
        "id": xp_id,
        "source_key": f.get("Source Key"),
        "points": f.get("XP Points"),
        "bucket": f.get("XP Bucket"),
        "source": f.get("XP Source"),
        "active": f.get("Active?"),
        "enrollment": as_list_ids(f.get("Enrollment")),
        "zoom_meeting": as_list_ids(f.get("Zoom Meeting")),
        "activity_date": f.get("XP Activity Date"),
        "reason_public": f.get("XP Reason Public"),
        "reason_debug": f.get("XP Reason Debug"),
        "awarded_by": f.get("Awarded By"),
    }


def count_xp_for_key(at: Airtable, key: str) -> int:
    return len(at.find_xp_by_source_key(key))


def run_case(at: Airtable, name: str, rid: str, meeting_id: str | None = None) -> dict:
    before_za = snapshot_za(at, rid)
    mid = meeting_id or (before_za["meeting"][0] if before_za["meeting"] else None)
    before_m = snapshot_meeting(at, mid)
    result = run_orchestrator(at, rid, webhook_url="")
    after_za = snapshot_za(at, rid)
    after_m = snapshot_meeting(at, mid)
    xp = xp_snapshot(at, result.get("xpEventId") or None)
    key = after_za.get("key") or before_za.get("key") or ""
    return {
        "case": name,
        "fixture_id": rid,
        "outputs": result,
        "before": {"za": before_za, "meeting": before_m},
        "after": {"za": after_za, "meeting": after_m, "xp": xp},
        "attendees_unchanged": before_m["attendees"] == after_m["attendees"],
        "xp_count_for_key": count_xp_for_key(at, key) if key else 0,
        "live_xp_created_check": "see_scan",
    }


def scan_new_live_xp(at: Airtable, since_keys: set[str]) -> list[dict]:
    """Find ZOOM_ATTEND_BASE events for Schmidt that aren't in since_keys."""
    formula = urllib.parse.quote(
        f"AND(FIND('ZOOM_ATTEND_BASE',{{Source Key}}&''),FIND('{SCHMIDT}',ARRAYJOIN({{Enrollment}})))"
    )
    # Enrollment filter may not work that way — query by source prefix then filter
    formula = urllib.parse.quote("FIND('ZOOM_ATTEND_BASE',{Source Key}&'')")
    st, body = at._req("GET", f"XP%20Events?filterByFormula={formula}&maxRecords=50")
    if st != 200:
        return [{"error": body}]
    hits = []
    for r in body.get("records") or []:
        f = r.get("fields") or {}
        if SCHMIDT not in as_list_ids(f.get("Enrollment")):
            continue
        key = text(f.get("Source Key"))
        if key and key not in since_keys:
            hits.append({"id": r["id"], "source_key": key, "active": f.get("Active?"), "points": f.get("XP Points")})
    return hits


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == BASE_EXPECTED, base
    at = Airtable(base, token)

    report: dict[str, Any] = {
        "base_id": base,
        "branch_tip_at_run": None,
        "execution_mode": "REST harness mirroring 117 orchestrator v1.1.0",
        "automation_117_enable_disable": "NOT performed — Automations API 403; left OFF",
        "mike_confirmed_paste": {
            "name": "117 - Zoom Recording Credit - Orchestrator",
            "version": "v1.1.0",
            "trigger_corrected": True,
            "recordId_mapped": True,
            "webhookUrl_blank": True,
            "no_post_script_actions": True,
            "remains_OFF": True,
        },
        "started_at": datetime.now(timezone.utc).isoformat(),
        "cases": [],
        "stop_conditions_hit": [],
        "final_safety": {},
    }

    # Baseline live XP keys for Schmidt
    baseline_live = scan_new_live_xp(at, set())
    baseline_live_keys = {h["source_key"] for h in baseline_live if "source_key" in h}
    report["baseline_live_xp_keys"] = sorted(baseline_live_keys)

    # Ensure eligible has Normal Live Zoom XP = 60 for amount 30
    elig = snapshot_za(at, FIXTURES["eligible"])
    if number(elig.get("amount")) != 30:
        at.patch("Zoom Attendance", FIXTURES["eligible"], {"Normal Live Zoom XP": 60})
        elig = snapshot_za(at, FIXTURES["eligible"])
    report["eligible_precheck"] = {
        "amount": elig.get("amount"),
        "approved": elig.get("approved"),
        "conflict": elig.get("conflict"),
        "key": elig.get("key"),
    }
    if number(elig.get("amount")) != 30 or not truthy(elig.get("approved")):
        report["stop_conditions_hit"].append("Eligible fixture amount/approval not ready")
        OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2)[:4000])
        raise SystemExit(2)

    # 1 Eligible
    c1 = run_case(at, "1_eligible_approved", FIXTURES["eligible"], FIXTURES["meeting_eligible"])
    report["cases"].append(c1)
    xp1 = c1["after"]["xp"]
    if not xp1 or xp1.get("points") != 30 or xp1.get("bucket") != BUCKET or xp1.get("source") != SOURCE:
        report["stop_conditions_hit"].append("Eligible XP fields wrong")
    if not c1["attendees_unchanged"]:
        report["stop_conditions_hit"].append("Attendees changed on eligible")
        OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise SystemExit(3)
    eligible_xp_id = c1["outputs"].get("xpEventId")
    eligible_key = c1["after"]["za"].get("key")

    # 2 Rerun
    c2 = run_case(at, "2_eligible_rerun", FIXTURES["eligible"], FIXTURES["meeting_eligible"])
    report["cases"].append(c2)
    if c2["outputs"].get("actionCOut") != "skipped_exists":
        report["notes_rerun"] = c2["outputs"].get("actionCOut")
    if c2["xp_count_for_key"] != 1:
        report["stop_conditions_hit"].append(f"Duplicate XP for key count={c2['xp_count_for_key']}")
    if c2["outputs"].get("xpEventId") != eligible_xp_id:
        report["stop_conditions_hit"].append("Rerun returned different XP Event ID")

    # 3 Missing approval
    c3 = run_case(at, "3_missing_approval", FIXTURES["missing_approval"], FIXTURES["meeting_eligible"])
    report["cases"].append(c3)

    # 4 Needs Correction — set Satisfactory true first so review path can clear it
    at.patch(
        "Zoom Attendance",
        FIXTURES["needs_correction"],
        {
            "Recording Quiz Review Status": "Needs Correction",
            "Recording Quiz Satisfactory?": True,
        },
    )
    c4 = run_case(at, "4_needs_correction", FIXTURES["needs_correction"], FIXTURES["meeting_eligible"])
    report["cases"].append(c4)

    # 5 Missing Enrollment
    c5 = run_case(at, "5_missing_enrollment", FIXTURES["missing_enrollment"])
    report["cases"].append(c5)

    # 6 Missing Meeting
    c6 = run_case(at, "6_missing_meeting", FIXTURES["missing_meeting"])
    report["cases"].append(c6)

    # 7 Live conflict (recording conflict fixture)
    c7 = run_case(at, "7_live_attendance_conflict", FIXTURES["recording_conflict"], FIXTURES["meeting_conflict"])
    report["cases"].append(c7)

    # 8 Soft-void: introduce live sibling on eligible meeting, then re-run eligible
    softvoid: dict[str, Any] = {"steps": []}
    live_on_eligible = None
    # Create temporary Live ZA on eligible meeting to flip conflict formula
    created_live = at.create(
        "Zoom Attendance",
        {
            "Attendance Method": "Live",
            "Enrollment": [SCHMIDT],
            "Zoom Meeting": [FIXTURES["meeting_eligible"]],
            "Live Attendance Confirmed?": True,
            "Recording Quiz Coach Feedback": "C025-S17 softvoid live sibling TEMP",
        },
    )
    live_on_eligible = created_live["id"]
    softvoid["steps"].append({"created_live_sibling": live_on_eligible})
    time.sleep(1.0)
    elig_after_live = snapshot_za(at, FIXTURES["eligible"])
    softvoid["eligible_after_live"] = {
        "conflict": elig_after_live.get("conflict"),
        "approved": elig_after_live.get("approved"),
        "amount": elig_after_live.get("amount"),
    }
    c8 = run_case(at, "8_soft_void", FIXTURES["eligible"], FIXTURES["meeting_eligible"])
    report["cases"].append(c8)
    softvoid["run"] = c8["outputs"]
    xp_after_void = xp_snapshot(at, eligible_xp_id)
    softvoid["xp_after"] = xp_after_void
    # Idempotent rerun
    c8b = run_case(at, "8b_soft_void_rerun", FIXTURES["eligible"], FIXTURES["meeting_eligible"])
    report["cases"].append(c8b)
    softvoid["rerun"] = c8b["outputs"]

    # 9 Conflict resolution: delete/archive live sibling by clearing method? Better: delete the temp live record
    # Use destroy only for TEMP fixture we created
    st_del, del_body = at._req("DELETE", f"Zoom%20Attendance/{live_on_eligible}")
    softvoid["deleted_live_sibling"] = {"status": st_del, "body": del_body, "id": live_on_eligible}
    time.sleep(1.0)
    elig_resolved = snapshot_za(at, FIXTURES["eligible"])
    softvoid["eligible_after_resolve"] = {
        "conflict": elig_resolved.get("conflict"),
        "approved": elig_resolved.get("approved"),
        "amount": elig_resolved.get("amount"),
    }
    c9 = run_case(at, "9_conflict_resolution", FIXTURES["eligible"], FIXTURES["meeting_eligible"])
    report["cases"].append(c9)
    softvoid["resolve_run"] = c9["outputs"]
    softvoid["xp_after_resolve"] = xp_snapshot(at, eligible_xp_id)
    report["softvoid_block"] = softvoid

    # 10 Date — from eligible XP
    report["date_result"] = {
        "meeting_start": snapshot_meeting(at, FIXTURES["meeting_eligible"]).get("start_time"),
        "expected_denver_key": denver_date_key_from_iso("2026-07-18T06:30:00.000Z"),
        "xp_activity_date": (xp_snapshot(at, eligible_xp_id) or {}).get("activity_date"),
    }

    # 11 Email — already blank webhook on all runs; capture eligible email action
    report["email_no_send"] = {
        "eligible_actionFOut": c1["outputs"].get("actionFOut"),
        "send_key_after": snapshot_za(at, FIXTURES["eligible"]).get("send_key"),
        "sent_at_after": snapshot_za(at, FIXTURES["eligible"]).get("sent_at"),
    }

    # 12 Gate / PW observation
    report["gate_pw_observation"] = {
        "eligible_after_all": snapshot_za(at, FIXTURES["eligible"]),
        "downstream_gaps": {
            "057": "counts live Attendees only",
            "042": "reads live Total Zoom Attendances",
        },
    }

    # Safety scans
    new_live = scan_new_live_xp(at, baseline_live_keys)
    report["new_live_xp_during_tests"] = new_live
    if new_live:
        report["stop_conditions_hit"].append("New ZOOM_ATTEND_BASE XP detected for Schmidt")

    # Final attendees on both meetings
    report["final_attendees"] = {
        "meeting_eligible": snapshot_meeting(at, FIXTURES["meeting_eligible"]),
        "meeting_conflict": snapshot_meeting(at, FIXTURES["meeting_conflict"]),
    }
    if report["final_attendees"]["meeting_eligible"]["attendees"] or report["final_attendees"]["meeting_conflict"]["attendees"]:
        # Attendees may have been non-empty before; check our cases attendees_unchanged
        if any(not c.get("attendees_unchanged") for c in report["cases"]):
            report["stop_conditions_hit"].append("Attendees changed during a test case")

    # Soft-void XP events for cleanup? User said soft-void bad XP, keep ledger.
    # Leave eligible XP active if resolved; soft-void any unintended duplicates.
    if eligible_key:
        report["final_xp_for_eligible_key"] = [
            xp_snapshot(at, r["id"]) for r in at.find_xp_by_source_key(eligible_key)
        ]

    report["final_safety"] = {
        "automation_117": "OFF (never enabled by Cursor; Mike confirmed OFF)",
        "automation_101": "unchanged (not edited)",
        "automation_057": "unchanged",
        "automation_042": "unchanged",
        "prod": "untouched",
        "make_email": "untouched / no webhook",
        "attendees_write_attempted": False,
    }
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    report["pass"] = len(report["stop_conditions_hit"]) == 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    # Compact console summary
    summary = {
        "pass": report["pass"],
        "stop": report["stop_conditions_hit"],
        "eligible_xp": eligible_xp_id,
        "eligible_actionC": c1["outputs"].get("actionCOut"),
        "rerun_actionC": c2["outputs"].get("actionCOut"),
        "missing_approval": c3["outputs"].get("actionCOut") or c3["outputs"].get("actionOut"),
        "needs_correction_review": c4["outputs"].get("reviewAction"),
        "missing_enroll": c5["outputs"].get("statusOut"),
        "missing_meeting": c6["outputs"].get("statusOut"),
        "conflict": c7["outputs"].get("actionCOut"),
        "softvoid": c8["outputs"].get("actionCOut"),
        "resolve": c9["outputs"].get("actionCOut"),
        "date": report["date_result"],
        "email": report["email_no_send"],
        "new_live_xp": new_live,
        "attendees_final": report["final_attendees"],
    }
    print(json.dumps(summary, indent=2, default=str))
    print(f"WROTE {OUT}")
    if not report["pass"]:
        raise SystemExit(4)


if __name__ == "__main__":
    main()
