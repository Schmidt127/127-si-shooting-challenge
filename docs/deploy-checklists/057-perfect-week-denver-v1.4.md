# Deploy Checklist — 057 Perfect Week Eligibility v1.4

**SC items:** SC-021, SC-028, SC-077  
**Script:** `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`  
**Version before (typical PROD):** v1.3 (C-025 Stage 17 Zoom credit)  
**Version after:** **v1.4**  
**Date:** 2026-07-25  
**Status:** **Live Tested in PROD — Denver boundary PASS 2026-08-04**

## PROD closeout

- Actual deployed script header confirmed Version `1.4`, Last updated `2026-07-25`.
- `CONFIG.timezone` confirmed `America/Denver`.
- Submission Activity Date normalization confirmed through `Intl.DateTimeFormat`.
- Controlled Schmidt boundary test used a timestamp where UTC and Denver calendar dates differed.
- Automation 057 counted the Submission on the correct Denver calendar date.
- No Perfect Week unlock or XP was created by the helper test.
- Evidence: `docs/testing/evidence/2026-08-04-package-02-critical-pastes/PACKAGE-02-PROD-CLOSEOUT.md`.

## What changes

| Item | Change? |
|------|---------|
| Automation name | No — replace script body only |
| Trigger | No change expected |
| Input `recordId` | No change |
| Perfect Week rules | No product-rule change |
| Date helper only | `getDateKeyFromDateOnly` uses `Intl` + `America/Denver` (no UTC ISO slice for activity dates) |

## Trigger

| Item | Value |
|------|-------|
| Automation name | `057 - Achievements and Milestones - Calculate Perfect Week Eligibility` |
| Trigger table | `Weekly Athlete Summary` |
| Input | `recordId` = triggering WAS |

## Controlled Denver boundary test — completed

1. Confirmed the correct WAS and linked Submission.
2. Corrected a misleading WAS `Activity Dates` lookup display from UTC formatting to America/Denver.
3. Ensured the controlled Submission was same-day and Perfect Week countable.
4. Used a timestamp where UTC calendar day differed from Denver calendar day.
5. Ran 057 on the linked WAS.
6. Confirmed `Perfect Week Daily Check Detail` used the Denver date.

## Important diagnosis

An earlier `0/7` result was not a date-normalization defect. The tested WAS had no linked Submissions, while the available historical test rows were backdated and therefore failed `Submitted Same Day?`. The final proof used the correctly linked, same-day countable Submission/WAS pair.

## Rollback

1. Re-paste prior v1.3 body from git history or prior Airtable revision if required.
2. Re-run 057 on the same WAS and compare counted day keys.

## Related

- Package closeout: `docs/testing/evidence/2026-08-04-package-02-critical-pastes/PACKAGE-02-PROD-CLOSEOUT.md`
- Schmidt pack: `docs/testing/SCHMIDT-LIVE-PROOF-PR43-THRESHOLD-057.md`
- Offline: `xp-date-normalization.test.js`, `agent4-perfect-week-edges.test.js`
