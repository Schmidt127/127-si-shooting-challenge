# PKG-036 Production-Preflight Report

**Date:** 2026-08-13  
**Repository merge:** PR #171, merge commit `cc4e71eee284f8ae140bdb54aa16ab0e604e6a15`  
**Base:** `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` (`appn84sqPw03zEbTT`)  
**Evidence boundary:** Read-only Production inspection only. No Production records, schema, automations, triggers, or scripts were modified.

## Current live orientation

- Automation 041: `wflCRvaopntNPsc64`, deployed, 15-minute cron beginning `2026-08-08T16:00:00Z`, installed script v4.0.
- Automation 042: `wfl3aiiK8vI2tz0HA`, deployed, `Enrollments` record-enters-view trigger on `viwm9OgwkPKI2bii3`, installed script v3.4, dynamic `recordId` from the trigger.
- Automation 043: absent from the Production automation inventory; do not recreate.
- Existing queued signature: `Enrollments.Progression Last Queued Signature`, field ID `fldw2p0bfT54vk6ag`, single-line text.
- Missing target field: `Enrollments.Progression Last Reconciled Signature`. The Production field named `Last Reconciled Signature` is on another table and is not interchangeable.

## Configuration evidence

- Levels: 12 active records, unique thresholds from 0 through 2200 XP, sort order 1–12, maximum `G.O.A.T.` at 2200 XP.
- Level Gate Rules: 12 active `2026-2027` records, one observed rule per active Level; Level 1 disabled and Levels 2–12 enabled.
- `Level Gate Rules` has no `Program Instance` link in Production. PKG-036 therefore scopes gate selection by School Year / Rule Set and requires exactly one Program Instance on each Enrollment. Same-school-year multi-program isolation is not proven and is a stop condition requiring a separately approved schema change.

## Read-only Enrollment baseline

| Enrollment | Active | Program Instance | XP | Current | Next | Gate Rule | Status |
|---|---:|---|---:|---|---|---|---|
| `recCrNNAdVmQ4Y8fL` | true | `Shooting Challenge \| 2026-2027` | 310 | Beginner | Rookie Shooter | Level 2 Gate | Gate Blocked |
| `reclc46bQM8Wx0qWP` | true | `Shooting Challenge \| 2026-2027` | 100 | Beginner | Rookie Shooter | Level 2 Gate | Assigned |
| `recwuMDL6dqIVfvqH` | true | `Shooting Challenge \| 2026-2027` | 0 | Beginner | Rookie Shooter | Level 2 Gate | Assigned |

The queued signatures were present on all three orientation records and reflected the observed XP, gate statistics, School Year, active state, and Production gate configuration. The target reconciled-signature field was absent, so a complete PKG-036 audit could not classify reconciliation-signature health for Production.

## Exact installation packet after lock release

Do not execute until PKG-006R reports Production proof complete, a safe pause with 010 OFF and no active 041/042 observation, or Mike/ChatGPT explicitly releases the lock.

1. Capture screenshots/export of current 041 and 042 scripts, trigger IDs, ON/OFF state, input mappings, output mappings, and recent run history.
2. Turn off only 041 (`wflCRvaopntNPsc64`) and 042 (`wfl3aiiK8vI2tz0HA`). Do not alter 010, 101, XP pipelines, standings inputs, Levels, or Gate Rules.
3. Create `Enrollments.Progression Last Reconciled Signature` as a writable single-line text field. Record its newly assigned field ID. Do not create a formula, lookup, or rollup.
4. Verify the field name/type and wait for Airtable formula/lookup settlement.
5. Paste committed Automation 041 v5.0 into `wflCRvaopntNPsc64`; preserve the 15-minute cron and leave optional `recordId` blank.
6. Paste committed Automation 042 v4.0 into `wfl3aiiK8vI2tz0HA`; preserve the dynamic trigger `recordId` mapping, view `viwm9OgwkPKI2bii3`, and filters `Level Recalc Needed? = checked` plus `Active? = checked`.
7. Confirm 043 remains absent/OFF.
8. Save both automations while OFF. Run the read-only audit and stop if the new field is not writable or any required field is missing.
9. Enable 042 first, then 041. Preserve run IDs and outputs.

## Controlled test packet

Use the approved Schmidt Enrollment `recwuMDL6dqIVfvqH` or another explicitly approved test Enrollment. Capture before/after values and automation run IDs for every step:

1. Baseline audit and standings readback.
2. 0-XP initial assignment and replay.
3. XP increase within level; upward threshold crossing; multiple upward crossings.
4. XP decrease within level; downward threshold crossing; return to 0; restoration upward.
5. Gate pass/block behavior and maximum-level behavior.
6. Formula lag and bounded timeout behavior.
7. Controlled retryable 042 failure; verify queue remains checked; rerun and verify repair.
8. 041 natural trigger for upward and downward changes.
9. Reversible Level or Gate Rule test only if isolated to test data: capture exact before state, change one relevant value, verify affected queueing and unrelated Enrollment stability, restore, and rerun.
10. Read Current Level, Next Level, Level Status, Level Gate Rule, queued signature, reconciled signature, and standings after each settled change.
11. Final read-only audit JSON and rollback decision.

## Audit classifications

The merged audit is read-only and reports missing fields, invalid/duplicate active Levels, invalid/duplicate Gate Rules, missing or XP-inconsistent Current Level, missing Level Status, pending queue, missing reconciled signature, and unsettled XP. It does not write repairs. The connector can inspect schema and records but cannot execute the Airtable Scripting Extension audit itself; therefore this report records the baseline inspection, not a completed Production audit JSON.

## Rollback and stop conditions

If any controlled step fails: turn 041 and 042 OFF, preserve logs, restore the captured scripts/triggers, restore only isolated test data/configuration to exact before-state, leave XP Events untouched, rerun the read-only audit, and do not manually guess progression outputs.

Stop for: active PKG-006R use of 041/042; missing or ambiguous Levels/Gate Rules; missing target field; missing/ambiguous Enrollment Program Instance; same-year multi-program ambiguity; unsafe rollback; or any overlap with Automation 010 or 101.

**Coordination state at report creation:** Production write lock active. Exact resume condition: an explicit PKG-006R completion/safe-pause report or explicit Mike/ChatGPT lock release.
