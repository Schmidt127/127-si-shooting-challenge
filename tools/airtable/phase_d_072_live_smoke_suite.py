#!/usr/bin/env python3
"""Phase D live DEV no-send smoke — combined 072 v4.0.0.

Fixture process: known Schmidt Weekly Athlete Summary (Phase B WAS).
Safety: makeWebhookUrl assumed blank in automation inputs; never set a live
Make/prod webhook from this script. Does not touch 117, other Folder 07,
or PROD. Does not delete 074.

Case mapping (docs/deploy-checklists/PHASE-D-072-074-dev-no-send-smoke.md):
  1 package build — live
  2 already-built package — live (Send armed + blank webhook)
  3 disabled Config — offline decide contract (sendEnabled input not API-writable)
  4 blank webhook — live (Send stays armed; Sent stays false)
  5 missing recipient/template — offline (blank webhook short-circuits before
    recipient check; same decide contract as offline suite)
  6 already-sent key — live
  7 failed-send retry model — offline mock_make (no prod webhook)
  8 duplicate-trigger protection — live
  9 weekly timing prerequisites — live (Week cleared → trigger does not fire)
"""

from __future__ import annotations

import importlib.util
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
WAS = "Weekly Athlete Summary"
WAS_FIXTURE = "recBO81w4dYtcaL4V"  # Schmidt + week (Phase B fixture)
SCHMIDT = "recgP9qZYjAhE7NXm"
DENVER = ZoneInfo("America/Denver")
OUT = ROOT / "docs/audits/phase-d-072-live-smoke-2026-07-15.json"
RESULT_MD = ROOT / "docs/overnight-runs/results/S28-phase-d-live-smoke-result.md"

_SPEC = importlib.util.spec_from_file_location(
    "test_phase_d_072_074_combined",
    ROOT / "tools/airtable/tests/test_phase_d_072_074_combined.py",
)
_MOD = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(_MOD)
decide_phase_d_actions = _MOD.decide_phase_d_actions
mock_make_handoff = _MOD.mock_make_handoff
week_boundary_includes = _MOD.week_boundary_includes


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    tok = os.environ.get("AIRTABLE_API_TOKEN") or os.environ.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


TOK = load_token()

F = {
    "build": "Build Weekly Email Now?",
    "send": "Send to Make?",
    "ready": "Weekly Email Ready?",
    "sent": "Weekly Email Sent?",
    "subject": "Weekly Email Subject",
    "recipients": "Weekly Email Recipients",
    "html": "Weekly Email HTML",
    "text": "Weekly Email Text",
    "error": "Weekly Email Error",
    "revision": "Weekly Email Revision",
    "last_built": "Weekly Email Last Built At",
    "enrollment": "Enrollment",
    "week": "Week",
}


def api(method: str, table: str, rid: str | None = None, body: dict | None = None, params: dict | None = None):
    path = urllib.parse.quote(table, safe="")
    url = f"https://api.airtable.com/v0/{DEV}/{path}"
    if rid:
        url += f"/{rid}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def get_fields(rid: str = WAS_FIXTURE) -> dict:
    st, data = api("GET", WAS, rid)
    if st != 200:
        raise SystemExit(f"GET {WAS}/{rid} -> {st}: {data}")
    return data.get("fields") or {}


def patch(fields: dict, rid: str = WAS_FIXTURE) -> dict:
    st, data = api("PATCH", WAS, rid, body={"fields": fields, "typecast": True})
    if st != 200:
        raise SystemExit(f"PATCH {WAS}/{rid} -> {st}: {data}")
    return data.get("fields") or {}


def first_id(val) -> str | None:
    if isinstance(val, list) and val:
        return val[0]
    return None


def truthy(val) -> bool:
    return val is True


def snapshot(f: dict) -> dict:
    return {
        "build": truthy(f.get(F["build"])),
        "send": truthy(f.get(F["send"])),
        "ready": truthy(f.get(F["ready"])),
        "sent": truthy(f.get(F["sent"])),
        "subject_len": len(str(f.get(F["subject"]) or "")),
        "html_len": len(str(f.get(F["html"]) or "")),
        "recipients_len": len(str(f.get(F["recipients"]) or "")),
        "error": str(f.get(F["error"]) or "")[:200],
        "enrollment": first_id(f.get(F["enrollment"])),
        "week": first_id(f.get(F["week"])),
        "last_built": f.get(F["last_built"]),
        "revision": f.get(F["revision"]),
    }


def reset_package() -> dict:
    """Clear package + arms; keep Enrollment/Week for smoke."""
    patch(
        {
            F["build"]: False,
            F["send"]: False,
            F["ready"]: False,
            F["sent"]: False,
            F["subject"]: "",
            F["recipients"]: "",
            F["html"]: "",
            F["text"]: "",
            F["error"]: "",
            F["revision"]: "",
        }
    )
    time.sleep(1.5)
    f = get_fields()
    if first_id(f.get(F["enrollment"])) != SCHMIDT:
        raise SystemExit("Fixture Enrollment drifted from Schmidt")
    if not first_id(f.get(F["week"])):
        raise SystemExit("Fixture Week missing")
    return f


def wait_until(pred, timeout: int = 180, interval: float = 4.0) -> tuple[bool, dict]:
    deadline = time.time() + timeout
    last = get_fields()
    while time.time() < deadline:
        last = get_fields()
        if pred(last):
            return True, last
        time.sleep(interval)
    return False, last


def case_result(name: str, critical: bool, ok: bool, evidence: dict, notes: str = "") -> dict:
    return {
        "case": name,
        "critical": critical,
        "result": "PASS" if ok else "FAIL",
        "evidence": evidence,
        "notes": notes,
    }


def offline_disabled() -> dict:
    r = decide_phase_d_actions(
        build_requested=False,
        send_armed=True,
        email_ready=True,
        email_sent=False,
        webhook_url="https://example.invalid/would-not-use",
        send_enabled=False,
        subject="S",
        html="<p>x</p>",
        recipients="a@b.c",
    )
    ok = r["action_out"] == "skipped_send_disabled" and r["send_skip"] == "skipped_send_disabled"
    return case_result(
        "3_disabled_config",
        True,
        ok,
        r,
        "Offline decide contract — sendEnabled input not writable via Records API",
    )


def offline_missing() -> dict:
    miss_pkg = decide_phase_d_actions(
        build_requested=False,
        send_armed=True,
        email_ready=True,
        email_sent=False,
        webhook_url="https://example.invalid/would-not-use",
        subject="",
        html="",
        recipients="a@b.c",
    )
    miss_rec = decide_phase_d_actions(
        build_requested=False,
        send_armed=True,
        email_ready=True,
        email_sent=False,
        webhook_url="https://example.invalid/would-not-use",
        subject="S",
        html="<p>x</p>",
        recipients="",
    )
    ok = (
        miss_pkg["action_out"] == "skipped_missing_package"
        and miss_rec["action_out"] == "skipped_missing_recipient"
    )
    return case_result(
        "5_missing_recipient_template",
        True,
        ok,
        {"missing_package": miss_pkg, "missing_recipient": miss_rec},
        "Offline under blank-webhook safety (live blank webhook short-circuits first)",
    )


def offline_retry() -> dict:
    fail = mock_make_handoff(webhook_ok=False)
    ok_retry = fail["clear_send_flag"] is False and fail.get("write_error") is True
    ok2 = mock_make_handoff(webhook_ok=True)["clear_send_flag"] is True
    return case_result(
        "7_failed_send_retry_model",
        True,
        ok_retry and ok2,
        {"fail": fail, "success_clear_send": ok2},
        "Offline — no prod Make webhook used; Send stays armed on fail",
    )


def finish(started: str, cases: list[dict], early_fail: bool) -> dict:
    critical = [c for c in cases if c.get("critical")]
    all_pass = (not early_fail) and all(c["result"] == "PASS" for c in critical)
    report = {
        "stage": "S28",
        "package": "phase-d-072-074-ui",
        "base": DEV,
        "fixture_was": WAS_FIXTURE,
        "started_at": started,
        "finished_at": datetime.now(DENVER).isoformat(),
        "makeWebhookUrl": "blank (automation input — not set by this suite)",
        "automation_074": "OFF (not touched)",
        "automation_117": "unchanged",
        "prod": "untouched",
        "real_email": False,
        "make_production_call": False,
        "critical_pass": all_pass,
        "cases": cases,
        "mike_next": (
            "Delete DEV automation 074 only. Then reply: Phase D UI complete."
            if all_pass
            else "Keep 074. Share statusOut/errorOut/debugStep if automation run logs available. Restore rollback only if 072 corrupted."
        ),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# S28 Phase D — Live no-send smoke result",
        "",
        f"**Fixture WAS:** `{WAS_FIXTURE}` (Schmidt)",
        f"**Critical:** **{'PASS' if all_pass else 'FAIL'}**",
        f"**Evidence JSON:** `docs/audits/phase-d-072-live-smoke-2026-07-15.json`",
        "",
        "| # | Case | Result |",
        "|---|------|--------|",
    ]
    for c in cases:
        num = c["case"].split("_", 1)[0] if c["case"][0].isdigit() else "—"
        lines.append(f"| {num} | `{c['case']}` | **{c['result']}** |")
    lines.extend(
        [
            "",
            "## Safety",
            "",
            "| Gate | Status |",
            "|------|--------|",
            "| makeWebhookUrl | blank (not set by suite) |",
            "| 074 | not touched (stay OFF) |",
            "| 117 / Folder 07 others / PROD | unchanged |",
            "| Real email / Make prod | none |",
            "",
            "## Mike next",
            "",
            report["mike_next"],
            "",
        ]
    )
    RESULT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"critical_pass": all_pass, "out": str(OUT)}, indent=2))
    return report


def run() -> dict:
    started = datetime.now(DENVER).isoformat()
    cases: list[dict] = []
    f0 = get_fields()
    print("fixture", WAS_FIXTURE, snapshot(f0))

    # --- Case 1: package build ---
    print("CASE 1 package build")
    reset_package()
    patch({F["build"]: True, F["send"]: False, F["sent"]: False})
    ok, f = wait_until(
        lambda x: truthy(x.get(F["ready"]))
        and len(str(x.get(F["subject"]) or "")) > 0
        and len(str(x.get(F["html"]) or "")) > 0
        and not truthy(x.get(F["build"])),
        timeout=180,
    )
    snap = snapshot(f)
    pass1 = (
        ok
        and snap["ready"]
        and snap["subject_len"] > 0
        and snap["html_len"] > 0
        and not snap["build"]
        and not snap["send"]
        and not snap["sent"]
    )
    cases.append(
        case_result(
            "1_package_build",
            True,
            pass1,
            snap,
            "" if pass1 else "Timeout or incomplete build — is DEV 072 ON with blank webhook?",
        )
    )
    if not pass1:
        print("CASE 1 FAILED — run offline-only remaining critical contracts")
        cases.append(offline_disabled())
        cases.append(offline_missing())
        cases.append(offline_retry())
        # Best-effort restore
        try:
            reset_package()
        except Exception as exc:  # noqa: BLE001
            print("restore warning", exc)
        return finish(started, cases, early_fail=True)

    built_subject = str(f.get(F["subject"]) or "")
    built_html = str(f.get(F["html"]) or "")
    built_recipients = str(f.get(F["recipients"]) or "")

    # --- Case 2 + 4: already-built + blank webhook ---
    print("CASE 2/4 already-built + blank webhook")
    patch({F["send"]: True, F["build"]: False})
    time.sleep(25)
    f = get_fields()
    snap = snapshot(f)
    pass2 = (
        snap["ready"]
        and snap["send"]
        and not snap["sent"]
        and snap["subject_len"] > 0
        and str(f.get(F["subject"]) or "") == built_subject
    )
    cases.append(
        case_result(
            "2_already_built_package",
            True,
            pass2,
            snap,
            "Send stays armed after send-only + blank webhook; package unchanged",
        )
    )
    cases.append(
        case_result(
            "4_blank_webhook",
            True,
            pass2 and not snap["sent"],
            snap,
            "No Sent stamp; Send not cleared — safe no-send with blank webhook",
        )
    )

    cases.append(offline_disabled())
    cases.append(offline_missing())

    print("CASE 5 live corroboration (blank webhook dominates)")
    patch({F["recipients"]: "", F["send"]: True, F["ready"]: True, F["sent"]: False})
    time.sleep(20)
    f = get_fields()
    snap = snapshot(f)
    cases[-1]["evidence"]["live_corroboration"] = snap
    if snap["sent"] or not snap["send"]:
        cases[-1]["result"] = "FAIL"
        cases[-1]["notes"] += " | live: unexpected Sent or Send cleared"

    patch({F["recipients"]: built_recipients or "phase-d-smoke@example.invalid", F["send"]: False})

    # --- Case 6: already-sent ---
    print("CASE 6 already-sent")
    patch(
        {
            F["sent"]: True,
            F["send"]: True,
            F["ready"]: True,
            F["build"]: False,
            F["subject"]: built_subject,
            F["html"]: built_html,
            F["recipients"]: built_recipients or "phase-d-smoke@example.invalid",
        }
    )
    time.sleep(20)
    f = get_fields()
    snap = snapshot(f)
    pass6 = snap["sent"] and not snap["build"] and snap["subject_len"] > 0
    cases.append(
        case_result(
            "6_already_sent_key",
            True,
            pass6,
            snap,
            "Sent stays checked; no rebuild arm",
        )
    )

    cases.append(offline_retry())

    # --- Case 8: duplicate-trigger ---
    print("CASE 8 duplicate-trigger")
    patch({F["sent"]: False, F["build"]: False, F["send"]: False, F["ready"]: True})
    time.sleep(8)
    f_before = get_fields()
    subj_before = str(f_before.get(F["subject"]) or "")
    patch({F["build"]: True})
    ok8, f = wait_until(lambda x: not truthy(x.get(F["build"])), timeout=120)
    snap = snapshot(f)
    pass8 = ok8 and snap["ready"] and not snap["send"] and not snap["sent"] and snap["subject_len"] > 0
    patch({F["build"]: False, F["send"]: False})
    time.sleep(10)
    f2 = get_fields()
    snap2 = snapshot(f2)
    pass8 = bool(pass8 and snap2["subject_len"] > 0)
    cases.append(
        case_result(
            "8_duplicate_trigger_protection",
            True,
            pass8,
            {"after_rebuild": snap, "idle": snap2, "subj_before": len(subj_before)},
            "Build re-run clears Build Now; idle leaves package intact",
        )
    )

    # --- Case 9: weekly timing prerequisites ---
    print("CASE 9 weekly timing prerequisites")
    week_id = first_id(get_fields().get(F["week"]))
    offline_timing = week_boundary_includes("2026-01-05", "2026-01-01", "2026-01-07") and not week_boundary_includes(
        "2026-01-08", "2026-01-01", "2026-01-07"
    )
    patch({F["week"]: [], F["build"]: True, F["send"]: False, F["sent"]: False})
    time.sleep(25)
    f = get_fields()
    snap = snapshot(f)
    live_no_fire = snap["build"] is True and not first_id(f.get(F["week"]))
    if week_id:
        patch({F["week"]: [week_id], F["build"]: False})
    time.sleep(2)
    snap_restored = snapshot(get_fields())
    cases.append(
        case_result(
            "9_weekly_timing_prerequisites",
            True,
            offline_timing and live_no_fire and bool(snap_restored["week"]),
            {"offline_boundary": offline_timing, "live_no_fire": snap, "restored": snap_restored},
            "Week empty prevents trigger fire; week boundary offline PASS",
        )
    )

    print("RESTORE fixture")
    reset_package()
    if week_id:
        patch({F["week"]: [week_id]})
    cases.append(
        case_result(
            "fixture_restored",
            False,
            True,
            snapshot(get_fields()),
            "Package cleared; links intact",
        )
    )

    return finish(started, cases, early_fail=False)


if __name__ == "__main__":
    run()
