# SC-163 — Goal Met Date reliability

**Status:** Repo ready — **not live-complete** until Mike schema + automation install  
**Date:** 2026-09-05  
**Base:** `appn84sqPw03zEbTT`  
**Branch:** `wave/a4-goal-met-date-20260905`

## Task Classification

| Field | Value |
|---|---|
| Type | Data reliability / automation |
| Priority | P1 (Completion Wave) |
| Difficulty | Medium |
| Owner | Agent 4 |
| Backlog ID | SC-163 |
| Phase | 3 Implementation (+ Phase 5 close after Mike install) |
| Correct tool | Cursor (repo) + Mike Airtable UI for schema |
| Repo | `127-si-shooting-challenge` |

## Root cause

`Enrollments.Goal Met Date` (`fldohCsXsrU4hYqrJ`) is a **lookup** of `Award Recipients → Date Awarded` (all awards), not the first activity date the shot goal was met.

- `Goal Met?` formula correctly means: `Total Shots Counted >= Target Goal Shots`.
- Looking up award dates conflates **gift-card fulfillment** with **activity goal met**, can return multiple polluted dates, and stays blank when Goal Met? is true but no award row exists.

Live meta (2026-09-05): `multipleLookupValues id=fldohCsXsrU4hYqrJ`.

## Final ownership rule

| Concept | Authority |
|---|---|
| **Goal Met?** | Formula on Enrollment: live counted shots vs target (may go blank if rollup later drops). |
| **Goal Met Date** | Writable **date**: first America/Denver **Activity Date** where cumulative **counted** Submissions cross Target Goal Shots. Blank until met. **Never overwrite** once set. Stable if totals change. |
| **Conquered Goal / Date Awarded** | Award Recipients fulfillment log for gift card — **not** Goal Met Date. |

## Preferred behavior (implemented)

1. Blank until met  
2. Record FIRST provable Activity Date from counted submissions  
3. Never overwrite  
4. Stable if totals change later  
5. Retry-safe / deduped (skip when already set)

## Live dry-run (2026-09-05)

Tool: `tools/airtable/sc163_goal_met_date_probe.py`  
Evidence: `docs/audits/SC-163-goal-met-date-dry-run-20260905.json`

| Category | Count |
|---|---|
| ok (not met / consistent) | 3 |
| met but blank date | **1** |
| date but not met | 0 |
| date later than activity | 0 |

**Would write (after schema conversion):**

| Athlete | Enrollment | Computed first date | Crossing submission | Before→After |
|---|---|---|---|---|
| Athlete1 Schmidt | `recZEwkkXTJanDlG6` | **2026-08-30** | `recu6m5asBhfi0nYd` | 1000→2500 (target 2000) |

`--apply` refused while field remains a lookup.

## Correction (smallest safe)

1. **Schema (Mike UI):** Convert `Goal Met Date` lookup → **Date** (US / local date). Existing lookup values do not persist as stored dates — expect blanks, then backfill.  
2. **Automation 122:** Stamp blank Goal Met Date on first proven crossing (capacity: confirm free slot; do not restore retired automations).  
3. **Extension backfill:** `backfill-goal-met-date.js` dry-run then `CONFIRM_WRITE` for blanks only.

## Disposable live test (pending Mike install)

After schema + 122 paste:

1. Confirm Athlete1 Schmidt still Goal Met? true and Goal Met Date blank.  
2. Trigger 122 on `recZEwkkXTJanDlG6` (or re-evaluate match conditions).  
3. Expect Goal Met Date = `2026-08-30`; re-run → `skipped_already_set`.  
4. Do not delete Weeks / payment / secrets / S3.

## Repo artifacts

| Path | Role |
|---|---|
| `airtable/automations/.../lib/sc-163-goal-met-date.js` | Pure crossing / write-decision helpers |
| `airtable/automations/.../lib/sc-163-goal-met-date.test.js` | Unit tests |
| `airtable/automations/.../122-...-stamp-goal-met-date.js` | Production automation (paste after schema) |
| `airtable/extension-scripts/safe-backfills/backfill-goal-met-date.js` | Dry-run / apply backfill |
| `tools/airtable/sc163_goal_met_date_probe.py` | API dry-run probe |
| `docs/deploy-checklists/SC-163-goal-met-date.md` | Mike paste/config checklist |

## Explicit non-goals

No XP amount changes, Perfect Week, Automation 021, paste 013/067, restore retired automations.
