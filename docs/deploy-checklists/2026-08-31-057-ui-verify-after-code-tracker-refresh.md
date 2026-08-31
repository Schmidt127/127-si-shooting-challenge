# Automation 057 — verify UI after Code tracker refresh

**Date:** 2026-08-31  
**Automation:** 057 — Calculate Perfect Week Eligibility (**2.2**)  
**Base:** `appn84sqPw03zEbTT`

## What changed

- Production **Automations table** `Automation Code` for 057 was refreshed from GitHub (CONFIG field `Perfect Week Video Minimum`).
- GitHub source: `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`
- Evidence: `docs/audits/live-reconcile-2026-08-31/automations-code-patch-results.json`

## Mike action (required if UI diverges)

1. Open Automation **057** in the Airtable Automations UI.
2. Confirm CONFIG uses **`Perfect Week Video Minimum`** (not `MInimum`).
3. If UI still shows the typo, paste from GitHub (docblock through end; skip GitHub-only header block).
4. Do **not** change trigger conditions or input variables.

## Stop if

- Paste would change `recordId` input wiring
- CONFIG still references `Perfect Week Video MInimum` after paste
