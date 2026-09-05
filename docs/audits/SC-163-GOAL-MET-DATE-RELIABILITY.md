# SC-163 — Goal Met Date reliability

**Status:** Repo ready under Automation **066 v4.0** — **not live-complete** until Mike schema + 066 paste + backfill  
**Date:** 2026-09-05 (ownership revision)  
**Base:** `appn84sqPw03zEbTT`  
**Branch:** `feature/sc-163-066-goal-met-date`

## Task Classification

| Field | Value |
|---|---|
| Type | Data reliability / automation |
| Priority | P1 |
| Difficulty | High |
| Owner | Cursor |
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
| **Goal Met?** | Formula on Enrollment: live counted shots vs target (may go blank if rollup later drops). **Do not change.** |
| **Goal Met Date** | Writable **date**: first America/Denver **Activity Date** where cumulative **counted** Submissions cross Target Goal Shots. Blank until met. **Never overwrite** once set. Stable if totals change. |
| **Conquered Goal / Date Awarded** | Award Recipients fulfillment log for gift card — **not** Goal Met Date. |

## Ownership decision (capacity)

Airtable automation capacity is **full**. Do **not** create Automation 122.

| Check | Result |
|---|---|
| Live 066 trigger | Enrollments when `Run Shot Milestone Check?` (`fldwsuKGoypFBn2w4`) is checked |
| Who arms the trigger | Automation **010** after successful submission reconciliation |
| Enrollment context | Yes — `recordId` = triggering Enrollment |
| Counted-shot chronology | Same filter as milestones: `Count This Submission?` (excludes future/dup/invalid), Activity Date, Total Shots Counted > 0 |
| Isolation | Goal Met Date step is try/catch isolated; does not roll back unlock writes |
| Retries | Safe — never overwrite non-blank Goal Met Date; milestone Source Key unchanged |
| Live vs GitHub (pre-v4.0) | Live **v3.9** matched GitHub body (trailing newline only) |

**Decision:** Extend **Automation 066** to v4.0. Mark Automation **122** SUPERSEDED.

### Assumptions retained from the 122 proposal

- Blank until met; first provable Activity Date only  
- Never invent; never overwrite; never use award date / NOW()  
- Same counting rules as Enrollment totals via `Count This Submission?`  
- Fail closed when met but crossing unprovable  
- Schema conversion lookup → writable date required before stamp  
- Dry-run backfill for historical blanks  

### Assumptions retired

- Standalone automation / free slot / optional `Run Goal Met Date Check?` checkbox  
- Installing Automation 122 under any name  

## Preferred behavior (implemented in 066)

1. Blank until met  
2. Record FIRST provable Activity Date from counted submissions  
3. Never overwrite  
4. Stable if totals change later  
5. Retry-safe / deduped (`skipped_already_set`)  
6. Fail closed: `error_unprovable` / `error_ambiguous`  

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

1. **Pre-conversion inventory (done 2026-09-05):** 0 nonblank lookups; 1 blank-but-met-provable (Athlete1 → `2026-08-30`). Snapshot + rollback evidence under `docs/audits/SC-163-preconversion-*`.  
2. **Schema (Mike UI):** Convert `Goal Met Date` lookup → **Date** (US / local date). Expect **cleared** cells; verify blanks before paste.  
3. **Paste Automation 066 v4.0** (no new automation).  
4. **Migration backfill v1.2:** `MIGRATION_MODE=true` — preserve only crossing-equal dates; replace mismatches; clear unprovable legacy; never invent.  

## Explicit non-goals

No XP amount changes, Perfect Week, Automation 010/021, paste 013/067, restore retired automations, FUT-029, Season Simulation, unrelated data deletes. **No Production write in the pre-conversion safety pass.**
