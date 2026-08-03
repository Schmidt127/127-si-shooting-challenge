# Deploy Checklist — 035 Weekly Threshold XP v1.2

**SC items:** SC-049 (XP-D1), SC-022  
**Script:** `airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js`  
**Version:** **v1.2** (supersedes v1.1 checklist for paste/status)  
**Date:** 2026-08-03  
**Status:** Installed in PROD + Schmidt live-tested — automation remains **OFF** pending merged-source reconciliation

## What changed in v1.2

Airtable percent fields return ratios (`1` = 100%, `1.25` = 125%, `83.7` = 8,370%).  
v1.1 incorrectly used `raw > 3 ? raw / 100 : raw`, which converted Schmidt `83.7` → `0.837` and skipped as below 100%.

v1.2 compares the raw numeric ratio directly. All other v1.1 behavior is preserved (reward-rule lookup, inactive-enrollment skip, legacy duplicate compatibility, exact Source Key dedupe, Week End Date handling, outputs, error handling).

## PROD paste / live evidence (2026-08-03)

| Item | Value |
|------|-------|
| Base | PROD `appn84sqPw03zEbTT` |
| WAS | `rechWp330MqSgRWzN` |
| Enrollment | `recgP9qZYjAhE7NXm` (Schmidt) |
| Week | `recVDKiYATgzsfpmE` |
| Goal Completion raw | `83.7` |
| First run | `success` / `created` / **3 created** |
| Duplicate rerun | `success` / `skipped_existing` / **0 created** / **3 skipped** |
| Automation state | **OFF** (do not enable until PR #50 merged source is reconciled in Airtable) |

Evidence: `docs/testing/evidence/2026-08-03-035-v1.2-schmidt-live-proof.md`  
Completion update: `docs/completion-updates/2026-08-03-automation-035-v1.2.md`

## Post-merge reconciliation (required before ON)

1. After PR #50 merges, paste the **exact merged v1.2** production docblock through end into Airtable (skip GitHub header).
2. Confirm SCRIPT metadata shows `version: "v1.2"` / `versionDate: "2026-08-03"`.
3. Rerun Schmidt idempotency (expect 0 created / 3 skipped).
4. Review trigger conditions; enable only with Mike approval.

## Contract summary (unchanged from v1.1 except percent compare)

| Topic | Contract |
|-------|----------|
| Eligibility | Goal Completion % raw ratio ≥ tier/100 (no divide-by-100 heuristic) |
| Enrollment | `Active?` = false → `skipped_inactive_enrollment` |
| XP amount | Active XP Reward Rules `WEEKLY_THRESHOLD_{100\|125\|150}_{band}` |
| Source Key | `WEEKLY_THRESHOLD\|{enrollmentId}\|{weekId}\|{percent}` |
| Dedupe | Exact Source Key **or** Enrollment+Week+XP Source label |
| Activity date | Week End Date / Week End Key → America/Denver |

## Related

- Prior checklist: `docs/deploy-checklists/035-weekly-threshold-xp-v1.1.md` (historical; superseded for status)
- Contracts: `airtable/automations/shooting-challenge/lib/v2-engine-contracts.js`
- Offline tests: `airtable/automations/shooting-challenge/lib/weekly-threshold-xp.test.js`
