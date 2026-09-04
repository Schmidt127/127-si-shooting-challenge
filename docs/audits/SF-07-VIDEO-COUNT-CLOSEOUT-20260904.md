# SF-07 / SC-158 — Video Count ownership closeout

**Date:** 2026-09-04  
**Agent:** A2 (SF-07 Automation 006 / Video Count)  
**Base:** Production `appn84sqPw03zEbTT`  
**Branch:** `final/a2-sf07-video-count-20260904`  
**Start SHA:** `2c113c105769e9e3a75109f4846e71fb48d2c73d` (`origin/master`)

---

## Task Classification

| | |
|--|--|
| Type | Reliability disposition + live proof |
| Priority | P2 (SF-07) |
| Backlog ID | **SC-158** (SF-07) |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor + Airtable MCP |
| Repo | `127-si-shooting-challenge` |

---

## Disposition (final)

**RETIRE automation 006 — do not deploy.**

| Concern | Finding |
|--|--|
| Is `Submissions.Video Count` a formula? | **No** — live type `number` (`fldV3MCyC7qUo1eVc`, precision 0) |
| Is 006 live? | **No** — absent from MCP `list_automations` (50 automations; 005/007a/009… present; no 006) |
| Does any live automation write `Video Count`? | **No** — zero live automations reference `Video Count` / `fldV3MCyC7qUo1eVc` |
| Who owns presence gates? | **`Has Video?`** formula: `IF({Video Upload}, TRUE(), FALSE())` |
| Who owns Perfect Week video minimum? | **057** writes **`Perfect Week Video Count`** by counting **Video Feedback** rows linked to the week's submissions — **not** `Submissions.Video Count` |
| Web reads? | Perfect Week Video Count only (public profile / dashboard) — not Submissions.Video Count |

**Why not deploy 006:** Product gates already have live owners. Deploying 006 would only maintain an orphaned display number and recreate trigger/silent-miss surface (historical trigger only fired when `Video Count` was empty — missed add/remove/late updates).

**Why not “formula owns count”:** Attachment **count** cannot be a reliable Airtable formula today; presence is already formula-owned via `Has Video?`. Week-level Perfect Week count is script-owned by 057.

**Ownership model (canonical):**

1. **Presence / intake gates** → `Has Video?` (formula on `Video Upload`)
2. **Perfect Week video requirement** → `Perfect Week Video Count` via **057** (Video Feedback)
3. **`Submissions.Video Count`** → orphaned writable number; **non-authoritative**; stranded when `Video Count ≠ len(Video Upload)`

---

## Live schema proof (MCP `get_table_schema`)

| Field | Table | ID | Type | Notes |
|--|--|--|--|--|
| Video Upload | Submissions | `fld0pxr2NoMx2MxBu` | multipleAttachments | Source of truth for files |
| Video Count | Submissions | `fldV3MCyC7qUo1eVc` | number | Orphaned writable |
| Has Video? | Submissions | `fldHn8sQ3Ni7uTlto` | formula | `IF({Video Upload}, TRUE(), FALSE())` |
| Has Review Assets? | Submissions | `fld9vwPlfCVvjwZyJ` | formula | HW1/HW2/Video presence |
| Perfect Week Video Count | WAS | `flds8k6TuRScMWW79` | number | Written by 057 |
| Perfect Week Video Requirement Met? | WAS | `fldat2jCxT2sc9pms` | formula | `IF({Perfect Week Video Count} >= 3, 1, 0)` |

---

## Live automation inventory

- MCP `list_automations` on `appn84sqPw03zEbTT`: **no** automation named 006 / Set Video Count.
- Operator `Automations` table search for Name contains `006`: **0 rows**.
- GitHub script retained as **LEGACY / RETIRED** archive (same pattern as 075).

Versions:

| Artifact | Version / state |
|--|--|
| GitHub `006-…js` | **v3.0** historical body; header **RETIRED 2026-09-04** |
| Live 006 | **Absent** (intentional) |
| Live `Has Video?` | Formula (above) |
| Live 057 PW video path | Unchanged (do not modify 057 per SF-07 scope) |

---

## Disposable live proof matrix (Schmidt Athlete1 `recZEwkkXTJanDlG6`)

All SF-07 rows used note prefix `SF-07|…|20260904`. Created then **deleted** after proof (no leftover SF-07 notes).

| Case | Result | Observable |
|--|--|--|
| Zero videos, Video Count = 0 | `Has Video?` = 0; match | OK |
| One attachment, Video Count = 0 (no 006) | `Has Video?` = 1; **stranded** | Detectable mismatch |
| Multi (2) attachments, Video Count = 1 | `Has Video?` = 1; **stranded** | Detectable mismatch |
| Late-arriving video onto Count=0 | `Has Video?` → 1; Count stays 0 | Detectable without 006 |
| Remove attachments, leave Count = 1 | `Has Video?` → 0; Count = 1 | **Stranded after remove** |
| Stranded Count = 4/5 with no attachments | `Has Video?` = 0 | Detectable |
| Simulated 006 write Count ← attachment length | Match | Would be 006 behavior if deployed |
| Duplicate simulated 006 (idempotent) | Stay matched | No drift on re-run |
| Retry after failure | N/A for retired path | Documented — no live automation to retry |
| Perfect Week interaction | 057 counts Video Feedback, not Submissions.Video Count | Code + schema proof; 057/058 untouched |

Record IDs used (deleted): `recdTFHK20MfkXCMc`, `recp4JFI8Z4eCeLfQ`, `recXdLqAy1CRMj9iH`, `recmYj4kbX5SxsfWu`, `recFNfYzNzlSf1oGv`, `recAM7J9ndwdfOCkq`.

---

## Base reconciliation snapshot (post-cleanup)

Non-SF-07 submissions with videos in the current thin base matched (`Video Count` = attachment length = 1). Historical rows without videos typically store `Video Count` = 0. Intentional stranded disposables were cleaned.

**Failed/stranded detection rule (ops):** any Submission where `Number(Video Count) !== len(Video Upload || [])`.

Offline contract: `tests/automation-contracts/006-video-count-ownership.test.js`.

---

## Repo changes

| Path | Change |
|--|--|
| `airtable/automations/shooting-challenge/006-…js` | RETIRED header; historical body retained |
| `docs/automation-index.md` | 006 marked LEGACY RETIRED |
| `docs/audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md` | SF-07 CLOSED |
| `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` | **SC-158** COMPLETE |
| `docs/CURRENT-TRUTH.md` | SF-07/SC-158 note |
| `docs/audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md` | This file |
| `tests/automation-contracts/006-video-count-ownership.test.js` | Ownership + stranded detection tests |

**Not changed:** 057 / 058 / 070a (no regression evidence requiring edits).

---

## Close criteria

| Criterion | Status |
|--|--|
| Exact responsibility of 006 / Video Count decided | **PASS — retire** |
| Writers / triggers / formulas / live config inspected | **PASS** |
| Disposable matrix + stranded detectable | **PASS** |
| Tests + reconciliation evidence | **PASS** |
| GitHub ↔ live aligned (no 006 live; repo retired) | **PASS** |
| SF-07 closed | **PASS (SC-158)** |

---

## Operator guidance

- Do **not** paste or enable 006 in Airtable.
- Treat `Has Video?` and Video Feedback / 057 as authoritative for product behavior.
- Optional hygiene: ignore or manually clear orphaned `Video Count` mismatches; do not delete the field without a separate schema ticket.
