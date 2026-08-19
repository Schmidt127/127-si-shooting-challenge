# Tutorials → Tutorials & Assets migration preview (C-026)

**Script:** [`airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.js`](../../airtable/extension-scripts/safe-backfills/migrate-tutorials-into-tutorials-and-assets.js)  
**Tests:** `migrate-tutorials-into-tutorials-and-assets.test.js`  
**Base for first run:** DEV `appTetnuCZlCZdTCT`

## Decision conflict

| Source of truth | Direction |
|-----------------|-----------|
| Backlog C-026 + Agent 8 docs | Keep **Tutorials** (web `/tutorials`); retire **Tutorials & Assets** |
| This preview tool (Mike request 2026-08-17) | Source **Tutorials** → keep **Tutorials & Assets** |

Do **not** delete/rename Tutorials, and do **not** change web/automations/interfaces until Mike approves the review report and updates C-026.

## Live DEV snapshot (2026-08-17)

| Table | ID | Rows | Link fields |
|-------|-----|------|-------------|
| Tutorials | `tbldfoVGdhqATi4MS` | 32 | 0 |
| Tutorials & Assets | `tblDOTgsWfqPm18bw` | 32 | 0 |

Missing on target: `Legacy Tutorials Record ID`, `Migration Status`  
Missing table: `Tutorial Migration Review`  
Target primary field may be named with a BOM (`﻿Name`).

**v1.1 (post DRY_RUN fix):** Guaranteed Extension-safe unload; primary Name resolved as field ID `fldduBizp8qAnAMJW` (BOM `﻿Name`); WRITE blocked until Legacy Tutorials Record ID, Migration Status, and Tutorial Migration Review schema exist. Baseline report from Mike DRY_RUN: **28** HIGH / **3** POSSIBLE / **1** NO_MATCH_CREATE.

| Mode | Behavior |
|------|----------|
| DRY_RUN (default) | Schema compare, match classify, plan only — **no writes** |
| WRITE (`DRY_RUN=false` + `CONFIRM_WRITE=true`) | Create **only** `NO_MATCH_CREATE` target rows; create/update **Tutorial Migration Review** rows |

Never: delete Tutorials, overwrite existing Tutorials & Assets content, auto-merge overlaps, delete linked assets, touch app code.

## Classifications

- `HIGH_CONFIDENCE_MATCH` → report only
- `POSSIBLE_MATCH_REVIEW` → report only
- `NO_MATCH_CREATE` → create target row (when prerequisites exist)
- `MISSING_REQUIRED_DATA` → report; no create

## Prerequisites before write mode

Create in Airtable (DEV first), then re-run dry-run:

1. **Tutorials & Assets** fields:
   - `Legacy Tutorials Record ID` (single line text)
   - `Migration Status` (text or single select with `Migrated - Review Needed`)
2. Table **Tutorial Migration Review** with:
   - Source Tutorials Record ID
   - Target Tutorials and Assets Record ID
   - Match Classification
   - Confidence Score
   - Match Reasons
   - Conflicting Fields
   - Source Name / Target Name
   - Source Video Link / Target Video Link
   - Source Attachments / Target Attachments
   - Linked Asset Summary
   - Review Decision / Reviewed? / Final Action / Notes

## Field mapping notes (source → target)

| Compatible / transform | Cannot copy without schema |
|------------------------|----------------------------|
| Name → Name (BOM-aware) | Tutorial - Category (no target field) |
| Link to Video → Link to Video (url → multiline) | — |
| Tutorial Type → Type of Asset (multi → single; `Shout - Out` → `Shout Out`) | — |
| Brief Description → Brief Descriptions | — |
| Detailed Description → Detailed Description | — |
| Website Image Resolved → Display Image | — |
| Athlete Headshot - Lkp → Athlete Headshot | — |
| Publish checkbox → `checked` select | Athlete may fail if name not in hardcoded select |
| Associated Program, Sort Order, Thumbnail | Assignment Rationale is target-only (left alone) |

## Exact next steps before retiring Tutorials

1. Resolve C-026 keep-table decision (this tool vs backlog).
2. Create prerequisite fields + Tutorial Migration Review on DEV.
3. Dry-run script; save JSON.
4. Review HIGH/POSSIBLE rows; decide manually (script will not merge).
5. Write-mode creates for true orphans only; re-run until idle.
6. Repeat on PROD only after DEV approval.
7. Only then: repoint web/Softr/interfaces, then consider retiring Tutorials.
