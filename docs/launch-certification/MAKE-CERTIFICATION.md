# Launch Certification — Make.com

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Rule:** No webhook URLs, tokens, or secrets in this document.

## Weekly Athlete Summary (season path)

| Item | Expected | Evidence | This session |
|------|----------|----------|--------------|
| Scenario name | `Weekly Athlete Summary - Bulk Email - May 18` | verified_prod / automation-index | **BLOCKED** — Mike UI reconfirm ON |
| Scenario state | **ON** | verified_prod 2026-07-24 | Mike: Make dashboard → scenario → ON (not stuck Updated) |
| Role | Live parent email sender for WAS packages from **074** | architecture | Keep |
| Live path | Live → Gmail + writeback (`Sent?` / status / timestamp) | verified_prod PASS | Prior; not re-run |
| Test path | Test → Mike only; **no** Sent? writeback (by design) | architecture | Do not force permanent Test |

**Not the email sender:** Make scenario `Weekly Athlete Summary Updated` (WAS calculation create/update) — do not confuse with Bulk Email May 18.

## Other Make scenarios (summary)

| Scenario / path | Status | Notes |
|-----------------|--------|-------|
| **PROD Upload Engine — Lambda v1** (video) | Live (historical C-013) | Pairs with 070b/070c; not re-proven this session |
| Homework upload (070a) | PROD **OFF** | Matches Airtable 070a intentionally OFF |
| Daily / homework / video parent emails | Live/historical as configured | Individual template re-proof open |
| Zoom recording approval email (117f) | Tested; not fully live-documented | Email deferred / webhook blank on Stage 17 path |

Sources: [`docs/PROJECT_STATE.md`](../PROJECT_STATE.md) Make summary · [`docs/automation-index.md`](../automation-index.md) · WAS architecture.

## Mike UI checklist (exact)

1. Open Make.com → organization scenarios.  
2. Find **`Weekly Athlete Summary - Bulk Email - May 18`**.  
3. Confirm toggle **ON**.  
4. Confirm it is the scenario wired to the **074** weekly WAS webhook (do not create a second weekly-email scenario).  
5. Do **not** paste webhook secret values into chat or git.  
6. Optional: confirm video Upload Engine scenario still ON if video path is in season scope.

## Explicit non-actions

1. Do not create a new Make weekly-email scenario.  
2. Do not commit webhook URLs or API keys.  
3. Do not pause Bulk Email May 18 unless rolling back a live incident.  
4. Do not enable homework upload Make path while 070a is intentionally OFF.