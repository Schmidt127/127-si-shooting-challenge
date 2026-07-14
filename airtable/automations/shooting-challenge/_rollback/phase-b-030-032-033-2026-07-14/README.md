# Phase B rollback — 030 + 032 + 033

**Date:** 2026-07-14  
**Purpose:** Pre-consolidation GitHub copies for safe restore of separate WAS bootstrap autos.

## Files

| File | Restores |
|------|----------|
| `030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js` | Separate automation 030 |
| `032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js` | Separate automation 032 |
| `033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js` | Separate automation 033 |

## Restore procedure (critical test failure)

1. Turn **OFF** combined 030 (bootstrap) automation.
2. Re-paste each file above into restored **030**, **032**, and **033** automations.
3. Restore each trigger / view condition set from the separate script docblocks.
4. Turn all three **ON**.
5. Do **not** delete 117 or touch Folder 07 OFF autos.

## After Phase B PASS

Retire UI slots **032** and **033** only (not because OFF — because replaced by combined 030). Expected: **48/50** occupied, **2 free**.
