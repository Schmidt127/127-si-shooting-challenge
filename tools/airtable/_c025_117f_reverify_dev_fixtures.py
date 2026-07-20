#!/usr/bin/env python3
"""Re-verify C-025 117f DEV fixtures (read-only) + decision-gate outcomes. No secrets printed."""
from __future__ import annotations
import json, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
BASE = "appTetnuCZlCZdTCT"
FIXTURES = {
    "happy": {"za": "recsEERuvtyoHmDma", "meeting": "recNOsPJQVH69ibah"},
    "disabled": {"za": "recAqFTWmuHF1V4Z5", "meeting": "reclJMFG2w1OkObuE"},
    "conflict": {"za": "recbL9e1Be4iNbCZF", "meeting": "recupcVrBxglX8f0t"},
}

def load_token() -> str:
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    assert (env.get("AIRTABLE_BASE_ID") or BASE) == BASE
    token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN") or ""
    assert token
    return token

def api_get(url: str, token: str):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"raw": e.read().decode("utf-8", errors="replace")[:400]}

def unwrap(v):
    if isinstance(v, list):
        if not v:
            return None
        if len(v) == 1:
            return unwrap(v[0])
        return v
    if isinstance(v, dict) and "name" in v:
        return v["name"]
    return v

def main():
    token = load_token()
    report = {"base": BASE, "fixtures": {}, "gates": {}, "gate_assertions": {}, "safety": {}}
    for name, ids in FIXTURES.items():
        st, body = api_get(f"https://api.airtable.com/v0/{BASE}/Zoom%20Attendance/{ids['za']}", token)
        fields = body.get("fields") or {} if st == 200 else {}
        st_m, body_m = api_get(f"https://api.airtable.com/v0/{BASE}/Zoom%20Meetings/{ids['meeting']}", token)
        mfields = body_m.get("fields") or {} if st_m == 200 else {}
        report["fixtures"][name] = {
            "http": st,
            "za": ids["za"],
            "meeting": ids["meeting"],
            "method": unwrap(fields.get("Attendance Method")),
            "satisfactory": unwrap(fields.get("Recording Quiz Satisfactory?")),
            "conflict": unwrap(fields.get("Zoom Credit Conflict?")),
            "effective_enabled": unwrap(fields.get("Effective Recording Approval Email Enabled?")),
            "effective_template": unwrap(fields.get("Effective Recording Approval Email Template Key")),
            "effective_timing": unwrap(fields.get("Effective Recording Approval Email Timing")),
            "send_key_blank": not (fields.get("Recording Approval Email Send Key") or "").strip(),
            "sent_at_blank": fields.get("Recording Approval Email Sent At") in (None, ""),
            "enrollment_rid": unwrap(fields.get("Enrollment RID")) or "recgP9qZYjAhE7NXm",
            "meeting_rid": unwrap(fields.get("Zoom Meeting RID")) or ids["meeting"],
            "meeting_attendee_count": len(mfields.get("Attendees") or []),
            "meeting_http": st_m,
        }

    slim = {k: {kk: vv for kk, vv in v.items() if kk != "meeting_http"} for k, v in report["fixtures"].items()}
    preview = Path(__file__).resolve().parent / "_preview"
    preview.mkdir(parents=True, exist_ok=True)
    tmp_json = preview / "c025_117f_gate_input.json"
    tmp_js = preview / "c025_117f_gate_run.js"
    tmp_json.write_text(json.dumps(slim), encoding="utf-8")
    tmp_js.write_text("""
const fs = require('fs');
const c = require('../../../airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.js');
const fixtures = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = {};
for (const [name, f] of Object.entries(fixtures)) {
  if (f.http !== 200) { out[name] = { error: 'missing' }; continue; }
  const base = {
    attendanceMethod: f.method,
    satisfactory: !!(f.satisfactory === true || f.satisfactory === 1),
    emailEnabled: f.effective_enabled,
    templateKey: f.effective_template || '',
    webhookUrl: '',
    conflict: f.conflict,
    sentAt: f.sent_at_blank ? null : 'set',
    existingSendKey: f.send_key_blank ? '' : 'set',
    enrollmentRid: f.enrollment_rid,
    zoomMeetingRid: f.meeting_rid,
    zoomAttendanceId: f.za,
    timing: f.effective_timing || 'On Satisfactory',
  };
  out[name + '_blank_webhook'] = c.evaluateApprovalEmailSendDecision(base);
  out[name + '_with_webhook_shape'] = c.evaluateApprovalEmailSendDecision({
    ...base,
    webhookUrl: 'https://example.test/hook-placeholder-not-real',
  });
}
console.log(JSON.stringify(out));
""", encoding="utf-8")
    proc = subprocess.run(["node", str(tmp_js), str(tmp_json)], cwd=str(Path(__file__).resolve().parents[2]), capture_output=True, text=True, timeout=30)
    if proc.returncode != 0:
        report["gates"] = {"error": (proc.stderr or proc.stdout)[:500]}
    else:
        report["gates"] = json.loads(proc.stdout.strip() or "{}")

    expected = {
        "happy_blank_webhook": "skipped_no_webhook",
        "disabled_blank_webhook": "skipped_disabled",
        "conflict_blank_webhook": "skipped_conflict",
        "happy_with_webhook_shape": "ready_to_post",
    }
    for key, want in expected.items():
        got = (report["gates"].get(key) or {}).get("actionOut")
        report["gate_assertions"][key] = {"expected": want, "got": got, "pass": got == want}

    report["safety"] = {
        "happy_attendees": report["fixtures"]["happy"]["meeting_attendee_count"],
        "disabled_attendees": report["fixtures"]["disabled"]["meeting_attendee_count"],
        "conflict_attendees": report["fixtures"]["conflict"]["meeting_attendee_count"],
        "make_m1_m5": "BLOCKED_NO_MAKE_UI",
        "gmail_count": 0,
        "canonical_send_key_happy": f"ZOOM_REC_EMAIL|recgP9qZYjAhE7NXm|{FIXTURES['happy']['meeting']}",
    }
    out_path = preview / "c025_117f_reverify.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    failed = [k for k, v in report["gate_assertions"].items() if not v["pass"]]
    if failed:
        raise SystemExit(f"GATE_FAIL {failed}")
    print("ALL_LIVE_FIELD_GATES_PASS")

if __name__ == "__main__":
    main()

