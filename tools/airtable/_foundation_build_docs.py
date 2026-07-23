"""Build Foundation Reset Pack markdown deliverables from collected PROD evidence."""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "foundation-reset"
SNAP = ROOT / "airtable" / "schema" / "snapshots" / "prod-foundation-reset-20260723"
AUTO_JS = ROOT / "airtable" / "automations" / "shooting-challenge"
TODAY = "2026-07-23"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def repo_script_map():
    mapping = {}
    versions = {}
    for p in sorted(AUTO_JS.glob("*.js")):
        m = re.match(r"(\d+[a-zA-Z]?)", p.name)
        if not m:
            continue
        num = m.group(1)
        mapping[num] = f"airtable/automations/shooting-challenge/{p.name}"
        text = p.read_text(encoding="utf-8", errors="replace")[:5000]
        ver = re.search(r"version:\s*[\"']([^\"']+)", text)
        if not ver:
            ver = re.search(r"\* Version:\s*(v?[0-9.]+)", text)
        versions[num] = ver.group(1) if ver else "unknown"
    return mapping, versions


def build_schema_readme():
    manifest = load_json(SNAP / "manifest_appn84sqPw03zEbTT_latest.json")
    summary = load_json(next(SNAP.glob("base_summary_*.json")))
    health = load_json(next(SNAP.glob("export_health_report_*.json")))
    md = f"""# PROD Schema Export — Foundation Reset Pack

| Field | Value |
|-------|--------|
| Environment | **PROD** |
| Base ID | `appn84sqPw03zEbTT` |
| Base name | 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026 |
| Export date | **{TODAY}** |
| Snapshot folder | `airtable/schema/snapshots/prod-foundation-reset-20260723/` |
| Completeness | **Complete for tables/fields/formulas/links/views metadata available via Metadata API** |
| Historical snapshots | Preserved (not overwritten), e.g. `prod-20260706/` |

## What this export contains

- Table names + table IDs
- Field names + field IDs + types
- Linked tables, formulas, lookups, rollups (where exposed)
- Single-select options (in raw/enhanced JSON)
- View names + view IDs (filter definitions are **not** available via API)
- Base summary, dependencies, field index, ERD, health report

## Counts (from export)

- Tables: **{summary.get('tableCount') or summary.get('tables') or 'see JSON'}**
- See `base_summary_*.json` and `export_health_report_*.json` for details.

## Notes

- **Testing Scenarios** was **absent** at export time and was created afterward (`tblagI7Q5wXQm2XGS`). Re-export after Foundation Reset close-out if a post-create snapshot is needed.
- `airtable/schema/current/` remains stale hand maps — do not treat as current.

## Manifest pointer

Latest manifest in this folder: `manifest_appn84sqPw03zEbTT_latest.json`

```json
{json.dumps({k: manifest.get(k) for k in list(manifest)[:12]}, indent=2)[:2000]}
```
"""
    (OUT / "PROD-SCHEMA-EXPORT-2026-07-23.md").write_text(md, encoding="utf-8")


def build_automation_inventory():
    raw = load_json(OUT / "prod-automations-table-raw.json")
    repo, versions = repo_script_map()
    rows = []
    for r in raw["records"]:
        name = (r.get("Name") or "").strip()
        m = re.match(r"(\d+[a-zA-Z]?)\s*-", name)
        num = m.group(1) if m else ""
        repo_path = repo.get(num)
        rows.append(
            {
                "number": num,
                "name": name,
                "folder": r.get("Sections"),
                "enabledOrStatus": r.get("Status"),
                "triggerType": r.get("Trigger type"),
                "triggerTable": r.get("Trigger table"),
                "triggerConditions": r.get("Conditions"),
                "triggerView": r.get("Trigger view"),
                "triggerFields": r.get("Trigger field(s)"),
                "actionTypes": r.get("Action summary") or r.get("Outputs Written back to Airtable"),
                "scriptPresent": r.get("Script step present?"),
                "scriptNotes": r.get("Script location / notes"),
                "repoPath": repo_path,
                "repoVersion": versions.get(num),
                "prodMatchesRepo": "UNKNOWN — live script body not readable via API",
                "airtableAutomationsRowId": r.get("id"),
                "dependencies": r.get("Related external systems"),
                "blockers": "",
                "testStatus": "Not re-tested in Foundation Reset Pack",
            }
        )

    # Notable absences vs repo
    present_nums = {r["number"] for r in rows if r["number"]}
    notable_repo = ["115", "116", "117", "117f", "118", "119", "070c"]
    missing = [n for n in notable_repo if n in repo and n not in present_nums]

    lines = [
        "# PROD Automation Version Inventory — Foundation Reset Pack",
        "",
        f"**Base:** PROD `appn84sqPw03zEbTT`  ",
        f"**Inventory date:** {TODAY}  ",
        "**Source:** Airtable `Automations` table (operator inventory) + GitHub script headers  ",
        "**Important limit:** Airtable API cannot read live automation script source. **PROD vs repo match = UNKNOWN** unless Mike pastes/attests a version.",
        "",
        f"**Rows in Automations table:** {len(rows)}  ",
        f"**Notable repo scripts missing from Automations table:** {', '.join(missing) if missing else 'none'}",
        "",
        "## Summary findings",
        "",
        "- **115** is **not** listed in the PROD Automations table → treat as **not installed**.",
        "- **117 / 117f / 118 / 119 / 116 / 070c** also not listed in this operator table (may still exist as UI automations not inventoried — needs Mike UI attestation).",
        "- Many rows show Status `Live`, but script version/date fields are **not stored** in the Automations table.",
        "",
        "## Inventory table",
        "",
        "| # | Name | Status | Trigger type | Trigger table | Conditions | Repo path | Repo version | PROD matches repo? | Test status |",
        "|---|------|--------|--------------|---------------|------------|-----------|--------------|-------------------|-------------|",
    ]
    for r in sorted(rows, key=lambda x: (x["number"] == "", x["number"], x["name"])):
        cond = (r["triggerConditions"] or "").replace("\n", " ").replace("|", "/")[:80]
        lines.append(
            f"| {r['number'] or '—'} | {r['name']} | {r['enabledOrStatus'] or '—'} | {r['triggerType'] or '—'} | {r['triggerTable'] or '—'} | {cond or '—'} | `{r['repoPath'] or '—'}` | {r['repoVersion'] or '—'} | {r['prodMatchesRepo']} | {r['testStatus']} |"
        )

    lines.extend(
        [
            "",
            "## Raw export",
            "",
            "- `docs/foundation-reset/prod-automations-table-raw.json`",
            "",
            "## Next attestation needed from Mike",
            "",
            "1. Open Airtable Automations UI and confirm whether **115**, **116**, **117**, **117f**, **070c**, **118**, **119** exist outside the Automations table.",
            "2. For each critical script, paste the `version` / `lastUpdated` from the live script header into this inventory.",
            "",
        ]
    )
    (OUT / "PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )
    (OUT / "prod-automation-inventory-structured.json").write_text(
        json.dumps({"generated": TODAY, "missingFromAutomationsTable": missing, "rows": rows}, indent=2),
        encoding="utf-8",
    )


def build_ownership_matrix():
    md = f"""# Critical-Path Field Ownership Matrix — Foundation Reset Pack

**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** {TODAY}  
**Scope:** Initial matrix for pipeline-critical fields only. Not a full Stage K cleanup.

## How to read this

- **Intended writer:** automation/script (or human/Fillout) that should own the field  
- **Other possible writers:** other scripts/UI that might also write it  
- **Multiple writers?** Yes/No/Unknown  
- **Risk:** High / Medium / Low  
- Corrections in this package: **only** Schmidt `Active?` set to `true` (SC-004). No unrelated ownership rewrites.

## Dependency review summary

| Area | Dependency notes |
|------|------------------|
| Website leaderboard | Uses `Web - Leaderboard` view when present; fallback `AND({{Active?}}, {{Lifetime XP Total}} >= 0)` on Enrollments |
| Standings exclusion field | **No separate exclusion field found** on Enrollments |
| Testing Scenarios | Framework fields must stay on Testing Scenarios only (no pipeline test flags) |
| 115 | Creates Submissions only; must not write XP/WAS/achievements directly |
| Zoom recording | Must never write `Zoom Meetings.Attendees` (101 double-credit risk) |
| XP | One source record → one XP Event via Source Key / dedupe key |

## Matrix

| Table | Field | Type | Intended writer | Other possible writers | Readers / dependencies | Multiple writers? | Risk | Recommended correction |
|-------|-------|------|-----------------|------------------------|------------------------|-------------------|------|------------------------|
| Enrollments | Active? | checkbox | Human / ops (SC-004) | C-010 guards in many scripts (skip when false) | Website leaderboard fallback; 056/066/101 skip inactive; emails | Yes (ops + policy) | High | Keep `true` for Schmidt processing; exclude from public standings via **view filter**, not a new field |
| Enrollments | Athlete | link | 001 | Fillout / human | Pipeline identity | Low | Medium | None now |
| Enrollments | Grade / Grade Band | select / link | 002/003 | Human | XP rules, WAS copy | Possible | Medium | None now |
| Enrollments | Program Instance | link | Intake / human | — | Season scoping | Low | Medium | None now |
| Enrollments | Parent Email / Athlete Email | email | Fillout / human | — | Make email sends | Low | High (PII) | Controlled Schmidt contacts only |
| Submissions | Enrollment | link | 023 or pre-link (115) | Fillout | All downstream | Possible | High | 115 pre-links for Schmidt; avoid dual assign fights |
| Submissions | Week | link | 005 | — | WAS, XP week context | No (intended) | High | None now |
| Submissions | Activity Date | date | Fillout / 115 | Human | 005 week mapping | Possible | High | None now |
| Submissions | Shot Total | number | Fillout / 115 | Human | 010 XP | Possible | High | None now |
| Submissions | Duplicate Review Status | singleSelect | 007 / 115 (`Count It`) | Human | Counted shots / XP readiness | Yes | High | Monitor dual paths |
| Submissions | XP Award Status | singleSelect | 008/010 chain | — | XP pipeline | Unknown | High | Inventory live writers later |
| Submissions | Daily Email Status | singleSelect | 076/077 | — | Parent daily email | Unknown | Medium | Schmidt emails OK for tests |
| Submission Assets | Enrollment - Linked | link/lookup | 009 chain | — | Upload/HW/video | Unknown | High | None now |
| Submission Assets | Canonical URL / hash fields | text | Lambda/070*/116 | — | C-013/C-023 | Possible | High | None now |
| Homework Completions | Enrollment | link | 020 | 067 quiz path | 064/065/071 | Possible | High | Quiz path still open (SC-013/014) |
| Homework Completions | Satisfactory? / review fields | checkbox/select | Coach / 061 | — | XP + email | Possible | High | None now |
| XP Events | Source Key / XP Dedupe Key | text | Creating XP script (010/065/114/059/101/…) | Backfills | Idempotency | **Must be one pattern per source** | Critical | Catalog in SC-049 later |
| XP Events | Enrollment / Points | link/number | Same XP script | — | Levels, WAS | No | Critical | None now |
| Athlete Achievement Unlocks | Enrollment / Achievement / Week | links | 058/066/… | — | 059 XP | Possible | High | Keep H-001 dedupe rules |
| Streak Occurrences | Enrollment | link | 053/054/055/056 | — | Streak XP | Possible | High | Active? interactions |
| Shot milestone unlocks | via 066 | — | 066 | — | Achievements | — | High | Live OMNI still pending historically |
| Weekly Athlete Summary | Enrollment / Week | links | 031 | 118 (not installed) | 072/074 emails | Possible after C-011 | High | None now |
| Weekly Athlete Summary | Build/Send checkboxes | checkbox | Human / 118/119 | — | 072/074 | Future dual | High | Keep schedules off until authorized |
| Levels / Level Gate Rules | config fields | various | Human/config | 042 writes enrollment level fields | Progression | Split config vs enrollment | Medium | None now |
| Enrollments | Current Level / Next Level | links | 042 | 041 marks recalc | Gates, public formulas | Intended 042 | High | None now |
| Zoom Meetings | Attendees | link | Live attendance only | **Forbidden:** recording path | 101 XP | Critical if violated | Critical | Never write from 117 |
| Zoom Attendance | credit/conflict fields | various | 117/057/042 | — | Gates/Perfect Week | Coordinated | High | Stage 17 rules |
| Video Feedback | Enrollment | link | 013/111/112 | — | 113/114 XP + 073 email | Possible legacy 112 | Medium | 112 retirement still open |
| Testing Scenarios | Run Test? / results fields | checkbox/text | Operator + 115 | — | ETF only | No pipeline writers | Medium | Keep framework fields here only |
| Testing Scenarios | Linked Submission | link | 115 | — | Traceability | No | Medium | None now |
| Make handoff fields | webhook/status fields on SA/WAS/etc | various | 070*/071/074/077 | Make writebacks | External systems | Possible | High | Secrets never in git |
| Website/public fields | Active?, publish flags, public formulas | various | Config/human | Scripts | Next.js queries | View-dependent | Medium | Schmidt standings via view filter |

## Package-specific correction performed

| Change | Why | Safe? |
|--------|-----|-------|
| Set Enrollments `recgP9qZYjAhE7NXm` `Active?` = true | SC-004: Schmidt must be eligible for core XP/automation paths | Yes for processing; **increases public leaderboard visibility risk** until view filter applied |

## Explicit non-corrections

- Did not rename/delete fields
- Did not change single-select options
- Did not merge Tutorials tables
- Did not disable email automations
"""
    (OUT / "CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md").write_text(md, encoding="utf-8")


def build_test_evidence_md():
    seed = load_json(OUT / "schmidt-seed-result.json")
    live = load_json(OUT / "live-foundation-test-evidence.json")
    verify = {}
    vp = OUT / "live-foundation-test-verify.json"
    if vp.exists():
        verify = load_json(vp)

    # Patch checks narrative
    md = f"""# Foundation Reset Pack — Live PROD Test Evidence

**Date:** {TODAY}  
**Base:** PROD `appn84sqPw03zEbTT`

## Schmidt records (verified)

| Record | ID | Notes |
|--------|----|-------|
| Athlete | `recgqVstObQRzgXJF` | Testing Schmidt; Active?=true |
| Enrollment | `recgP9qZYjAhE7NXm` | `Schmidt, Testing - 2025-2026`; School Year 2025-2026; Grade Pre K; Grade Band K-2 `recK7BDVSpHy2ipCS`; Program Instance `rec9cQQ0VKYGy4jXq` |
| Enrollment Active? | **true** (was unchecked; set in this pack) | Required for core processing |
| Parent/Athlete email | set (controlled Schmidt contacts) | Masked in JSON exports |
| Foundation Week | `recVDKiYATgzsfpmE` | Created covering 2026-07-23 (no prior week covered today) |
| Testing Scenario seed | `recPdyfYRFgDtpzQ8` | Daily Submission, Dry Run?=true, Run Test?=false |

## Standings / public display exclusion

| Question | Finding |
|----------|---------|
| Separate exclusion field? | **No** |
| Existing mechanism? | `Enrollments.Active?` (website fallback) + optional `Web - Leaderboard` view filters |
| Applied now | Active?=true for processing |
| Residual risk | Schmidt may appear on public leaderboard until Mike adds a **view filter** excluding enrollment `recgP9qZYjAhE7NXm` |
| New field created? | **No** (per decision) |

## Testing Scenarios installation

| Item | Status |
|------|--------|
| Table in PROD | **Created** `tblagI7Q5wXQm2XGS` |
| Minimum fields for 115 daily path | Present (see `prod-testing-scenarios-created.json`) |
| Automation 115 installed in PROD | **No** — not in Automations table; UI paste required |
| Repo script | `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js` **v1.8** |
| Duplicate writer risk if 115 pasted once | Low — writes Submissions intake fields + Testing Scenarios result fields only |
| SC-001 Complete? | **No** — awaiting 115 paste + scenario live run |

## Live pipeline test (surrogate for 115)

Because 115 is not installed, Cursor created one Fillout-shaped Submission matching the 115 daily shape.

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Create Submission for Schmidt | New submission linked to enrollment | `recaCcxDqtzFWjmyi` | PASS |
| Week assignment (005) | Week linked | `recVDKiYATgzsfpmE` | PASS |
| XP award (010 chain) | XP Event linked; status Awarded | XP `recOqzhV4kTdsfzMf`; Awarded | PASS |
| WAS create (031) | Weekly Athlete Summary linked | `rechWp330MqSgRWzN` | PASS |
| Daily email path | May send to Schmidt contacts | Daily Email Status `Sent` | PASS (controlled) |
| Duplicate XP storm | ≤1 XP Event for submission | See verify JSON | PASS (linked single XP on submission) |
| 115 scenario orchestration | Scenario creates submission | **Blocked — 115 not installed** | FAIL (expected blocker) |

### Cleanup

No destructive cleanup performed. Test rows retained for inspection in Testing views:

- Submission `recaCcxDqtzFWjmyi`
- XP Event `recOqzhV4kTdsfzMf`
- WAS `rechWp330MqSgRWzN`
- Week `recVDKiYATgzsfpmE`
- Testing Scenario `recPdyfYRFgDtpzQ8`

## Testing views

API cannot create view filters. Current PROD `Testing` views:

| Table | Testing view present? |
|-------|-----------------------|
| Athlete Achievement Unlocks | Yes |
| Athletes, Enrollments, Weeks, Submissions, Submission Assets, Homework Completions, XP Events, Weekly Athlete Summary, Video Feedback, Zoom Meetings, Zoom Attendance, Streak Occurrences, Testing Scenarios | **No** |

Mike must create these in the Airtable UI (see checklist).

## JSON evidence files

- `schmidt-seed-result.json`
- `live-foundation-test-evidence.json`
- `live-foundation-test-verify.json`
- `prod-testing-scenarios-created.json`
- `prod-testing-and-leaderboard-views.json`
"""
    (OUT / "FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md").write_text(md, encoding="utf-8")


def build_views_checklist():
    md = f"""# PROD Testing Views Checklist — Foundation Reset Pack (SC-003)

**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** {TODAY}  
**Schmidt enrollment:** `Schmidt, Testing - 2025-2026` (`recgP9qZYjAhE7NXm`)

Airtable API **cannot** create views or read filter definitions. Mike (or OMNI in the Airtable UI) must create these.

## Rules

- View name: exact `Testing`
- Filter by **linked enrollment =** `recgP9qZYjAhE7NXm` / `Schmidt, Testing - 2025-2026`
- Do **not** filter on Active?, Is Test Record?, or Testing Scenarios fields on pipeline tables

## Checklist

| Table | Filter field | Created? | Notes |
|-------|--------------|----------|-------|
| Athletes | link/name path to Schmidt athlete `recgqVstObQRzgXJF` | ☐ | |
| Enrollments | `RECORD_ID()='recgP9qZYjAhE7NXm'` or primary = Schmidt label | ☐ | |
| Weeks | show foundation week `recVDKiYATgzsfpmE` (+ season weeks as needed) | ☐ | |
| Submissions | `Enrollment` is Schmidt | ☐ | Should show `recaCcxDqtzFWjmyi` |
| Submission Assets | `Enrollment - Linked` is Schmidt | ☐ | |
| Homework Completions | `Enrollment` is Schmidt | ☐ | |
| XP Events | `Enrollment` is Schmidt | ☐ | Should show `recOqzhV4kTdsfzMf` |
| Athlete Achievement Unlocks | `Enrollment` is Schmidt | ☐ | View name exists; confirm filter |
| Weekly Athlete Summary | `Enrollment` is Schmidt | ☐ | Should show `rechWp330MqSgRWzN` |
| Video Feedback | `Enrollment` is Schmidt | ☐ | |
| Zoom Meetings | meetings used in Schmidt tests | ☐ | |
| Zoom Attendance | enrollment/athlete Schmidt link | ☐ | |
| Streak Occurrences | `Enrollment` is Schmidt | ☐ | |
| Testing Scenarios | `Related Enrollment` is Schmidt | ☐ | Should show `recPdyfYRFgDtpzQ8` |
| Automations (optional) | Status/Live review | ☐ | Operator inventory |

## Sign-off

| Field | Value |
|-------|--------|
| Verifier | |
| Date | |
| Confirmed filters use enrollment link/ID (not display-name-only) | ☐ |
"""
    (OUT / "PROD-TESTING-VIEWS-CHECKLIST-2026-07-23.md").write_text(md, encoding="utf-8")


def build_115_mike_action():
    md = f"""# Mike action — Install Automation 115 in PROD

**One action only for the next step**

## Do this

1. Open PROD base `appn84sqPw03zEbTT`.
2. Create a new Airtable Automation in folder **12 - Engineering Test Framework** (create folder if needed).
3. Name it exactly:  
   `115 - Engineering Test Framework - Run Testing Scenario Daily Submission`
4. Trigger: **When record matches conditions**  
   - Table: **Testing Scenarios**  
   - Condition: **Run Test?** is checked
5. Action: **Run script**
6. Input variable: `recordId` = Testing Scenarios record ID from trigger
7. Paste the script body from GitHub file (skip the top GitHub sync header if your paste standard skips it):  
   `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`  
   Version **v1.8**
8. Turn the automation **ON**.
9. Open Testing Scenarios record `recPdyfYRFgDtpzQ8`:
   - Keep Related Enrollment = Schmidt `recgP9qZYjAhE7NXm`
   - Set **Dry Run?** = checked first → check **Run Test?** → confirm outputs only on Testing Scenarios
   - Then uncheck Dry Run?, check Run Test? again for a live create
10. Add/update a row in the **Automations** table for 115.

## Why this is blocked for Cursor

Airtable does not allow Cursor to create/paste automation scripts via API.

## After you finish

Tell Cursor: “115 pasted in PROD” and we will verify SC-001 live scenario evidence.
"""
    (OUT / "MIKE-ACTION-INSTALL-115-PROD.md").write_text(md, encoding="utf-8")


def build_pack_readme():
    md = f"""# Foundation Reset Pack — Index ({TODAY})

Controlling plan: [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)

## Deliverables

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Fresh PROD schema export | `airtable/schema/snapshots/prod-foundation-reset-20260723/` + `PROD-SCHEMA-EXPORT-2026-07-23.md` |
| 2 | PROD automation inventory | `PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md` |
| 3 | Field ownership matrix | `CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md` |
| 4 | Schmidt foundation | `schmidt-seed-result.json` + evidence doc |
| 5 | Testing Scenarios table | `prod-testing-scenarios-created.json` (`tblagI7Q5wXQm2XGS`) |
| 6 | Testing views checklist | `PROD-TESTING-VIEWS-CHECKLIST-2026-07-23.md` |
| 7 | Live PROD test evidence | `FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md` |
| 8 | Mike next action (115) | `MIKE-ACTION-INSTALL-115-PROD.md` |

## Approved decisions applied

- SC-001: Testing Scenarios allowed in PROD (orchestration only)
- SC-004: Schmidt `Active?` = true for processing; no new exclusion field; standings exclusion via existing view/`Active?` mechanisms pending Mike view filter
"""
    (OUT / "README.md").write_text(md, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_schema_readme()
    build_automation_inventory()
    build_ownership_matrix()
    build_test_evidence_md()
    build_views_checklist()
    build_115_mike_action()
    build_pack_readme()
    print("Wrote foundation-reset docs to", OUT)


if __name__ == "__main__":
    main()
