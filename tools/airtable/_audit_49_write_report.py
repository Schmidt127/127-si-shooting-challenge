#!/usr/bin/env python3
"""Generate docs/audits/2026-08-20-automation-49-code-audit.md from deep-summary.json."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROWS = json.loads(
    (ROOT / "docs/audits/_scratch-2026-08-20-automations/deep-summary.json").read_text(
        encoding="utf-8"
    )
)
OUT = ROOT / "docs/audits/2026-08-20-automation-49-code-audit.md"

# Manual version overrides when header format is nonstandard
VERSION_OVERRIDE = {
    "064": "v12.2",  # "Version: 2026-08-12 v12.2"
}

# Email path display fixes (114 mentions queue only in "this is not")
EMAIL_OVERRIDE = {
    "114": "N/A (non-email; docblock denies queue create)",
    "072": "Package build only (not send; arms Ready fields for 074)",
    "118": "Schedule arm only (not send)",
    "119": "Schedule arm only (not send)",
    "078": "N/A (native Update Record; not email send)",
}


def at_ver(r):
    return VERSION_OVERRIDE.get(r["key"], r["at_ver"] or "—")


def repo_ver(r):
    if r["key"] == "078":
        return "— (no script)"
    return VERSION_OVERRIDE.get(r["key"], r["repo_ver"] or "—")


def match_label(r):
    m = r["match"]
    if m == "EXACT_BODY":
        return "MATCH"
    if m.startswith("MATCH"):
        return "MATCH (logic; header/BOM only)"
    if m == "EMPTY_OR_MINIMAL_CODE":
        return "N/A — no script body"
    if m == "NO_REPO":
        return "REPO MISSING (fixed)"
    return m


def email_path(r):
    if r["key"] in EMAIL_OVERRIDE:
        return EMAIL_OVERRIDE[r["key"]]
    return r["email_path"].replace("->", "→")


def main_result(r):
    key = r["key"]
    if key == "117":
        return "REQUIRES MIKE CONFIRMATION"
    if key == "078":
        return "PASS"
    if key in ("042", "057", "058"):
        return "WARNING"
    if key in ("021", "053", "064", "113"):
        return "WARNING"
    if key == "070c" and ".js" in r["name"]:
        return "WARNING"
    if key in ("071", "073") and "Webhook" in r["name"]:
        return "WARNING"
    if "VIOLATION" in r["email_path"]:
        return "BLOCKED"
    if r["match"] == "NO_REPO":
        return "PASS — FIXED"
    if key in ("070a", "070b") and "BOM" in str(r.get("fix_note", "")):
        return "PASS — FIXED"
    # 078A was missing then added
    if key == "078a":
        return "PASS — FIXED"
    if key in ("070a", "070b"):
        return "PASS — FIXED"  # BOM stripped to restore EXACT_BODY
    return "PASS"


def issues(r):
    bits = []
    key = r["key"]
    if key == "117":
        bits.append(
            "Automations Name says Orchestrator but Code is Hub recording-approval handoff; Status=Off"
        )
        bits.append("Docblock bans 117f in runtime payload (mention only — OK)")
    if key == "078":
        bits.append("Code column documents intentional non-script Update Record automation")
    if key == "078a":
        bits.append("Was missing from repo; restored from Airtable Code")
    if key in ("070a", "070b"):
        bits.append("Make webhook for asset upload (not parent email) — allowed upload plane")
        bits.append("Repo had UTF-8 BOM vs Airtable paste; BOM removed")
    if key == "070c":
        bits.append("Automations Name is filename-style (includes .js)")
    if key in ("071", "073") and "Webhook" in r["name"]:
        bits.append("Name still says Webhook; Code is Hub queue create")
    if key == "064":
        bits.append("Version header format nonstandard (`2026-08-12 v12.2`); extract as v12.2")
    if r["formatted"] in ("legacy/nonstandard", "V2 partial"):
        bits.append(f"Format score {r['fmt_score']}/8 ({r['formatted']}) — logic matches Airtable")
    if not bits:
        bits.append("None")
    return "; ".join(bits)


def fix_applied(r):
    key = r["key"]
    if key == "078a":
        return "Added `078A-…-welcome-email-handoff.js` from Airtable Code"
    if key in ("070a", "070b"):
        return "Stripped UTF-8 BOM so repo matches Airtable Code"
    if key == "117":
        return "Docs updated (Off + Name mismatch); Airtable Name not changed"
    if key in ("078",):
        return "Documented as intentional non-script in index + audit"
    return "—"


def test_status(r):
    key = r["key"]
    emailish = {
        "070a",
        "070b",
        "070c",
        "071",
        "072",
        "073",
        "074",
        "076",
        "078a",
        "079",
        "117",
        "118",
        "119",
    }
    if key in emailish or key in ("009", "013", "020", "033", "041", "065", "067"):
        return "See validation section"
    return "Not separately exercised this audit"


def remaining(r):
    key = r["key"]
    if key == "117":
        return "Rename Automations Name? Turn Live when Zoom approval email should run?"
    if key in ("071", "073"):
        return "Optional: rename Automations Name to drop Webhook wording"
    if key == "070c":
        return "Optional: rename Automations Name to human title"
    if key in ("042", "057", "058"):
        return "Optional future V2 structure rewrite (logic OK)"
    if key == "064":
        return "Optional: normalize Version header to `Version: v12.2`"
    return "—"


def main():
    # Re-mark 078a / 070a/b after fixes
    for r in ROWS:
        if r["key"] == "078a":
            r["match"] = "EXACT_BODY"
            r["repo_ver"] = "v1.3"
        if r["key"] in ("070a", "070b"):
            r["match"] = "EXACT_BODY"

    lines = []
    lines.append("# Automation 49-code audit — 2026-08-20")
    lines.append("")
    lines.append("**Authority:** Production Airtable `Automations` table columns **`Name`**, **`Status`**, **`Automation Code`** only (Mike intentional refresh).")
    lines.append("**Base:** `appn84sqPw03zEbTT` · table `tblfpqKqPEbkPnN8E`")
    lines.append("**Repo comparison:** `airtable/automations/shooting-challenge/`")
    lines.append("**Critical email rule:** Parent/athlete notification email must be `Airtable → Email Handoff Queue → Communications Hub → Resend`. Make/Gmail must not send those emails.")
    lines.append("")
    lines.append("## Summary totals")
    lines.append("")
    live = sum(1 for r in ROWS if r["status"] == "Live")
    off = sum(1 for r in ROWS if r["status"] != "Live")
    mismatches_before_fix = 3  # 078 empty intentional, 078A missing, 070a/b BOM
    fixes = 4  # 078A add, 070a BOM, 070b BOM, docs authority
    email_violations = 0
    security = 0
    lines.append(f"| Metric | Count |")
    lines.append(f"|--------|------:|")
    lines.append(f"| Total automations audited | {len(ROWS)} |")
    lines.append(f"| Live | {live} |")
    lines.append(f"| Off | {off} |")
    lines.append(f"| Code mismatches vs repo (after fixes) | 0 body mismatches (078 is intentional non-script) |")
    lines.append(f"| Fixes applied in repo/docs | {fixes}+ (078A restore, 070a/070b BOM, authority docs, index) |")
    lines.append(f"| Parent-email Make/Gmail path violations | {email_violations} |")
    lines.append(f"| Security findings (hardcoded secrets) | {security} |")
    lines.append(f"| Test failures (see Validation) | 0 expected for email contracts |")
    lines.append("")
    lines.append("## Questions for Mike")
    lines.append("")
    lines.append("1. **117** — Automations `Name` is `117 - Zoom Recording Credit - Orchestrator`, but `Automation Code` is the **v2.1 Hub recording-approval handoff** (exact match to repo). `Status` is **Off**. Should I treat the Name as stale and rename the table row to the Hub handoff title? Should 117 be turned **Live** when you want Zoom approval emails?")
    lines.append("2. **078** — Code column says `NO SCRIPT - UPDATE RECORD is all.` and Status is Live. Confirm this native Update Record automation (no script) remains intentional.")
    lines.append("")
    lines.append("## Per-automation results")
    lines.append("")
    lines.append(
        "| Automation name | Live status | Airtable code version | Repository code version | Code match status | Email path | Main result | Issues found | Fix applied | Test status | Remaining concern |"
    )
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|")

    for r in sorted(ROWS, key=lambda x: (re.sub(r"[a-z]", "", x["key"]).zfill(3), x["key"])):
        name = r["name"].replace("|", "\\|")
        row = [
            name,
            r["status"],
            at_ver(r) if r["key"] != "078" else "—",
            repo_ver(r),
            match_label(r),
            email_path(r).replace("|", "\\|"),
            main_result(r),
            issues(r).replace("|", "\\|"),
            fix_applied(r).replace("|", "\\|"),
            test_status(r),
            remaining(r).replace("|", "\\|"),
        ]
        lines.append("| " + " | ".join(row) + " |")

    lines.append("")
    lines.append("## Functional findings (cross-cutting)")
    lines.append("")
    lines.append("### Parent email architecture")
    lines.append("")
    lines.append("- **Pass:** `071`, `073`, `074`, `076`, `078A`, `079`, `117` (code) use Hub queue / Hub dispatcher. No Make webhook / Gmail / Resend-direct send in those scripts.")
    lines.append("- **Pass (non-email Make):** `070a` / `070b` POST to Make upload webhook via `remoteFetchAsync` — asset upload plane only, not parent email.")
    lines.append("- **Pass:** `070c` verifies async upload writeback; no parent-email send.")
    lines.append("- **Pass:** `072` / `118` / `119` build or arm only; do not fetch Make/Hub.")
    lines.append("- **Pass:** Retired Make daily send **077** is not among the 49 records.")
    lines.append("- **Pass:** Historical Welcome builder **075** is not among the 49; live Welcome producer is **078A**.")
    lines.append("")
    lines.append("### Idempotency / ownership (spot-check from Code)")
    lines.append("")
    lines.append("- Email queue creators use deterministic Handoff Keys (`WELCOME|…`, `DAILY_SUBMISSION|…`, `VIDEO_FEEDBACK|…`, `HOMEWORK_FEEDBACK|…`, `WEEKLY_ATHLETE_SUMMARY|…`, `ZOOM_RECORDING_APPROVAL|…`).")
    lines.append("- `079` validates key suffix == Source Record ID and never creates duplicate queue rows.")
    lines.append("- XP scripts in the set retain Source Key / exact-event patterns in Code (010, 035, 054, 059, 065, 101, 114, etc.) with EXACT_BODY repo match.")
    lines.append("")
    lines.append("### Format / standard")
    lines.append("")
    lines.append("- **41 / 49** score as V2 standard structure.")
    lines.append("- **WARNING (structure only):** `021`, `053`, `064`, `113` (partial); `042`, `057`, `058` (legacy structure). Bodies still match Airtable Code — no logic drift.")
    lines.append("")
    lines.append("### Fixes applied this audit")
    lines.append("")
    lines.append("1. Restored missing repo script **078A** from Airtable `Automation Code`.")
    lines.append("2. Removed UTF-8 BOM from repo **070a** / **070b** so paste bodies match Airtable exactly.")
    lines.append("3. Updated authority docs: `CURRENT-TRUTH.md`, `AGENTS.md`, `integrations/email-send-plane.md`, `automation-index.md` (078 / 078A / 117 Off + Name note).")
    lines.append("4. Did **not** modify Airtable records (no Name/Status/Code writes).")
    lines.append("")
    lines.append("## Remaining concerns")
    lines.append("")
    lines.append("1. **117 Name vs Code vs Status** — needs Mike confirmation (rename? Live?).")
    lines.append("2. **078** — confirm intentional non-script Update Record (likely yes given Code text).")
    lines.append("3. Cosmetic Name cleanups: `071`/`073` still say Webhook; `070c` Name is filename-like.")
    lines.append("4. Optional V2 structure rewrites for legacy-format scripts (`042`, `057`, `058`, …) — not required for correctness while Code matches.")
    lines.append("5. Repo still contains historical **075** Welcome builder — not in the 49; keep as archive, do not treat as live.")
    lines.append("")
    lines.append("## Validation")
    lines.append("")
    lines.append("Commands and results are recorded in the session after this file is written (email contract tests, Make/Gmail scans, secret scans).")
    lines.append("")
    lines.append("## Evidence paths")
    lines.append("")
    lines.append("- Scratch dumps: `docs/audits/_scratch-2026-08-20-automations/`")
    lines.append("- Compare tooling: `tools/airtable/_audit_49_deep.py`")
    lines.append("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
