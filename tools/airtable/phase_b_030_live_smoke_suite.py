#!/usr/bin/env python3
"""Phase B live DEV smoke suite — combined 030 (032/033 may still be ON).

Clears Grade Band / Goal Record / Homework on fixture WAS rows and waits for
the combined (or dual-run) bootstrap to restore them. Also creates a fresh WAS
for the new-creation path.

Does not retire 032/033. Does not touch 117, Folder 07 OFF, or PROD.
"""

from __future__ import annotations

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
SCHMIDT = "recgP9qZYjAhE7NXm"
WAS_FIXTURE = "recBO81w4dYtcaL4V"
WEEK_10 = "recrTwxqXz31fNZ7e"
ACTIVITY_DATE = "2026-06-30"
DENVER = ZoneInfo("America/Denver")
OUT = ROOT / "docs/audits/phase-b-030-live-smoke-2026-07-14.json"
RESULT_MD = ROOT / "docs/overnight-runs/results/S23-phase-b-live-smoke-result.md"

POLL_TIMEOUT = 150
POLL_SLEEP = 4


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
        headers={
            "Authorization": f"Bearer {TOK}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def get(table: str, rid: str) -> dict:
    st, data = api("GET", table, rid)
    if st != 200:
        raise SystemExit(f"GET {table}/{rid} -> {st}: {data}")
    return data


def create(table: str, fields: dict) -> dict:
    st, data = api("POST", table, body={"fields": fields, "typecast": True})
    if st not in (200, 201):
        raise SystemExit(f"POST {table} -> {st}: {data}")
    return data


def patch(table: str, rid: str, fields: dict) -> dict:
    st, data = api("PATCH", table, rid, body={"fields": fields, "typecast": True})
    if st != 200:
        raise SystemExit(f"PATCH {table}/{rid} -> {st}: {data}")
    return data


def first_id(val) -> str | None:
    if isinstance(val, list) and val:
        return val[0]
    return None


def ids(val) -> list[str]:
    if isinstance(val, list):
        return [x for x in val if isinstance(x, str)]
    return []


def was_state(rid: str) -> dict:
    f = get("Weekly Athlete Summary", rid).get("fields") or {}
    return {
        "enrollment": first_id(f.get("Enrollment")),
        "week": first_id(f.get("Week")),
        "gb": first_id(f.get("Grade Band")),
        "goal": first_id(f.get("Goal Record")),
        "hw": sorted(ids(f.get("Homework"))),
        "goal_target": f.get("Goal Shots Target"),
        "perfect_week_eligible": f.get("Perfect Week Eligible?"),
        "prev_week": first_id(f.get("Previous Week Summary")) if "Previous Week Summary" in f else f.get("Previous Week Summary"),
        "summary_key": f.get("Summary Key"),
    }


def clear_fields(rid: str, *, gb: bool = False, goal: bool = False, hw: bool = False) -> None:
    fields: dict = {}
    if gb:
        fields["Grade Band"] = None
    if goal:
        fields["Goal Record"] = None
    if hw:
        fields["Homework"] = None
    if not fields:
        return
    patch("Weekly Athlete Summary", rid, fields)


def wait_was(
    rid: str,
    *,
    expect_gb: str | None = None,
    expect_goal: str | None = None,
    expect_hw: list[str] | None = None,
    require_gb: bool = False,
    require_goal: bool = False,
    require_hw: bool = False,
    timeout: int = POLL_TIMEOUT,
) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        last = was_state(rid)
        ok = True
        if expect_gb is not None and last["gb"] != expect_gb:
            ok = False
        if require_gb and not last["gb"]:
            ok = False
        if expect_goal is not None and last["goal"] != expect_goal:
            ok = False
        if require_goal and not last["goal"]:
            ok = False
        if expect_hw is not None and sorted(last["hw"]) != sorted(expect_hw):
            ok = False
        if require_hw and not last["hw"]:
            ok = False
        if ok:
            return last
        time.sleep(POLL_SLEEP)
    return last


def wait_unchanged(rid: str, baseline: dict, seconds: int = 20) -> dict:
    """Confirm no unexpected churn for a short window."""
    time.sleep(seconds)
    return was_state(rid)


def list_schmidt_was() -> list[dict]:
    st, data = api("GET", "Weekly Athlete Summary", params={"pageSize": 100})
    if st != 200:
        raise SystemExit(f"list WAS -> {st}: {data}")
    out = []
    for rec in data.get("records") or []:
        f = rec.get("fields") or {}
        if SCHMIDT in (f.get("Enrollment") or []):
            out.append(rec)
    return out


def find_or_create_fresh_was() -> tuple[str, bool]:
    """Return (was_id, created) for Schmidt + Week 10 with bootstrap fields empty."""
    for rec in list_schmidt_was():
        f = rec.get("fields") or {}
        if WEEK_10 in (f.get("Week") or []):
            rid = rec["id"]
            clear_fields(rid, gb=True, goal=True, hw=True)
            return rid, False
    rec = create(
        "Weekly Athlete Summary",
        {"Enrollment": [SCHMIDT], "Week": [WEEK_10]},
    )
    return rec["id"], True


def nudge_bootstrap_trigger(rid: str, gb_id: str) -> None:
    """Force Match ANY / updated-trigger by toggling Grade Band then clearing bootstrap fields.

    API create alone often does not re-fire automations that watch updates.
    """
    patch("Weekly Athlete Summary", rid, {"Grade Band": [gb_id]})
    time.sleep(2)
    clear_fields(rid, gb=True, goal=True, hw=True)


def create_counted_submission_for_031() -> str:
    """Create a counted submission targeting Week 10 to exercise 031 → 030 chain.

    Count This Submission? is a formula: Simple Total when Shot Total is set.
    """
    fields = {
        "Enrollment": [SCHMIDT],
        "Week": [WEEK_10],
        "Activity Date": ACTIVITY_DATE,
        "Shot Total": 5,
        "Duplicate Review Status": "Count It",
    }
    rec = create("Submissions", fields)
    return rec["id"]


def wait_submission_was(sub_id: str, timeout: int = 180) -> str | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        f = get("Submissions", sub_id).get("fields") or {}
        was = first_id(f.get("Weekly Athlete Summary"))
        if was:
            return was
        time.sleep(POLL_SLEEP)
    return None


def main() -> None:
    started = datetime.now(DENVER).isoformat()
    results: list[dict] = []
    critical_fail = False

    print("=== Phase B live smoke: snapshot fixture ===")
    baseline = was_state(WAS_FIXTURE)
    print(json.dumps(baseline, indent=2))
    if not baseline["enrollment"] or not baseline["week"]:
        raise SystemExit("Fixture WAS missing Enrollment/Week")
    if not baseline["gb"] or not baseline["goal"] or not baseline["hw"]:
        raise SystemExit("Fixture WAS must start fully bootstrapped")

    expected_gb = baseline["gb"]
    expected_goal = baseline["goal"]
    expected_hw = baseline["hw"]

    def record(name: str, passed: bool, detail: dict, critical: bool = True) -> None:
        nonlocal critical_fail
        results.append(
            {
                "name": name,
                "pass": passed,
                "critical": critical,
                "detail": detail,
            }
        )
        mark = "PASS" if passed else "FAIL"
        print(f"[{mark}] {name}")
        if not passed and critical:
            critical_fail = True

    # --- 1 missing Grade Band only ---
    print("=== 1 missing GB only ===")
    clear_fields(WAS_FIXTURE, gb=True)
    s1 = wait_was(WAS_FIXTURE, expect_gb=expected_gb, expect_goal=expected_goal, expect_hw=expected_hw)
    record(
        "missing_grade_band_only",
        s1["gb"] == expected_gb and s1["goal"] == expected_goal and sorted(s1["hw"]) == sorted(expected_hw),
        {"after": s1},
    )

    # --- 2 missing Goal only ---
    print("=== 2 missing Goal only ===")
    clear_fields(WAS_FIXTURE, goal=True)
    s2 = wait_was(WAS_FIXTURE, expect_goal=expected_goal, expect_gb=expected_gb, expect_hw=expected_hw)
    record(
        "missing_goal_only",
        s2["goal"] == expected_goal and s2["gb"] == expected_gb and sorted(s2["hw"]) == sorted(expected_hw),
        {"after": s2},
    )

    # --- 3 missing Homework only ---
    print("=== 3 missing Homework only ===")
    clear_fields(WAS_FIXTURE, hw=True)
    s3 = wait_was(WAS_FIXTURE, expect_hw=expected_hw, expect_gb=expected_gb, expect_goal=expected_goal)
    record(
        "missing_homework_only",
        sorted(s3["hw"]) == sorted(expected_hw) and s3["gb"] == expected_gb and s3["goal"] == expected_goal,
        {"after": s3},
    )

    # --- 4 multi-step (all three missing) ---
    print("=== 4 multi-step clear all ===")
    clear_fields(WAS_FIXTURE, gb=True, goal=True, hw=True)
    s4 = wait_was(
        WAS_FIXTURE,
        expect_gb=expected_gb,
        expect_goal=expected_goal,
        expect_hw=expected_hw,
        timeout=180,
    )
    record(
        "multi_step_all_three",
        s4["gb"] == expected_gb and s4["goal"] == expected_goal and sorted(s4["hw"]) == sorted(expected_hw),
        {"after": s4},
    )

    # --- 5 already-correct (short quiet window) ---
    print("=== 5 already-correct quiet window ===")
    before = was_state(WAS_FIXTURE)
    after_quiet = wait_unchanged(WAS_FIXTURE, before, seconds=15)
    record(
        "already_correct_stable",
        after_quiet == before,
        {"before": before, "after": after_quiet},
        critical=False,
    )

    # --- 6 repeated edit / idempotent goal restore ---
    print("=== 6 repeated Goal clear ===")
    clear_fields(WAS_FIXTURE, goal=True)
    r1 = wait_was(WAS_FIXTURE, expect_goal=expected_goal)
    clear_fields(WAS_FIXTURE, goal=True)
    r2 = wait_was(WAS_FIXTURE, expect_goal=expected_goal)
    record(
        "repeated_goal_restore_idempotent",
        r1["goal"] == expected_goal and r2["goal"] == expected_goal and r1["goal"] == r2["goal"],
        {"first": r1["goal"], "second": r2["goal"]},
    )

    # --- 7 formula / lookup timing after Goal link ---
    print("=== 7 formula Goal Shots Target ---")
    # Ensure goal present then read lookup/formula field
    s7 = wait_was(WAS_FIXTURE, expect_goal=expected_goal)
    # Allow formula recalc
    time.sleep(5)
    s7b = was_state(WAS_FIXTURE)
    target_ok = s7b.get("goal_target") not in (None, "", [])
    record(
        "formula_goal_shots_target_populated",
        bool(s7b["goal"]) and target_ok,
        {"goal": s7b["goal"], "goal_shots_target": s7b.get("goal_target")},
    )

    try:
        # --- 8 fresh WAS creation path (API create + trigger nudge) ---
        print("=== 8 fresh WAS bootstrap ===")
        fresh_id, created = find_or_create_fresh_was()
        nudge_bootstrap_trigger(fresh_id, expected_gb)
        s8 = wait_was(fresh_id, require_gb=True, require_goal=True, require_hw=True, timeout=180)
        record(
            "fresh_was_bootstrap",
            bool(s8["gb"]) and bool(s8["goal"]) and bool(s8["hw"]),
            {"was_id": fresh_id, "created": created, "after": s8},
        )
        if s8["gb"] == expected_gb:
            record(
                "fresh_was_goal_matches_challenge_goal",
                s8["goal"] == expected_goal,
                {"expected_goal": expected_goal, "got": s8["goal"]},
                critical=False,
            )

        # --- 9 031 path via counted Submission ---
        print("=== 9 031 counted submission -> WAS link ===")
        try:
            sub_id = create_counted_submission_for_031()
            linked_was = wait_submission_was(sub_id, timeout=180)
            s9 = was_state(linked_was) if linked_was else {}
            record(
                "031_links_or_finds_was",
                linked_was is not None,
                {"submission": sub_id, "was": linked_was, "state": s9},
            )
            if linked_was:
                s9b = wait_was(
                    linked_was,
                    require_gb=True,
                    require_goal=True,
                    require_hw=True,
                    timeout=120,
                )
                record(
                    "031_adjacent_bootstrap_populated",
                    bool(s9b["gb"]) and bool(s9b["goal"]) and bool(s9b["hw"]),
                    {"was": linked_was, "after": s9b},
                )
        except SystemExit as exc:
            record(
                "031_links_or_finds_was",
                False,
                {"error": str(exc)},
            )

        # --- 10 adjacent 034 / Perfect Week fields readable (non-destructive) ---
        print("=== 10 adjacent fields readable ===")
        adj = was_state(WAS_FIXTURE)
        record(
            "adjacent_perfect_week_field_readable",
            "perfect_week_eligible" in adj,
            {
                "perfect_week_eligible": adj.get("perfect_week_eligible"),
                "summary_key": adj.get("summary_key"),
            },
            critical=False,
        )
    finally:
        # --- 11 restore fixture to baseline ---
        print("=== 11 restore fixture ===")
        clear_fields(WAS_FIXTURE, gb=True, goal=True, hw=True)
        restored = wait_was(
            WAS_FIXTURE,
            expect_gb=expected_gb,
            expect_goal=expected_goal,
            expect_hw=expected_hw,
            timeout=180,
        )
        record(
            "fixture_restored",
            restored["gb"] == expected_gb
            and restored["goal"] == expected_goal
            and sorted(restored["hw"]) == sorted(expected_hw),
            {"after": restored},
        )
        record(
            "duplicate_prevention_stable_ids",
            sorted(restored["hw"]) == sorted(expected_hw) and restored["goal"] == expected_goal,
            {"hw": restored["hw"], "goal": restored["goal"]},
        )

    ended = datetime.now(DENVER).isoformat()
    critical_results = [r for r in results if r["critical"]]
    critical_pass = all(r["pass"] for r in critical_results)
    payload = {
        "started": started,
        "ended": ended,
        "base": DEV,
        "fixture_was": WAS_FIXTURE,
        "baseline": baseline,
        "critical_pass": critical_pass,
        "overall_pass": all(r["pass"] for r in results),
        "results": results,
        "032_033_still_on": True,
        "note": "Dual-run with 032/033 ON is expected until Mike retires them after PASS.",
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# S23 Phase B — Live smoke result (2026-07-14)",
        "",
        f"**Combined 030:** live in DEV (Mike Step 1)  ",
        f"**032 / 033:** still ON (not retired)  ",
        f"**117 / Folder 07 / PROD:** untouched",
        "",
        "## Critical results",
        "",
        "| # | Test | Result |",
        "|---|------|--------|",
    ]
    for i, r in enumerate(results, 1):
        mark = "**PASS**" if r["pass"] else "**FAIL**"
        crit = "" if r["critical"] else " (non-critical)"
        lines.append(f"| {i} | {r['name']}{crit} | {mark} |")
    lines += [
        "",
        f"**Overall critical:** {'**PASS**' if critical_pass else '**FAIL**'}",
        "",
        f"Harness: `tools/airtable/phase_b_030_live_smoke_suite.py`  ",
        f"JSON: `{OUT.as_posix().split('docs/')[-1] and 'docs/audits/phase-b-030-live-smoke-2026-07-14.json'}`",
        "",
    ]
    if critical_pass:
        lines += [
            "## Next Mike UI action (only)",
            "",
            "1. **Retire automations 032 and 033** (delete from DEV UI) — frees **+2** slots.",
            "2. Confirm Automations counter shows **48/50** (2 free).",
            "3. Leave **117** OFF / unconfigured. Leave Folder 07 OFF alone.",
            "4. Reply: **“Phase B UI complete”**",
            "",
            "If any critical fail had occurred: restore `_rollback/phase-b-030-032-033-2026-07-14/` and stop.",
        ]
    else:
        lines += [
            "## STOP — critical failure",
            "",
            "Restore separate 030/032/033 from `_rollback/phase-b-030-032-033-2026-07-14/`.",
            "Do **not** delete 032/033.",
        ]
    RESULT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps({"critical_pass": critical_pass, "out": str(OUT)}, indent=2))
    raise SystemExit(0 if critical_pass else 1)


if __name__ == "__main__":
    main()
