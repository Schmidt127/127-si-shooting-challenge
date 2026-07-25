#!/usr/bin/env python3
"""Read-only first-live C-025 Stage 17 PROD verification.

Never prints AIRTABLE_TOKEN. Performs no writes.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"

# Documented first-live recording case (2026-07-20)
ZA_ID = "recfqsgM7zDobxsPf"
DOCUMENTED_XP_ID = "recOceuW34jQz7suD"
ENROLL = "recgP9qZYjAhE7NXm"
MEETING = "reczeUT0AJUWMmEOb"
SOURCE_KEY = f"ZOOM_CREDIT|{ENROLL}|{MEETING}"

OUT = HERE / "_preview" / "c025_stage17_first_live_prod_verify.json"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("FAIL: missing AIRTABLE token in tools/airtable/.env")
    return tok


def api(method: str, url: str, token: str, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw) if raw else {"raw": raw[:2000]}
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:2000]}


def list_all(table: str, token: str, fields=None, formula=None):
    params = []
    if formula:
        params.append("filterByFormula=" + urllib.parse.quote(formula))
    if fields:
        for f in fields:
            params.append("fields[]=" + urllib.parse.quote(f))
    records = []
    offset = None
    while True:
        qparts = list(params)
        if offset:
            qparts.append(f"offset={offset}")
        q = "&".join(qparts)
        url = f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}"
        if q:
            url += f"?{q}"
        st, body = api("GET", url, token)
        if st != 200:
            raise SystemExit(f"FAIL: list {table} HTTP {st}: {json.dumps(body)[:500]}")
        records.extend(body.get("records") or [])
        offset = body.get("offset")
        if not offset:
            break
    return records


def is_active(fields: dict) -> bool:
    v = fields.get("Active?")
    return v is True or v == 1


def main() -> None:
    token = load_token()
    OUT.parent.mkdir(parents=True, exist_ok=True)

    st, meta = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    if st != 200:
        raise SystemExit(f"FAIL: auth/meta tables HTTP {st}")
    tables = {t["name"]: t for t in meta["tables"]}
    if "Zoom Attendance" not in tables:
        raise SystemExit("FAIL: Zoom Attendance table missing in PROD")
    if "XP Events" not in tables:
        raise SystemExit("FAIL: XP Events table missing in PROD")

    checks = []
    failed = None

    def check(name: str, ok: bool, detail: dict):
        nonlocal failed
        checks.append({"name": name, "ok": bool(ok), "detail": detail})
        if not ok and failed is None:
            failed = {"name": name, "detail": detail}

    st, za = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Attendance')}/{ZA_ID}",
        token,
    )
    check("za_readable", st == 200, {"http": st, "id": ZA_ID})
    zaf = (za.get("fields") or {}) if st == 200 else {}

    xp_all = list_all(
        "XP Events",
        token,
        formula=f"{{Source Key}}='{SOURCE_KEY}'",
        fields=[
            "Source Key",
            "XP Points",
            "XP Bucket",
            "XP Source",
            "Active?",
            "Enrollment",
            "Zoom Meeting",
            "Awarded By",
            "XP Activity Date",
        ],
    )
    active_true = [r for r in xp_all if is_active(r.get("fields") or {})]
    check(
        "exactly_one_active_zoom_credit",
        len(active_true) == 1,
        {
            "source_key": SOURCE_KEY,
            "total_matching_rows": len(xp_all),
            "active_true_count": len(active_true),
            "active_ids": [r["id"] for r in active_true],
            "all_ids": [r["id"] for r in xp_all],
        },
    )
    inactive_extra = [
        r["id"]
        for r in xp_all
        if active_true and r["id"] != active_true[0]["id"] and is_active(r.get("fields") or {})
    ]
    check(
        "no_duplicate_active_source_key",
        len(inactive_extra) == 0 and len(active_true) <= 1,
        {"duplicate_active_ids": inactive_extra, "total_rows": len(xp_all)},
    )

    xp = active_true[0] if active_true else None
    xp_fields = (xp.get("fields") or {}) if xp else {}
    xp_points = xp_fields.get("XP Points")

    za_amount = zaf.get("Zoom XP Amount")
    rules = list_all(
        "XP Reward Rules",
        token,
        formula="AND({Rule Key}='ZOOM_ATTEND_BASE',{Active?})",
        fields=["Rule Key", "XP Amount", "Active?"],
    )
    live_base = None
    for r in rules:
        f = r.get("fields") or {}
        live_base = f.get("XP Amount")
        if live_base is not None:
            break

    st_m, meeting = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    check("meeting_readable", st_m == 200, {"http": st_m, "id": MEETING})
    mf = (meeting.get("fields") or {}) if st_m == 200 else {}
    eff_pct = mf.get("Effective Recording XP Percentage")
    attendees_now = list(mf.get("Attendees") or [])
    mkey = mf.get("Zoom Meeting Key") or ""

    expected = None
    if za_amount is not None:
        expected = float(za_amount)
    elif live_base is not None and eff_pct is not None:
        expected = round(float(live_base) * float(eff_pct) / 100.0)
    elif live_base is not None:
        expected = round(float(live_base) * 50 / 100.0)

    amount_ok = (
        xp_points is not None and expected is not None and float(xp_points) == float(expected)
    )
    check(
        "xp_amount_matches_configured_percent",
        amount_ok,
        {
            "xp_points": xp_points,
            "za_zoom_xp_amount": za_amount,
            "live_base": live_base,
            "effective_recording_pct": eff_pct,
            "expected": expected,
        },
    )

    enroll_in_attendees = ENROLL in attendees_now
    check(
        "recording_path_did_not_add_enrollment_to_attendees",
        not enroll_in_attendees,
        {
            "meeting_id": MEETING,
            "enrollment_in_attendees": enroll_in_attendees,
            "attendee_count": len(attendees_now),
        },
    )

    live_xp = list_all(
        "XP Events",
        token,
        formula=f"AND(FIND('ZOOM_ATTEND_BASE|', {{Source Key}}), FIND('{ENROLL}', {{Source Key}}))",
        fields=["Source Key", "Active?", "XP Points", "Zoom Meeting", "Awarded By"],
    )
    live_for_meeting = []
    for r in live_xp:
        f = r.get("fields") or {}
        zm = f.get("Zoom Meeting") or []
        sk = str(f.get("Source Key") or "")
        if MEETING in zm or (mkey and mkey in sk):
            live_for_meeting.append(r)

    bad_live = []
    for r in live_for_meeting:
        awarded = str((r.get("fields") or {}).get("Awarded By") or "")
        if "117" in awarded.lower() or "recording" in awarded.lower():
            bad_live.append(r["id"])
    check(
        "no_new_zoom_attend_base_from_recording",
        len(bad_live) == 0,
        {
            "live_xp_for_meeting_count": len(live_for_meeting),
            "recording_awarded_live_ids": bad_live,
            "live_ids": [r["id"] for r in live_for_meeting],
        },
    )

    pw_applied = bool(zaf.get("Perfect Week Credit Applied?"))
    gate_applied = bool(zaf.get("Gate Credit Applied?"))
    check(
        "057_no_perfect_week_double_count",
        not (pw_applied and enroll_in_attendees),
        {
            "perfect_week_credit_applied": pw_applied,
            "enrollment_in_attendees": enroll_in_attendees,
        },
    )
    check(
        "042_no_gate_double_count",
        not (gate_applied and enroll_in_attendees),
        {
            "gate_credit_applied": gate_applied,
            "enrollment_in_attendees": enroll_in_attendees,
        },
    )

    sent_at = zaf.get("Recording Approval Email Sent At")
    send_key = zaf.get("Recording Approval Email Send Key")
    check(
        "no_email_sent_while_webhook_blank",
        sent_at in (None, ""),
        {
            "sent_at": sent_at,
            "send_key": send_key,
            "note": "webhookUrl blank per live enablement; Sent At must remain blank",
        },
    )

    has_testing_scenarios = "Testing Scenarios" in tables
    st_a, autos = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/automations", token)
    if st_a == 200:
        auto_names = []
        for a in autos.get("automations") or autos.get("data") or []:
            auto_names.append(str(a.get("name") or a.get("title") or ""))
        matched_115 = [n for n in auto_names if n.startswith("115") or "115 -" in n]
        check(
            "115_not_installed",
            len(matched_115) == 0,
            {"automation_api": st_a, "matched": matched_115},
        )
    else:
        check(
            "115_not_installed",
            not has_testing_scenarios,
            {
                "automation_api": st_a,
                "testing_scenarios_table_present": has_testing_scenarios,
                "note": "Automations API not readable; PROD lacks Testing Scenarios (115 dependency)",
            },
        )

    if xp:
        check(
            "xp_bucket_source",
            xp_fields.get("XP Bucket") == "Zoom Attendance"
            and xp_fields.get("XP Source") == "Zoom Meeting Recording Quiz",
            {
                "bucket": xp_fields.get("XP Bucket"),
                "source": xp_fields.get("XP Source"),
            },
        )
        check(
            "xp_links_enrollment_meeting",
            ENROLL in (xp_fields.get("Enrollment") or [])
            and MEETING in (xp_fields.get("Zoom Meeting") or []),
            {
                "enrollment": xp_fields.get("Enrollment"),
                "zoom_meeting": xp_fields.get("Zoom Meeting"),
            },
        )

    report = {
        "base_id": PROD,
        "mode": "read_only",
        "auth_ok": True,
        "token_printed": False,
        "za_id": ZA_ID,
        "xp_event_id": xp["id"] if xp else None,
        "documented_xp_event_id": DOCUMENTED_XP_ID,
        "source_key": SOURCE_KEY,
        "xp_amount": xp_points,
        "enrollment_id": ENROLL,
        "meeting_id": MEETING,
        "checks": checks,
        "failed": failed,
        "verdict": "PASS" if failed is None else "FAIL",
    }
    dumped = json.dumps(report, indent=2)
    if "Bearer " in dumped or "pat" in dumped.lower()[:200]:
        # Extra safety: never write obvious token material
        raise SystemExit("FAIL: refused to write report that may contain secrets")
    OUT.write_text(dumped, encoding="utf-8")

    # Console summary — no token
    print(
        json.dumps(
            {
                "verdict": report["verdict"],
                "failed": failed,
                "za_id": ZA_ID,
                "xp_event_id": report["xp_event_id"],
                "source_key": SOURCE_KEY,
                "xp_amount": xp_points,
                "checks_summary": [{"name": c["name"], "ok": c["ok"]} for c in checks],
                "evidence_file": str(OUT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
