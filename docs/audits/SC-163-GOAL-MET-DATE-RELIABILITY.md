# SC-163 — Goal Met Date reliability

**Status:** **COMPLETE / Live Tested** (2026-09-05) — Automation **066 v4.1** live + GitHub aligned  
**Date:** 2026-09-05 (ownership revision + v4.1 timezone fix + live proof)  
**Base:** `appn84sqPw03zEbTT`  
**Closeout:** [`SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md`](./SC-163-LIVE-VERIFICATION-CLOSEOUT-20260905.md)

## Task Classification

| Field | Value |
|---|---|
| Type | Data reliability / automation |
| Priority | P1 |
| Difficulty | High |
| Owner | Cursor |
| Backlog ID | SC-163 |
| Phase | 5 Close (live-tested) |
| Correct tool | Cursor (repo) + Mike Airtable UI for schema/paste |
| Repo | `127-si-shooting-challenge` |

## Root cause

`Enrollments.Goal Met Date` (`fldohCsXsrU4hYqrJ`) was originally a **lookup** of `Award Recipients → Date Awarded` (all awards), not the first activity date the shot goal was met.

- `Goal Met?` formula correctly means: `Total Shots Counted >= Target Goal Shots`.
- Looking up award dates conflates **gift-card fulfillment** with **activity goal met**.

## Final ownership rule

| Concept | Authority |
|---|---|
| **Goal Met?** | Formula on Enrollment: live counted shots vs target. **Do not change.** |
| **Goal Met Date** | Writable **date-only**: first America/Denver **Activity Date** where cumulative **counted** Submissions cross Target Goal Shots. Blank until met. **Never overwrite** once set. |
| **Conquered Goal / Date Awarded** | Award Recipients fulfillment log for gift card — **not** Goal Met Date. |

## Ownership decision (capacity)

Airtable automation capacity is **full**. Do **not** create Automation 122.

**Decision:** Extend **Automation 066** (v4.0 Goal Met Date stamp → **v4.1** date-key preserve). Mark Automation **122** SUPERSEDED.

## Preferred behavior (implemented in 066 v4.1)

1. Blank until met  
2. Record FIRST provable Activity Date from counted submissions (preserved calendar key — no TZ convert of YYYY-MM-DD)  
3. Never overwrite  
4. Stable if totals change later  
5. Retry-safe / deduped (`skipped_already_set`)  
6. Fail closed: `error_unprovable` / `error_ambiguous`  
7. Schema must be **date-only** (time off)

## Live proof (2026-09-05)

| Check | Result |
|---|---|
| Cleared wrong Goal Met Date before retest | Yes |
| Stamp | **8/30/2026** |
| Retry | Preserved **8/30/2026** |
| Duplicate milestones | None |
| Field | Date-only |
| 066 | May remain ON |

Prior v4.0 regression: UTC midnight Activity Date → Denver key `2026-08-29` + dateTime UI → **8/28/2026 6:00 PM**. Fixed in v4.1.

## Live dry-run (historical, pre-paste)

Tool: `tools/airtable/sc163_goal_met_date_probe.py`  
Evidence: `docs/audits/SC-163-goal-met-date-dry-run-20260905.json`

Athlete1 Schmidt: computed first date **2026-08-30** (crossing `recu6m5asBhfi0nYd`).

## Correction shipped

1. Schema: lookup/dateTime → **date-only** writable  
2. Paste **066 v4.1**  
3. Manual clear + retest (no backfill required for closeout)

## Explicit non-goals

No XP amount changes, Perfect Week, Automation 010/021, paste 013/067, restore retired automations, FUT-029, Season Simulation, unrelated data deletes.
