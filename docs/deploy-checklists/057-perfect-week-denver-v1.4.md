# Deploy Checklist — 057 Perfect Week Eligibility v1.4

**SC items:** SC-021, SC-028, SC-077  
**Script:** `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`  
**Version before (typical PROD):** v1.3 (C-025 Stage 17 Zoom credit)  
**Version after:** **v1.4**  
**Date:** 2026-07-25  
**Status:** Ready for PROD Paste — not live-tested for Denver boundary

## What changes

| Item | Change? |
|------|---------|
| Automation name | No — replace script body only |
| Trigger | No change expected |
| Input `recordId` | No change |
| Perfect Week rules | No product-rule change |
| Date helper only | `getDateKeyFromDateOnly` uses `Intl` + `America/Denver` (no UTC ISO slice for activity dates) |

## Trigger (confirm, do not redesign)

| Item | Value |
|------|-------|
| Automation name | `057 - Achievements and Milestones - Calculate Perfect Week Eligibility` (exact UI name may vary — match existing PROD 057) |
| Trigger table | `Weekly Athlete Summary` |
| Input | `recordId` = triggering WAS |

## Paste steps (literal)

1. Open PROD Automations → existing **057**.
2. Open the Run script action.
3. Copy GitHub script from production docblock (`/***************************************************************************************************`) through end (skip top GitHub header).
4. Confirm header shows **Version: 1.4** and Last updated **2026-07-25**.
5. Save. Leave trigger as-is.
6. Do not change Zoom / homework / video field mappings.

## Controlled Denver boundary test

1. Pick Schmidt WAS for a known week (Sunday–Saturday).
2. Ensure a counted Submission has Activity Date / timestamp where **UTC calendar day ≠ Denver calendar day** (example: `2026-07-24T03:00:00.000Z` → Denver `2026-07-23`).
3. Run 057 on that WAS `recordId`.
4. Expect Perfect Week Daily Check Detail / counted days to use **Denver** date, not UTC slice.
5. Regression: seven distinct Denver days + 3 videos + homework + conditional Zoom still required (rules unchanged).

## Rollback

1. Re-paste prior **v1.3** body from git history / prior Airtable revision if available.
2. Re-run 057 on the same WAS; confirm daily keys match pre-paste expectation for date-only fields (date-only text path was already safe).

## Related

- Schmidt pack: `docs/testing/SCHMIDT-LIVE-PROOF-PR43-THRESHOLD-057.md`
- Offline: `xp-date-normalization.test.js`, `agent4-perfect-week-edges.test.js`
- MIKE-ACTIONS: `docs/overnight/config-xp/MIKE-ACTIONS.md` item #2
