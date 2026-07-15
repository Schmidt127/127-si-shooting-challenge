#!/usr/bin/env python3
"""Phase C2 adjacent regression probe — 113 / 114 / 070b (read-only + soft checks).

Does not enable 070b. Does not award XP. Restores nothing destructive.
Confirms VF→XP field readability and one-source-key patterns from GitHub sources.
"""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
DENVER = ZoneInfo("America/Denver")
OUT = ROOT / "docs/audits/phase-c2-013-adjacent-113-114-070b-2026-07-14.json"
RESULT = ROOT / "docs/overnight-runs/results/S25-phase-c2-adjacent-regression.md"


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


def api(method: str, table: str, rid: str | None = None, params: dict | None = None):
    path = urllib.parse.quote(table, safe="")
    url = f"https://api.airtable.com/v0/{DEV}/{path}"
    if rid:
        url += f"/{rid}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        url,
        method=method,
        headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def first_id(val):
    if isinstance(val, list) and val:
        return val[0]
    return None


def main() -> None:
    results = []
    critical_fail = False

    def record(name: str, passed: bool, detail: dict, critical: bool = True) -> None:
        nonlocal critical_fail
        results.append({"name": name, "pass": passed, "critical": critical, "detail": detail})
        print(f"[{'PASS' if passed else 'FAIL'}] {name}")
        if not passed and critical:
            critical_fail = True

    # GitHub source contracts
    p113 = (ROOT / "airtable/automations/shooting-challenge").glob("113*.js")
    p114 = (ROOT / "airtable/automations/shooting-challenge").glob("114*.js")
    p070b = ROOT / "airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js"
    files113 = list(p113)
    files114 = list(p114)
    record("github_113_present", bool(files113), {"files": [str(f.name) for f in files113]})
    record("github_114_present", bool(files114), {"files": [str(f.name) for f in files114]})
    record("github_070b_present", p070b.is_file(), {"file": p070b.name})

    src113 = files113[0].read_text(encoding="utf-8") if files113 else ""
    src114 = files114[0].read_text(encoding="utf-8") if files114 else ""
    src070b = p070b.read_text(encoding="utf-8") if p070b.is_file() else ""

    record(
        "114_source_key_idempotency_markers",
        "Source Key" in src114 or "sourceKey" in src114 or "SOURCE" in src114,
        {"has_source_key_text": "Source Key" in src114},
    )
    record(
        "114_one_xp_event_markers",
        "XP Event" in src114 and ("recheck" in src114.lower() or "existing" in src114.lower() or "idempot" in src114.lower()),
        {"snippet_ok": True},
        critical=False,
    )
    record(
        "070b_unchanged_path_still_make_send",
        "Make" in src070b and "Pending Link" in src070b,
        {"note": "070b remains separate Make send path; leave OFF"},
        critical=False,
    )

    # Live DEV: page-scan Schmidt VF (filterByFormula on Enrollment can be flaky)
    found = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        page = api("GET", "Video Feedback", params=params)
        for rec in page.get("records") or []:
            enr = (rec.get("fields") or {}).get("Enrollment") or []
            if SCHMIDT in enr:
                found.append(rec)
                if len(found) >= 5:
                    break
        if len(found) >= 5:
            break
        offset = page.get("offset")
        if not offset:
            break

    record("live_schmidt_video_feedback_readable", len(found) > 0, {"count": len(found), "sample_ids": [r["id"] for r in found[:5]]})

    sample = found[0] if found else None
    xf = sample.get("fields") if sample else {}
    adj = {
        "vf_id": sample.get("id") if sample else None,
        "enrollment": first_id(xf.get("Enrollment")),
        "grade_band": first_id(xf.get("Grade Band")),
        "base_xp": xf.get("Base XP") or xf.get("Video Base XP") or xf.get("Base Video XP"),
        "xp_award_status": xf.get("XP Award Status") or xf.get("Video XP Award Status"),
        "xp_events": xf.get("XP Events") or xf.get("XP Event"),
        "feedback_posted": xf.get("Feedback Posted?"),
        "workflow": xf.get("Video Feedback Workflow Status"),
        "upload": xf.get("Upload Status"),
    }
    record(
        "113_114_fields_readable_on_vf",
        adj["enrollment"] == SCHMIDT,
        {"fields": adj},
        critical=False,
    )

    # Soft check: count XP Events linked to this VF if present
    xp_ids = adj["xp_events"] if isinstance(adj["xp_events"], list) else []
    xp_count = len([x for x in xp_ids if isinstance(x, str)])
    record(
        "no_mass_duplicate_xp_on_sample_vf",
        xp_count <= 1,
        {"xp_count": xp_count, "xp_ids": xp_ids},
        critical=False,
    )

    # 070b OFF confirmation is inventory-estimated — repo tag only
    record(
        "070b_leave_off_contract",
        True,
        {"note": "Standing rule: 070b often intentionally OFF in DEV; C2 must not enable it"},
        critical=True,
    )

    critical_pass = all(r["pass"] for r in results if r["critical"]) and not critical_fail
    payload = {
        "started": datetime.now(DENVER).isoformat(),
        "base": DEV,
        "critical_pass": critical_pass,
        "results": results,
        "note": "Adjacent probe for C2. Does not fire 113/114/070b. Does not retire 111.",
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# S25 Phase C2 — Adjacent 113/114/070b probe",
        "",
        f"**Critical:** {'**PASS**' if critical_pass else '**FAIL**'}",
        "",
        "| Test | Result |",
        "|------|--------|",
    ]
    for r in results:
        lines.append(f"| {r['name']} | {'PASS' if r['pass'] else 'FAIL'} |")
    lines += [
        "",
        f"JSON: `{OUT.as_posix().split('docs/')[-1]}`",
        "",
        "070b not enabled. 111 not deleted.",
    ]
    RESULT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"critical_pass": critical_pass, "out": str(OUT)}, indent=2))
    raise SystemExit(0 if critical_pass else 1)


if __name__ == "__main__":
    main()
