"""Build final reconciliation payload for failed 010724Z run."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.business_reconciliation import (  # noqa: E402
    actual_xp_buckets_from_events,
    sum_points,
)
from season_simulation.constants import DEFAULT_BASE_ID, SAFE_EMAIL_RECIPIENT  # noqa: E402
from season_simulation.run_registry import load_registry  # noqa: E402

RUN = "SEASON-SIM-2027-20260913T010724Z-threeathlete"
REG = Path(__file__).resolve().parent / "run_registries"
OUT_DIR = Path(__file__).resolve().parent / "reports"

EXPECTED_PERFECT = {
    "total_xp": 4910,
    "perfect_weeks": 10,
    "public_level": "G.O.A.T.",
    "buckets": {
        "Submission XP": 1340,
        "Homework XP": 630,
        "Video XP": 750,
        "Streak XP": 455,
        "Weekly Threshold XP": 480,
        "Perfect Week XP": 1000,
        "Shot Milestone XP": 165,
        "Zoom XP": 90,
    },
    "streak_thresholds": [3, 5, 7, 10, 20, 30, 40, 50, 60],
}


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    reg = load_registry(REG, f"{RUN}__athlete1-perfect")
    eid = reg.enrollment_id
    aid = reg.athlete_id
    enr = fields_of(c.get_record("Enrollments", eid))
    ath = fields_of(c.get_record("Athletes", aid))

    xp = c.list_records(
        "XP Events",
        formula=(
            f"OR(FIND('{eid}', {{Source Key}} & ''), "
            f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & ''), "
            f"{{Enrollment Record ID}}='{eid}')"
        ),
        max_records=500,
    )
    buckets = actual_xp_buckets_from_events(xp)
    prefixes = Counter(
        str(fields_of(r).get("Source Key") or "").split("|")[0] for r in xp
    )
    sks = [str(fields_of(r).get("Source Key") or "") for r in xp]
    dup_xp = {k: n for k, n in Counter(sks).items() if n > 1 and k}

    emails = c.list_records(
        "Email Handoff Queue",
        formula=(
            f"OR({{Enrollment Record ID}}='{eid}', "
            f"FIND('{eid}', {{Recipients JSON}} & ''))"
        ),
        max_records=300,
    )
    estatus = Counter(str(fields_of(r).get("Status") or "") for r in emails)
    ekeys = Counter(str(fields_of(r).get("Handoff Key") or "") for r in emails)
    dup_e = {k: n for k, n in ekeys.items() if n > 1 and k}
    unsafe: list[str] = []
    for r in emails:
        blob = str(fields_of(r).get("Recipients JSON") or "")
        for m in re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", blob):
            if m.lower() != SAFE_EMAIL_RECIPIENT.lower():
                unsafe.append(m.lower())

    hw_ids = [
        r.record_id
        for r in reg.records
        if r.table == "Homework Completions" and r.record_id
    ]
    hw_awarded = hw_pending = hw_linked = 0
    for i in range(0, len(hw_ids), 15):
        chunk = hw_ids[i : i + 15]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        for r in c.list_records("Homework Completions", formula=formula, max_records=20):
            f = fields_of(r)
            if f.get("Weekly Athlete Summary Link"):
                hw_linked += 1
            st = str(f.get("Award Status") or "")
            if st.lower() == "awarded":
                hw_awarded += 1
            elif st.lower() == "pending":
                hw_pending += 1

    streak_ids = list(enr.get("Streak Occurrences") or [])
    streak_keys = []
    for i in range(0, len(streak_ids), 10):
        chunk = streak_ids[i : i + 10]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        for r in c.list_records("Streak Occurrences", formula=formula, max_records=20):
            f = fields_of(r)
            streak_keys.append(f.get("Streak Occurrence Key"))

    bucket_rows = []
    for name, exp in EXPECTED_PERFECT["buckets"].items():
        act = int(buckets.get(name) or 0)
        bucket_rows.append(
            {
                "bucket": name,
                "expected": exp,
                "actual": act,
                "delta": act - exp,
                "ok": act == exp,
            }
        )

    payload = {
        "report_type": "final-production-run",
        "backlog_id": "SC-SEASON-SIM-001",
        "run_id": RUN,
        "production_base_id": DEFAULT_BASE_ID,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "execution_started_at": "2026-09-13T01:07:24.309825+00:00",
        "execution_ended_at": "2026-09-13T01:33:41.179Z",
        "automation_versions": {"053": "v5.6", "076": "v8.15", "101": "v6.9"},
        "temporary_formula_gates": {
            "installed_before_execute": True,
            "verified_match_canonical": True,
            "fields": [
                "Activity Date Is Future?",
                "Submitted Same Day?",
                "Perfect Week Grace Eligible?",
            ],
        },
        "execution_status": "FAILED_STOPPED_AFTER_ATHLETE1",
        "business_reconciliation_status": "FAIL",
        "profiles": {
            "athlete1_perfect": {
                "executed": True,
                "athlete_id": aid,
                "enrollment_id": eid,
                "athlete_name": f"{ath.get('First Name')} {ath.get('Last Name')}",
                "parent_email": ath.get("Parent Email")
                or ath.get("Parent Email - Cleaned"),
                "expected": EXPECTED_PERFECT,
                "actual": {
                    "total_xp": int(
                        enr.get("Lifetime XP Earned")
                        or enr.get("Lifetime XP Total")
                        or sum_points(buckets)
                    ),
                    "bucket_total_from_events": sum_points(buckets),
                    "buckets": buckets,
                    "xp_event_prefixes": dict(prefixes),
                    "perfect_weeks_xp_events": int(prefixes.get("PERFECT_WEEK") or 0),
                    "public_level": enr.get("Current Level - Public Facing Display"),
                    "level_status": enr.get("Level Status"),
                    "gate_debug": enr.get("Gate Debug Summary"),
                    "current_streak": enr.get("Current Shooting Streak"),
                    "longest_streak": enr.get("Longest Streak Days"),
                    "streak_occurrence_keys": streak_keys,
                    "homework": {
                        "registry_count": len(hw_ids),
                        "was_linked": hw_linked,
                        "awarded": hw_awarded,
                        "pending": hw_pending,
                    },
                    "email": {
                        "count": len(emails),
                        "statuses": dict(estatus),
                        "duplicate_handoff_keys": dup_e,
                        "unsafe_recipients": sorted(set(unsafe)),
                    },
                    "duplicate_xp_source_keys": dup_xp,
                },
                "bucket_comparison": bucket_rows,
                "pass": False,
                "failure_reasons": [
                    f"total XP expected {EXPECTED_PERFECT['total_xp']} actual {enr.get('Lifetime XP Earned')}",
                    f"Homework XP expected 630 actual {buckets.get('Homework XP')} ({hw_pending} completions still Award Status=Pending)",
                    f"Streak XP expected 455 actual {buckets.get('Streak XP')} (occurrences through 40 only; missing 50/60; Current=67 Longest=40)",
                    f"Weekly Threshold XP expected 480 actual {buckets.get('Weekly Threshold XP')}",
                    f"public level expected G.O.A.T. actual {enr.get('Current Level - Public Facing Display')} ({enr.get('Level Status')})",
                    f"Zoom gate effective {enr.get('Gate Debug Summary')}",
                ],
            },
            "athlete2_recovery": {
                "executed": False,
                "expected_total_xp": 2305,
                "expected_perfect_weeks": 1,
                "actual": None,
                "pass": False,
                "failure_reasons": [
                    "Not executed — harness stopped after athlete1 business FAIL"
                ],
            },
            "athlete3_edge": {
                "executed": False,
                "expected_total_xp": 3620,
                "expected_perfect_weeks": 5,
                "actual": None,
                "pass": False,
                "failure_reasons": [
                    "Not executed — harness stopped after athlete1 business FAIL"
                ],
            },
        },
        "tooling_notes": [
            "Stage E2_business_success did not receive live XP events (reported actual 0); post-run forensic used Enrollment-linked XP Events.",
            "WAS links were set on all 18 Homework Completions (orchestration fix confirmed).",
            "No cleanup performed on this run per Mike authorization.",
            "Prior failed run SEASON-SIM-2027-20260912T222521Z-threeathlete residue remained zero at pre-execute.",
        ],
        "final_verdict": (
            "FINAL SEASON SIMULATION FAIL — Perfect athlete Lifetime XP 4085/4910 "
            "(HW pending 8/18, streak capped at 40 missing 50/60, weekly thresholds short); "
            "Recovery and Edge not executed"
        ),
        "records_preserved": True,
        "cleanup_performed": False,
    }

    json_path = OUT_DIR / f"final-production-run-{RUN}.json"
    md_path = OUT_DIR / f"final-production-run-{RUN}.md"
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")

    p = payload["profiles"]["athlete1_perfect"]
    lines = [
        f"# Final Production Run — `{RUN}`",
        "",
        f"**Verdict:** `{payload['final_verdict']}`",
        "",
        "## Run metadata",
        "",
        f"- Run ID: `{RUN}`",
        f"- Production base: `{DEFAULT_BASE_ID}`",
        f"- Start: `{payload['execution_started_at']}`",
        f"- End: `{payload['execution_ended_at']}`",
        f"- Execution status: `{payload['execution_status']}`",
        f"- Business reconciliation: `{payload['business_reconciliation_status']}`",
        "",
        "## Automation versions (deployed)",
        "",
        "- 053 = v5.6",
        "- 076 = v8.15",
        "- 101 = v6.9",
        "",
        "## Temporary formula gates",
        "",
        "- Installed before execute: YES",
        "- Verified against canonical Season Sim packets: YES",
        "- Fields: Activity Date Is Future?, Submitted Same Day?, Perfect Week Grace Eligible?",
        "",
        "## Athlete IDs",
        "",
        f"- Perfect athlete: `{aid}` / enrollment `{eid}` ({p['athlete_name']})",
        "- Recovery: NOT EXECUTED",
        "- Edge: NOT EXECUTED",
        "",
        "## Perfect — XP buckets (expected vs actual)",
        "",
        "| Bucket | Expected | Actual | Δ | OK |",
        "|--------|---------:|-------:|--:|:--:|",
    ]
    for row in bucket_rows:
        lines.append(
            f"| {row['bucket']} | {row['expected']} | {row['actual']} | {row['delta']} | {'Y' if row['ok'] else 'N'} |"
        )
    lines += [
        "",
        f"- **Total XP expected:** {EXPECTED_PERFECT['total_xp']}",
        f"- **Total XP actual (Lifetime XP Earned):** {p['actual']['total_xp']}",
        f"- **Perfect Week XP events:** {p['actual']['perfect_weeks_xp_events']} (expected 10)",
        f"- **Public level:** {p['actual']['public_level']} / {p['actual']['level_status']}",
        f"- **Gate:** {p['actual']['gate_debug']}",
        f"- **Streak Current / Longest:** {p['actual']['current_streak']} / {p['actual']['longest_streak']}",
        f"- **Streak occurrence keys:** {p['actual']['streak_occurrence_keys']}",
        "",
        "## Homework settlement",
        "",
        f"- Registry HW completions: {p['actual']['homework']['registry_count']}",
        f"- WAS linked: {p['actual']['homework']['was_linked']}",
        f"- Awarded: {p['actual']['homework']['awarded']}",
        f"- Pending: {p['actual']['homework']['pending']}",
        "",
        "## Zoom",
        "",
        "- XP events: ZOOM_ATTEND_BASE=1, ZOOM_RECORDING_CREDIT=1 (90 XP) — matches expected Zoom XP",
        "- Gate effective Zoom count remains 1/2 (live-only gate credit)",
        "",
        "## Email handoffs (Perfect)",
        "",
        f"- Count: {p['actual']['email']['count']}",
        f"- Statuses: {p['actual']['email']['statuses']}",
        f"- Duplicate Handoff Keys: {p['actual']['email']['duplicate_handoff_keys'] or 'none'}",
        f"- Unsafe recipients: {p['actual']['email']['unsafe_recipients'] or 'none'}",
        "",
        "## Duplicate key audit",
        "",
        f"- Duplicate XP Source Keys: {p['actual']['duplicate_xp_source_keys'] or 'none'}",
        "",
        "## Recovery / Edge",
        "",
        "- Recovery expected 2305 XP / 1 PW — **not executed**",
        "- Edge expected 3620 XP / 5 PW — **not executed**",
        "",
        "## Errors / warnings",
        "",
    ]
    for reason in p["failure_reasons"]:
        lines.append(f"- {reason}")
    lines += [
        "",
        "## Tooling notes",
        "",
    ]
    for note in payload["tooling_notes"]:
        lines.append(f"- {note}")
    lines += [
        "",
        "## Post-run safety",
        "",
        "- Fresh-run records: PRESERVED (no cleanup)",
        "- Production formulas: restored after evidence write (see commit)",
        "- Automations 053/076/101: not reverted",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"json": str(json_path), "md": str(md_path)}, indent=2))


if __name__ == "__main__":
    main()
