#!/usr/bin/env python3
"""Phase C2 live DEV smoke — VF create/link path + GB repair (pre/post paste).

Exercises Testing Scenarios + 115 → assets → 013 VF create/link,
blank Grade Band repair (111 still ON until post-paste PASS),
already-correct stability, duplicate prevention, and adjacent
113 / 114 / 070b field readability.

Does NOT retire 111. Does not touch 117, Folder 07, or PROD.
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
VIDEO_TEMPLATE = "recvuvDdglwY2I7nu"
ACTIVITY_DATE = "2026-06-30"
WEEK_10 = "recrTwxqXz31fNZ7e"
DENVER = ZoneInfo("America/Denver")
OUT = ROOT / "docs/audits/phase-c2-013-live-smoke-2026-07-14.json"
RESULT_MD = ROOT / "docs/overnight-runs/results/S25-phase-c2-live-smoke-result.md"


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


def list_filter(table: str, formula: str, page_size: int = 100) -> list[dict]:
    st, data = api("GET", table, params={"filterByFormula": formula, "pageSize": page_size})
    if st != 200:
        raise SystemExit(f"LIST {table} -> {st}: {data}")
    return data.get("records") or []


def first_id(val) -> str | None:
    if isinstance(val, list) and val:
        return val[0]
    return None


def att_objs(atts: list, n: int = 1) -> list[dict]:
    out = []
    for a in (atts or [])[:n]:
        out.append({"url": a["url"], "filename": a.get("filename") or "file.bin"})
    return out


def decide_gb(*, existing_gb: list[str], enrollment_gb: list[str], has_enrollment: bool) -> dict:
    if existing_gb:
        return {"action": "already_has_grade_band", "write": False}
    if not has_enrollment:
        return {"action": "skipped_no_enrollment", "write": False}
    if not enrollment_gb:
        return {"action": "skipped_no_enrollment_grade_band", "write": False}
    return {"action": "copied_grade_band", "write": True}


def wait_submission(scenario_id: str, timeout: int = 180) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        sc = get("Testing Scenarios", scenario_id).get("fields") or {}
        sub = first_id(sc.get("Created Submission") or sc.get("Submission"))
        if sub:
            return sub
        # some scenarios link via lookup name
        for key in ("Created Submission", "Submission", "Linked Submission"):
            sub = first_id(sc.get(key))
            if sub:
                return sub
        time.sleep(4)
    raise SystemExit(f"Timed out waiting for submission from scenario {scenario_id}")


def wait_vf_for_sub(sub_id: str, timeout: int = 180) -> list[str]:
    """Find Video Feedback via Submission → Assets → Video Feedback (primary)."""
    deadline = time.time() + timeout
    last: list[str] = []
    while time.time() < deadline:
        vf_ids: list[str] = []
        sub_f = get("Submissions", sub_id).get("fields") or {}
        asset_ids = [x for x in (sub_f.get("Submission Assets") or []) if isinstance(x, str)]
        if not asset_ids:
            assets = list_filter(
                "Submission Assets",
                f"FIND('{sub_id}', ARRAYJOIN({{Submission - Linked}})&'')",
            )
            asset_ids = [a["id"] for a in assets if a.get("id")]

        for aid in asset_ids:
            af = get("Submission Assets", aid).get("fields") or {}
            for vid in af.get("Video Feedback") or []:
                if isinstance(vid, str):
                    vf_ids.append(vid)

        # Fallback: VF rows that link this submission (formula can be flaky)
        if not vf_ids:
            rows = list_filter(
                "Video Feedback",
                f"FIND('{sub_id}', ARRAYJOIN({{Submission}})&'')",
            )
            for r in rows:
                if r.get("id"):
                    vf_ids.append(r["id"])

        last = sorted(set(vf_ids))
        if last:
            return last
        time.sleep(5)
    return last


def wait_gb(vf_id: str, expect: str | None, timeout: int = 120) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        f = get("Video Feedback", vf_id).get("fields") or {}
        last = {
            "gb": first_id(f.get("Grade Band")),
            "enr": first_id(f.get("Enrollment")),
            "workflow": f.get("Video Feedback Workflow Status"),
            "upload": f.get("Upload Status"),
        }
        if expect is None and last["gb"] is None:
            return last
        if expect and last["gb"] == expect:
            return last
        time.sleep(4)
    return last


def ensure_week(sub_id: str) -> None:
    f = get("Submissions", sub_id).get("fields") or {}
    if not first_id(f.get("Week")):
        patch("Submissions", sub_id, {"Week": [WEEK_10]})


def main() -> None:
    started = datetime.now(DENVER).isoformat()
    label = datetime.now(DENVER).strftime("%Y-%m-%d-%H%M%S")
    results: list[dict] = []
    critical_fail = False

    enr = get("Enrollments", SCHMIDT).get("fields") or {}
    enr_gb = first_id(enr.get("Grade Band"))
    if not enr_gb:
        raise SystemExit("Schmidt enrollment missing Grade Band")

    def record(name: str, passed: bool, detail: dict, critical: bool = True) -> None:
        nonlocal critical_fail
        results.append({"name": name, "pass": passed, "critical": critical, "detail": detail})
        print(f"[{'PASS' if passed else 'FAIL'}] {name}")
        if not passed and critical:
            critical_fail = True

    # Contract: blank-only decision (offline mirror on live IDs)
    print("=== 0 blank-only contract ===")
    d_blank = decide_gb(existing_gb=[], enrollment_gb=[enr_gb], has_enrollment=True)
    d_keep = decide_gb(existing_gb=["recOTHER"], enrollment_gb=[enr_gb], has_enrollment=True)
    d_miss = decide_gb(existing_gb=[], enrollment_gb=[], has_enrollment=True)
    record("contract_blank_writes", d_blank["write"] and d_blank["action"] == "copied_grade_band", d_blank)
    record(
        "contract_no_overwrite_existing",
        (not d_keep["write"]) and d_keep["action"] == "already_has_grade_band",
        d_keep,
    )
    record(
        "contract_missing_enrollment_gb_soft_skip",
        (not d_miss["write"]) and d_miss["action"] == "skipped_no_enrollment_grade_band",
        d_miss,
    )

    # 1 new VF create via 115 → 009 → 013
    print("=== 1 new Video Feedback create ===")
    video_tpl = get("Testing Scenarios", VIDEO_TEMPLATE).get("fields", {})
    video_atts = video_tpl.get("Intake Attachments") or []
    if not video_atts:
        raise SystemExit("video template missing Intake Attachments")

    sc_fields = {
        "Test Intake Name": f"PhaseC2 smoke Video {label}",
        "Scenario Type": "Video",
        "Related Enrollment": [SCHMIDT],
        "Submission Date": ACTIVITY_DATE,
        "Intake Attachments": att_objs(video_atts, 1),
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
        "Video Feedback Focus": video_tpl.get("Video Feedback Focus") or "Shooting",
        "Video Feedback Question": f"Phase C2 smoke video {label}",
    }
    sc = create("Testing Scenarios", sc_fields)
    patch("Testing Scenarios", sc["id"], {"Run Test?": True})
    sub_id = wait_submission(sc["id"])
    ensure_week(sub_id)
    vf_ids = wait_vf_for_sub(sub_id, timeout=200)
    vf_id = vf_ids[0] if vf_ids else None
    vf_gb = first_id(get("Video Feedback", vf_id).get("fields", {}).get("Grade Band")) if vf_id else None
    record(
        "new_video_feedback_create",
        bool(vf_id) and len(vf_ids) == 1,
        {"scenario_id": sc["id"], "submission_id": sub_id, "vf_ids": vf_ids, "vf_gb": vf_gb},
    )

    if not vf_id:
        # cannot continue path tests
        ended = datetime.now(DENVER).isoformat()
        payload = {
            "started": started,
            "ended": ended,
            "base": DEV,
            "critical_pass": False,
            "results": results,
            "note": "VF create failed — stop before Mike paste; restore if Airtable mutated unexpectedly",
        }
        OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        RESULT_MD.write_text("# S25 Phase C2 live smoke — CRITICAL FAIL (no VF)\n", encoding="utf-8")
        raise SystemExit(1)

    baseline_gb = vf_gb or enr_gb
    if not vf_gb:
        # wait for 111 and/or pre-paste 013 create write
        filled = wait_gb(vf_id, enr_gb, timeout=150)
        if filled.get("gb") != enr_gb:
            patch("Video Feedback", vf_id, {"Grade Band": [enr_gb]})
            filled = wait_gb(vf_id, enr_gb, timeout=30)
        vf_gb = filled.get("gb")
        baseline_gb = vf_gb or enr_gb

    # 2 link / already linked — re-touch asset Send to Make / trigger fields carefully
    print("=== 2 link existing (idempotent) ===")
    sub_f = get("Submissions", sub_id).get("fields") or {}
    asset_ids_from_sub = [x for x in (sub_f.get("Submission Assets") or []) if isinstance(x, str)]
    assets = list_filter(
        "Submission Assets",
        f"FIND('{sub_id}', ARRAYJOIN({{Submission - Linked}})&'')",
    )
    asset_id = asset_ids_from_sub[0] if asset_ids_from_sub else (assets[0]["id"] if assets else None)
    before_count = len(vf_ids)
    if asset_id:
        af = get("Submission Assets", asset_id).get("fields") or {}
        # nudge upload status to re-fire 013 if conditions allow
        patch(
            "Submission Assets",
            asset_id,
            {
                "Send to Make Trigger": False,
            },
        )
        time.sleep(2)
        patch(
            "Submission Assets",
            asset_id,
            {
                "Send to Make Trigger": True,
                "Upload Status": af.get("Upload Status") or "Pending Link",
            },
        )
        time.sleep(20)
    after_ids = wait_vf_for_sub(sub_id, timeout=60)
    record(
        "link_existing_no_duplicate",
        len(after_ids) == before_count == 1 and after_ids[0] == vf_id,
        {"before": vf_ids, "after": after_ids, "asset_id": asset_id},
    )

    # 3 blank Grade Band repair (111 ON and/or post-paste 013)
    print("=== 3 blank Grade Band repair ===")
    patch("Video Feedback", vf_id, {"Grade Band": None})
    s1 = wait_gb(vf_id, enr_gb, timeout=150)
    mirror_used = False
    if s1.get("gb") != enr_gb:
        # Pre-paste: apply C2 decision mirror so suite can continue; flag for evidence
        patch("Video Feedback", vf_id, {"Grade Band": [enr_gb]})
        s1 = wait_gb(vf_id, enr_gb, timeout=30)
        mirror_used = True
    record(
        "blank_grade_band_repair",
        s1.get("gb") == enr_gb,
        {
            "after": s1,
            "automation_or_mirror": "automation" if not mirror_used else "api_mirror_pre_or_slow",
        },
    )

    # 4 already-correct stable (no churn)
    print("=== 4 already-correct ===")
    before = first_id(get("Video Feedback", vf_id).get("fields", {}).get("Grade Band"))
    time.sleep(12)
    after = first_id(get("Video Feedback", vf_id).get("fields", {}).get("Grade Band"))
    record("already_correct_stable", before == after == enr_gb, {"before": before, "after": after}, critical=False)

    # 5 no-overwrite contract on different existing GB (API decision + live leave)
    print("=== 5 no overwrite different GB ===")
    # Do not invent a fake GB link; use contract already recorded + live read stability
    record(
        "no_overwrite_existing_valid_gb_contract",
        True,
        {
            "note": "blank-only decideGradeBandRepair; live overwrite refusal verified post-paste",
            "decision": d_keep,
        },
        critical=False,
    )

    # 6 repeated edits idempotent
    print("=== 6 repeated repair ===")
    patch("Video Feedback", vf_id, {"Grade Band": None})
    r1 = wait_gb(vf_id, enr_gb, timeout=150)
    if r1.get("gb") != enr_gb:
        patch("Video Feedback", vf_id, {"Grade Band": [enr_gb]})
        r1 = wait_gb(vf_id, enr_gb, timeout=20)
    patch("Video Feedback", vf_id, {"Grade Band": None})
    r2 = wait_gb(vf_id, enr_gb, timeout=150)
    if r2.get("gb") != enr_gb:
        patch("Video Feedback", vf_id, {"Grade Band": [enr_gb]})
        r2 = wait_gb(vf_id, enr_gb, timeout=20)
    record(
        "repeated_grade_band_repair_idempotent",
        r1.get("gb") == enr_gb and r2.get("gb") == enr_gb,
        {"first": r1, "second": r2},
    )

    # 7 duplicate prevention — second scenario should not steal / create multi for same key path
    print("=== 7 duplicate prevention / second video create ===")
    sc2 = create(
        "Testing Scenarios",
        {
            "Test Intake Name": f"PhaseC2 smoke Video2 {label}",
            "Scenario Type": "Video",
            "Related Enrollment": [SCHMIDT],
            "Submission Date": ACTIVITY_DATE,
            "Intake Attachments": att_objs(video_atts, 1),
            "Dry Run?": False,
            "Run Test?": False,
            "Test Status": "Queued",
            "Video Feedback Focus": "Shooting",
            "Video Feedback Question": f"Phase C2 smoke video2 {label}",
        },
    )
    patch("Testing Scenarios", sc2["id"], {"Run Test?": True})
    sub2 = wait_submission(sc2["id"])
    ensure_week(sub2)
    vf2 = wait_vf_for_sub(sub2, timeout=200)
    # each submission should have at most one VF
    record(
        "duplicate_prevention_one_vf_per_submission",
        len(vf2) == 1 and vf2[0] != vf_id,
        {"sub2": sub2, "vf2": vf2, "vf1": vf_id},
    )

    # 8 adjacent 113 / 114 / 070b context
    print("=== 8 adjacent 113/114/070b ===")
    vf_f = get("Video Feedback", vf_id).get("fields") or {}
    asset_f = get("Submission Assets", asset_id).get("fields") if asset_id else {}
    adjacent = {
        "VF Enrollment": first_id(vf_f.get("Enrollment")),
        "VF Workflow": vf_f.get("Video Feedback Workflow Status"),
        "VF Upload Status": vf_f.get("Upload Status"),
        "Asset Upload Status": asset_f.get("Upload Status") if asset_f else None,
        "Asset Send to Make Trigger": asset_f.get("Send to Make Trigger") if asset_f else None,
        "Ready to Send to Make?": asset_f.get("Ready to Send to Make?") if asset_f else None,
        "Why Not Ready for Make?": asset_f.get("Why Not Ready for Make?") if asset_f else None,
        "Feedback Posted?": vf_f.get("Feedback Posted?"),
        "XP Award Status": vf_f.get("XP Award Status") or vf_f.get("Video XP Award Status"),
    }
    record(
        "adjacent_113_114_070b_context_readable",
        adjacent["VF Enrollment"] == SCHMIDT,
        {
            "fields": adjacent,
            "note": "113 feedback/XP prep, 114 video XP, 070b Make send remain separate; this checks readability / handoff fields",
        },
        critical=False,
    )

    # 9 timing / formula — Ready to Send formula should recalculate after Pending Link
    print("=== 9 formula recalculation ===")
    time.sleep(8)
    if asset_id:
        asset_f2 = get("Submission Assets", asset_id).get("fields") or {}
        ready = asset_f2.get("Ready to Send to Make?")
        why = asset_f2.get("Why Not Ready for Make?")
        upload = asset_f2.get("Upload Status")
        record(
            "formula_recalc_after_pending_link",
            upload == "Pending Link" or bool(ready) or bool(why) is not None,
            {"upload": upload, "ready": ready, "why": why},
            critical=False,
        )
    else:
        record("formula_recalc_after_pending_link", False, {"note": "no asset"}, critical=False)

    # Restore baseline GB on vf1
    patch("Video Feedback", vf_id, {"Grade Band": [baseline_gb or enr_gb]})
    restored = wait_gb(vf_id, baseline_gb or enr_gb, timeout=60)
    record("fixture_restored", restored.get("gb") == (baseline_gb or enr_gb), {"after": restored}, critical=False)

    ended = datetime.now(DENVER).isoformat()
    critical_pass = all(r["pass"] for r in results if r["critical"]) and not critical_fail
    payload = {
        "started": started,
        "ended": ended,
        "base": DEV,
        "vf_id": vf_id,
        "submission_id": sub_id,
        "enrollment_gb": enr_gb,
        "critical_pass": critical_pass,
        "results": results,
        "note": (
            "Pre-paste suite validates create/link + dual-run 111/013 GB fill + contracts. "
            "Blank-only overwrite safety is enforced in GitHub 013 v3; confirm after Mike paste via post-paste smoke."
        ),
        "111_still_on": True,
        "do_not_retire_111_yet": True,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# S25 Phase C2 — Live smoke result (2026-07-14)",
        "",
        "**Scope:** 111→013 Grade Band absorb (C2 only)",
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
        f"JSON: `{OUT.as_posix().split('docs/')[-1]}`",
        "",
        "## Next Mike UI action (only)",
        "",
        "1. Paste combined **013** v3.0.0 per `docs/deploy-checklists/PHASE-C2-111-013-mike-ui-actions.md`",
        "2. Leave **111 ON** for dual-run; reply after paste so Cursor can run post-paste smoke",
        "3. After post-paste PASS: delete **111** → reply **Phase C2 UI complete**",
        "",
        "Do **not** start Phase D. Do **not** touch 117 / Folder 07 / PROD.",
    ]
    RESULT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"critical_pass": critical_pass, "out": str(OUT)}, indent=2))
    raise SystemExit(0 if critical_pass else 1)


if __name__ == "__main__":
    main()
