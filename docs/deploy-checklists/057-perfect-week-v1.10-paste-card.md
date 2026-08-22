# Paste card — Automation 057 v1.10 (Counted Activity Date Key)

**Date:** 2026-08-22  
**Base:** Production `appn84sqPw03zEbTT`  
**Agents:** Do not change Airtable records, 058, 059, dates, or eligibility fields

## Exact Production automation name

`057 - Achievements and Milestones - Calculate Perfect Week Eligibility`

## Trigger and conditions

| Setting | Value |
|---------|--------|
| Trigger | When record matches conditions (unchanged) |
| Table | `Weekly Athlete Summary` |
| Input | `recordId` = triggering WAS record ID |

## What changes in v1.10

| Item | Change? |
|------|---------|
| Automation name | No — replace script body only |
| Trigger / input | No change |
| Perfect Week rules | No product-rule change |
| Goal settlement (v1.7+) | Preserved |
| Daily shooting day source | **Yes** — uses `Submissions.Counted Activity Date Key` instead of deriving from raw `Activity Date` |
| Fail closed | **Yes** — countable submission with blank/malformed `Counted Activity Date Key` writes Error |

## Paste artifact

[`057-perfect-week-v1.10-prod-paste.txt`](./057-perfect-week-v1.10-prod-paste.txt) — skip GitHub header; paste from production docblock through end.

Confirm header shows `Version: 1.10` and `Last updated: 2026-08-22`.

## ON / OFF

Paste while **OFF** if you need a controlled window; otherwise replace script body on the live automation and save. No trigger or input remapping required.

## Controlled recovery for live proof (Mike)

1. Paste **057 v1.10** and save.
2. Open Weekly Athlete Summary `reczxTIpVI8ZJLex0`.
3. Rerun **057** (or let the existing trigger fire).
4. Expect:
   - Submission `recvtQh5Rq6yTFotc` (`Counted Activity Date Key` = `2026-08-22`) counts on **2026-08-22**, not 2026-08-21.
   - Seven official Sunday–Saturday dates recognized when same-day + daily minimum requirements are met.
   - Eligibility still decided by formulas on 058/059 — this script only writes helper fields.

## Regression proof (offline)

```bash
node --test tools/testing/tests/test_057_runtime.mjs
```

Covers midnight-UTC Fillout date, evening Denver canonical key, duplicate same-day aggregation, goal-settlement fail-closed, and existing v1.7 gates.

## Rollback

Turn 057 OFF. Re-paste prior v1.9 (or v1.7) script body from Airtable revision history. Do not modify XP Events or eligibility fields as rollback.

## Do not change

- Automation **058** or **059**
- Submission date fields or formulas
- WAS eligibility formulas
- Any Production records as part of this paste
