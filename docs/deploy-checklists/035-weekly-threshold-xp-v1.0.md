# Deploy Checklist — 035 Weekly Threshold XP v1.0

> **Superseded by v1.1:** use [`035-weekly-threshold-xp-v1.1.md`](./035-weekly-threshold-xp-v1.1.md) for paste.  
> v1.1 adds semantic legacy-key dedupe, inactive-enrollment skip, Grade Band link-ID preference, and targeted Source Key recheck.

**SC items:** SC-049 (XP-D1), SC-022  
**Script:** `airtable/automations/shooting-challenge/035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js`  
**Date:** 2026-07-25  
**Status:** Superseded — see v1.1 (Ready for PROD Paste)

## Dependencies reviewed

| Dependency | Detail |
|------------|--------|
| Callers | Airtable automation trigger on Weekly Athlete Summary |
| Data contract | Source Key `WEEKLY_THRESHOLD\|{enrollmentId}\|{weekId}\|{percent}` |
| Airtable fields | WAS: Goal Completion %, Threshold XP Ready?, Threshold XP Status, Requeue Threshold XP, Threshold XP Processed At, Threshold XP Error Message; XP Events: Source Key, XP Points, XP Bucket, XP Source, XP Activity Date |
| XP Reward Rules | `WEEKLY_THRESHOLD_{100\|125\|150}_{K2\|34\|56\|78\|912}` amounts 10/20/30 |
| Date | Week End Date / Week End Key → America/Denver → XP Activity Date |
| Dedupe | Recheck-before-create on Source Key; one event per met tier |
| Side effects | Creates XP Events; writes WAS Threshold XP Status=Processed; clears Requeue |
| External | None (no Make/email) |

## Pre-paste Mike actions

1. **UI-attest** Automations list: confirm no existing Threshold XP automation is still ON (avoid dual writers).
2. Confirm active XP Reward Rules for Schmidt grade band (100/125/150).
3. Confirm WAS formula `Threshold XP Ready?` still matches schema snapshot (Goal Completion % >= 1 and Requeue or Status != Processed).

## Install steps

1. Create automation **035 - Weekly Summary and Goal Logic - Create Weekly Threshold XP Events** (or paste into empty slot).
2. Trigger: Weekly Athlete Summary · when `Threshold XP Ready?` = 1.
3. Input: `recordId` = triggering WAS record id.
4. Paste script **from production docblock through end** (skip GitHub header).
5. Map required outputs: `statusOut`, `actionOut`, `errorOut`, `debugStep`.
6. Leave OFF until Schmidt dry check, then ON.

## Schmidt live test

1. Ensure Schmidt WAS has Goal Completion % ≥ 100% (seed counted shots).
2. If Status already Processed, check **Requeue Threshold XP**.
3. Run 035; expect:
   - XP Events with Source Keys `WEEKLY_THRESHOLD|recgP9qZYjAhE7NXm|{weekId}|100` (+125/150 if met)
   - Amounts 10 / 20 / 30 from rules
   - XP Bucket = Weekly Threshold
   - Threshold XP Status = Processed
4. Re-run / requeue → no duplicate Source Keys.

## Rollback

Turn automation OFF. Do not delete XP Events without Mike approval.
