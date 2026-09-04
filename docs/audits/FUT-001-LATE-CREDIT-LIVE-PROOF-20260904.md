# FUT-001 Late-Credit Live Proof — 2026-09-04

**Agent:** A4 (FUT-001 Late-Credit Proof)  
**Branch:** `final/a4-fut001-late-credit-20260904`  
**Start SHA:** `2c113c10` (`origin/master`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Evidence:** [`../testing/evidence/fut-001-late-credit/closeout-20260904.json`](../testing/evidence/fut-001-late-credit/closeout-20260904.json)

## Verdict

**COMPLETE.** Disposable late homework received full XP on the official PHA week, did not create duplicate XP Events, and did **not** count toward Perfect Week satisfactory homework. No automation script re-paste was required.

## Live versions (MCP)

| Automation | Live Code | Status |
|---|---|---|
| **020** | v3.9 | Live / paste-aligned |
| **065** | v10.6 | Live / paste-aligned; `recordId` dynamic `{ $ref: trigger.id }` |
| **057** | **2.4** | Live (docs previously said 2.3; live Code is 2.4 with late-credit filter + recalc clear) |

## Acceptance map

| Criterion | Result |
|---|---|
| Late submission → correct official week (PHA/Early Bird) | **PASS** |
| Late note: full XP credit + Perfect Week exclusion | **PASS** |
| Late + satisfactory → full HOMEWORK_XP | **PASS** (35 XP, Awarded) |
| Exactly one XP Event / no duplicate on re-grade | **PASS** |
| Late HC excluded from Perfect Week homework satisfactory count | **PASS** (assigned 2 / satisfactory **0**) |
| Stranded / failures detectable | **PASS** (Reconcile stayed 1 while duplicate WAS blocked 065) |
| Disposable cleanup | **PASS** (MCP deleted proof rows; Weeks untouched) |

## Scenario (redacted)

- Disposable Schmidt Athlete1 enrollment (Testing3 fixture no longer present).
- Early Bird PHA HW1 due date **2027-06-29**.
- Late activity / Submission Date **2027-07-01** (after due date) while Week link remained Early Bird.
- Graded satisfactory with coach feedback → 064 prepared 35 XP → 065 awarded `HOMEWORK_XP|{hcId}`.
- 057 recalc: Perfect Week Homework Satisfactory Count remained **0**.

## Blockers (not late-credit policy defects)

1. **Duplicate WAS** for the same Enrollment+Week caused 065 `requireCanonicalWas` to fail closed. Cleared by deleting the disposable duplicate, then forcing Reconcile `1→0→1` re-entry.
2. **Dual-enrollment HC fixture** caused 020 to link an older on-time HC on the first attempt. Athlete1 was unlinked from that polluted HC so a fresh late HC could be created.

No script paste. Season Simulation was not used.

## Offline contracts

- `tests/automation-contracts/065-homework-late-credit-policy.test.js` — PASS  
- `tests/homework-contracts/assignment-identity.test.js` — PASS  

## Harness

`tools/testing/sc-fut001-late-credit-proof.mjs` — disposable late-credit apply/cleanup (prefix `FUT001|LATE|`).

## Close FUT-001 late-credit proof row

Assignment-identity work was already Complete. This closes the remaining **disposable late-HW / Perfect Week exclusion live confirmation** gap for FUT-001 / PR #372.
