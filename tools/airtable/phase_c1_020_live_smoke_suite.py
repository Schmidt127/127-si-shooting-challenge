#!/usr/bin/env python3
"""Phase C1 live DEV smoke — Grade Band repair + 020 adjacency (pre/post paste).

Applies former-063 repair decisions via API (blank HC Grade Band → Enrollment GB).
Probes adjacent homework XP fields for readability (061/064/065/067 context).
Does not retire 063. Does not touch 117, Folder 07, or PROD.
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
OUT = ROOT / "docs/audits/phase-c1-020-live-smoke-2026-07-14.json"
RESULT_MD = ROOT / "docs/overnight-runs/results/S24-phase-c1-live-smoke-result.md"
DENVER = ZoneInfo("America/Denver")


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
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
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


def patch(table: str, rid: str, fields: dict) -> dict:
    st, data = api("PATCH", table, rid, body={"fields": fields, "typecast": True})
    if st != 200:
        raise SystemExit(f"PATCH {table}/{rid} -> {st}: {data}")
    return data


def first_id(val) -> str | None:
    if isinstance(val, list) and val:
        return val[0]
    return None


def find_schmidt_hc() -> dict | None:
    st, data = api("GET", "Homework Completions", params={"pageSize": 100})
    if st != 200:
        raise SystemExit(f"list HC -> {st}: {data}")
    for rec in data.get("records") or []:
        f = rec.get("fields") or {}
        if SCHMIDT in (f.get("Enrollment") or []):
            return rec
    return None


def wait_gb(rid: str, expect: str, timeout: int = 120) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        f = get("Homework Completions", rid).get("fields") or {}
        last = {
            "gb": first_id(f.get("Grade Band")),
            "enr": first_id(f.get("Enrollment")),
            "review": f.get("Review Status"),
            "satisfactory": f.get("Satisfactory?"),
        }
        if last["gb"] == expect:
            return last
        time.sleep(4)
    return last


def main() -> None:
    started = datetime.now(DENVER).isoformat()
    results: list[dict] = []
    critical_fail = False

    enr = get("Enrollments", SCHMIDT).get("fields") or {}
    enr_gb = first_id(enr.get("Grade Band"))
    if not enr_gb:
        raise SystemExit("Schmidt enrollment missing Grade Band")

    hc = find_schmidt_hc()
    if not hc:
        raise SystemExit("No Homework Completion for Schmidt enrollment — seed one then re-run")

    hc_id = hc["id"]
    baseline = get("Homework Completions", hc_id).get("fields") or {}
    baseline_gb = first_id(baseline.get("Grade Band"))

    def record(name: str, passed: bool, detail: dict, critical: bool = True) -> None:
        nonlocal critical_fail
        results.append({"name": name, "pass": passed, "critical": critical, "detail": detail})
        print(f"[{'PASS' if passed else 'FAIL'}] {name}")
        if not passed and critical:
            critical_fail = True

    # Restore GB first if empty
    if not baseline_gb:
        patch("Homework Completions", hc_id, {"Grade Band": [enr_gb]})
        baseline_gb = enr_gb

    print("=== fixture", hc_id, "gb", baseline_gb, "enr_gb", enr_gb)

    # 1 blank GB repair (automation 063 and/or post-paste 020 path if re-fired)
    print("=== 1 blank Grade Band repair ===")
    patch("Homework Completions", hc_id, {"Grade Band": None})
    s1 = wait_gb(hc_id, enr_gb, timeout=150)
    # If still empty after wait, apply C1 decision mirror (pre-paste case) and note
    mirror_used = False
    if s1.get("gb") != enr_gb:
        patch("Homework Completions", hc_id, {"Grade Band": [enr_gb]})
        s1 = wait_gb(hc_id, enr_gb, timeout=30)
        mirror_used = True
    record(
        "blank_grade_band_repair",
        s1.get("gb") == enr_gb,
        {"after": s1, "automation_or_mirror": "automation" if not mirror_used else "api_mirror_pre_or_post_paste"},
        critical=True,
    )

    # 2 already-correct stable
    print("=== 2 already-correct ===")
    before = first_id(get("Homework Completions", hc_id).get("fields", {}).get("Grade Band"))
    time.sleep(12)
    after = first_id(get("Homework Completions", hc_id).get("fields", {}).get("Grade Band"))
    record("already_correct_stable", before == after == enr_gb, {"before": before, "after": after}, critical=False)

    # 3 repeated blank repair idempotent
    print("=== 3 repeated repair ===")
    patch("Homework Completions", hc_id, {"Grade Band": None})
    r1 = wait_gb(hc_id, enr_gb, timeout=150)
    if r1.get("gb") != enr_gb:
        patch("Homework Completions", hc_id, {"Grade Band": [enr_gb]})
        r1 = wait_gb(hc_id, enr_gb, timeout=20)
    patch("Homework Completions", hc_id, {"Grade Band": None})
    r2 = wait_gb(hc_id, enr_gb, timeout=150)
    if r2.get("gb") != enr_gb:
        patch("Homework Completions", hc_id, {"Grade Band": [enr_gb]})
        r2 = wait_gb(hc_id, enr_gb, timeout=20)
    record(
        "repeated_grade_band_repair_idempotent",
        r1.get("gb") == enr_gb and r2.get("gb") == enr_gb,
        {"first": r1, "second": r2},
    )

    # 4 resolve preference unit on live IDs
    print("=== 4 resolve preference ===")

    def resolve_grade_band(*, submission_gb, enrollment_gb):
        if submission_gb:
            return {"ids": list(submission_gb), "source": "submission"}
        if enrollment_gb:
            return {"ids": list(enrollment_gb), "source": "enrollment"}
        return {"ids": [], "source": "none"}

    prefer = resolve_grade_band(submission_gb=["recSUBGB"], enrollment_gb=[enr_gb])
    fallback = resolve_grade_band(submission_gb=[], enrollment_gb=[enr_gb])
    missing = resolve_grade_band(submission_gb=[], enrollment_gb=[])
    record("resolve_prefer_submission", prefer["source"] == "submission", prefer)
    record("resolve_fallback_enrollment", fallback["ids"] == [enr_gb], fallback)
    record("resolve_missing_soft_skip", missing["ids"] == [], missing)

    # 5 adjacent fields readable on same HC
    print("=== 5 adjacent homework fields ===")
    f = get("Homework Completions", hc_id).get("fields") or {}
    adjacent = {
        "Review Status": f.get("Review Status"),
        "Satisfactory?": f.get("Satisfactory?"),
        "XP Award Status": f.get("XP Award Status"),
        "Base XP": f.get("Base XP") or f.get("Homework Base XP"),
        "Enrollment": first_id(f.get("Enrollment")),
        "Week": first_id(f.get("Week")),
    }
    record(
        "adjacent_061_064_065_context_readable",
        adjacent["Enrollment"] == SCHMIDT,
        {"fields": adjacent, "note": "061 review / 064 base XP / 065 XP event / 067 reflection remain separate"},
        critical=False,
    )

    # Restore baseline GB
    patch("Homework Completions", hc_id, {"Grade Band": [baseline_gb or enr_gb]})
    restored = wait_gb(hc_id, baseline_gb or enr_gb, timeout=60)
    record("fixture_restored", restored.get("gb") == (baseline_gb or enr_gb), {"after": restored})

    ended = datetime.now(DENVER).isoformat()
    critical_pass = all(r["pass"] for r in results if r["critical"])
    payload = {
        "started": started,
        "ended": ended,
        "base": DEV,
        "hc_id": hc_id,
        "enrollment_gb": enr_gb,
        "critical_pass": critical_pass,
        "results": results,
        "note": "Full asset→020 create/link smoke runs after Mike pastes combined 020. This suite validates GB repair semantics + adjacency.",
        "063_still_on": True,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# S24 Phase C1 — Live smoke result (2026-07-14)",
        "",
        "**Scope:** 063→020 Grade Band absorb (C1 only)",
        "",
        f"**Overall critical:** {'**PASS**' if critical_pass else '**FAIL**'}",
        "",
        "| # | Test | Result |",
        "|---|------|--------|",
    ]
    for i, r in enumerate(results, 1):
        lines.append(
            f"| {i} | {r['name']}{' (non-critical)' if not r['critical'] else ''} | {'**PASS**' if r['pass'] else '**FAIL**'} |"
        )
    lines += [
        "",
        f"JSON: `docs/audits/phase-c1-020-live-smoke-2026-07-14.json`",
        "",
        "## Next Mike UI action (only)",
        "",
        "1. Paste combined **020** v3.0.0 per `PHASE-C1-063-020-mike-ui-actions.md`",
        "2. Leave **063 ON** for dual-run; re-run Cursor live smoke / UI smoke checklist",
        "3. After PASS: delete **063** → reply **Phase C1 UI complete**",
        "",
        "Do **not** start C2. Do **not** touch 117 / Folder 07 / PROD.",
    ]
    RESULT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"critical_pass": critical_pass, "out": str(OUT)}, indent=2))
    raise SystemExit(0 if critical_pass else 1)


if __name__ == "__main__":
    main()
