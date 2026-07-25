# Launch Certification — Live Smoke Evidence

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Master tip:** `267d473`  
**Rule:** Status reflects **prior verified evidence vs not re-run this session**. Do **not** invent “Live Tested” for this session.

## Status key

| Status | Meaning |
|--------|---------|
| **PASS** | Prior verified_prod / documented live proof exists; not claiming fresh re-run today |
| **FAIL** | Known failure with evidence |
| **BLOCKED** | Not re-run this session and/or requires Mike UI / public smoke / merge gate |
| **NOT APPLICABLE** | Intentionally OFF, obsolete, or out of launch scope |

## Matrix (25 workflows)

| ID | Workflow | Automations / surface | Status | Evidence basis | Notes |
|----|----------|----------------------|--------|----------------|-------|
| W01 | Weekly email E2E chain | 118→072→119→074→Make→Gmail→writeback | **PASS** | verified_prod 2026-07-24 | Keep ON; season path |
| W02 | Empty-week short package | 072 `emptyWeekPolicy=send_short` | **PASS** | verified_prod | Locked policy |
| W03 | 074 Live sendMode + writeback | 074 + Make Live | **PASS** | verified_prod | Never fixed Test |
| W04 | 118/119 schedules armed | 118 Sun 5AM / 119 Sun 10AM Denver | **PASS** | verified_prod (schedules ON) | **BLOCKED** Mike UI reconfirm this session |
| W05 | 118 v1.5 Live season inputs | 118 dryRun/sendMode/includeSchmidt | **PASS** | repo_evidence on master + prior Live proof | Reconfirm inputs in UI |
| W06 | Make Bulk Email May 18 ON | Make scenario | **PASS** | verified_prod | Mike reconfirm ON |
| W07 | ETF / 115 Fillout-shaped submission | 115→005→010→031 | **PASS** | live PROD after reset 2026-07-23/24 | Schmidt path |
| W08 | Daily submission XP idempotency | 010 Source Key | **PASS** | live PROD / inventory | UI re-trigger still manual |
| W09 | WAS uniqueness (Enrollment+Week) | 031 (+118/101 hybrid) | **PASS** | live 115 + WAS uniqueness | Race residual monitored |
| W10 | Level progression baseline | 041/042 | **PASS** | Schmidt baseline documented | Further level-ups open |
| W11 | Zoom Stage 17 conflict / credit | 117 / 057 / 042 | **PASS** | Stage 17 COMPLETE 2026-07-20 | Approval email deferred |
| W12 | Video async upload Lambda | 070b / 070c | **PASS** | C-013 PROD E2E 2026-07-11 | Not re-run this session |
| W13 | Homework completion create | 020 | **BLOCKED** | Installed; needs Schmidt re-proof | Post empty-base |
| W14 | Homework XP award | 064/065 | **BLOCKED** | Installed; not re-proven | — |
| W15 | Video Feedback create/XP | 013 / 114 | **BLOCKED** | Installed; not re-proven | 112 must stay OFF |
| W16 | Streak XP 054 v5.6 | 053/054 | **BLOCKED** | Installed; not Live Tested for v5.6 | Supervised 3-day |
| W17 | Shot milestone 066 v3.3 | 066/059 | **BLOCKED** | Installed; OMNI/natural proof open | — |
| W18 | Perfect Week eligibility | 057 | **BLOCKED** | Used in Stage 17 path; full athlete matrix open | — |
| W19 | Welcome / other parent templates | 071–077 subset | **BLOCKED** | Individual template proof open | — |
| W20 | Homework upload to storage | 070a + Make | **NOT APPLICABLE** | PROD intentionally OFF | Keep OFF |
| W21 | Legacy Video Feedback 112 | 112 | **NOT APPLICABLE** | OFF expected | Do not enable |
| W22 | Softr public site | Softr.io | **NOT APPLICABLE** | Obsolete / Not Used | Not a launch gate |
| W23 | Public web `/shoot` | Vercel Next.js | **BLOCKED** | Deploy READY at 267d473; HTML smoke after PR33 port merge | Public URL |
| W24 | Health `GET /shoot/api/airtable` | Vercel API | **BLOCKED** | Not fetched this session | Expect tokenValid |
| W25 | RCC SC-147 live Interface | RCC views / PROD export | **NOT APPLICABLE** | Built in Repository; views not installed | Non-blocking Built |

### Session-specific notes on W04

Schedules were **verified_prod ON** on 2026-07-24. This certification session did **not** re-open Airtable UI — treat operational reconfirm as Mike action while retaining prior PASS evidence for the chain.

## Counts

| Status | Count |
|--------|-------|
| PASS | 12 (W01–W12; W04 prior PASS + UI reconfirm still listed in Mike actions) |
| FAIL | 0 |
| BLOCKED | 9 (W13–W19, W23–W24) |
| NOT APPLICABLE | 4 (W20–W22, W25) |
| **Total** | **25** |

## How to promote a BLOCKED row

1. Mike runs controlled Schmidt test or public smoke.  
2. Record enrollment/submission IDs + date in handoff.  
3. Update this matrix + PROJECT_STATE — do not silently flip completion-master Live Tested without evidence.