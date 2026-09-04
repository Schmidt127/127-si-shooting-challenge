# Deploy — SC-152 / SC-153 Perfect Week lifecycle (057 v2.4 + 058 v1.6)

**Date:** 2026-09-04  
**Base:** Production `appn84sqPw03zEbTT`  
**Why UI paste:** Airtable MCP `update_automation` rejects graphs that contain `customScript` (`readOnlyNodeType`). Scripts and trigger edits for 057/058 must be applied in the Airtable UI.

## Already live (no paste)

| Item | Status |
|------|--------|
| Checkbox `Perfect Week Recalc Needed?` (`fldH46SynZ19EosiG`) | Present |
| Queue formula `Perfect Week Calculation Queue?` | Uses `Pending` **OR** Recalc Needed (Ready no longer sticky) |
| Pre-change rollbacks | `airtable/rollbacks/20260904-pre-sc152-153/` |

## Mike paste order (≈15 minutes)

### 1) Automation 057 — script only

1. Open automation `wflVRPhgunsosFjWS` (057 Calculate Perfect Week Eligibility).
2. Keep trigger: `recordMatchesConditions` · Queue? = 1.
3. Replace script with GitHub paste body from `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` (**skip GitHub header**; paste from production docblock / `Version: 2.4`).
4. Confirm dynamic input `recordId` = triggering record.
5. Click **Update** / publish draft.

### 2) Automation 058 — trigger + script

1. Open `wflDinFz6FBIGEOMg` (058 Create Perfect Week Unlock).
2. **Change trigger** from positive-only conditions to **When record updated** on Weekly Athlete Summary.
3. Watch fields (writable lifecycle — do **not** watch Perfect Week Unlock):
   - Perfect Week Automation Status
   - Enrollment, Week, Goal Record
   - Perfect Week Daily Requirement Met?
   - Perfect Week Homework Requirement Met? / assigned & satisfactory counts as present
   - Perfect Week Video Count
   - Zoom meeting / attendance helper counts
4. Replace script with GitHub **v1.6** (same skip-header rule).
5. Confirm `recordId` input.
6. **Update** / publish.

### 3) Disposable proof (Schmidt / Enrollment-Test only)

| Case | Steps | Expect |
|------|-------|--------|
| SF-01 re-entry | WAS Ready; check Recalc Needed? | Queue 0→1; 057 runs; Recalc clears; helpers refresh |
| SF-02 withdraw | Unlock Active + Eligible forced false via helpers | 058 deactivates unlock; Automation Error `058 skipped:…` |
| SF-02 restore | Eligibility returns | Same Milestone Source Key restored; no second unlock |
| Pass award | Eligible Ready Unlock empty | Unlock created once; 059 awards 100 XP once |

### 4) Operator reconciliation

WAS filter: `Perfect Week Recalc Needed?` checked **OR** (`Queue? = 1` AND Status not progressing) **OR** Automation Error not empty.

## Rollback

Restore trigger JSON + script bodies from `airtable/rollbacks/20260904-pre-sc152-153/`. Restore Queue formula from `was-formula-snapshot.json` only if needed (current live formula is the SC-152 target).
