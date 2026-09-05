# 010 Dual-Enrollment Disposable Fixture Cleanup — 2026-09-05

**Status:** COMPLETE  
**Priority:** P1  
**Base:** Production `appn84sqPw03zEbTT`  
**Starting master SHA (cleanup session first fetch):** `a40a04e8fc3a0edae3b848fe37b9cea67339b1ad`  
**Docs branch base (`origin/master` at PR open):** `198ed71836426acf92f20c0c81ee16bac38f9cf7`  
**Automation 010:** Live **v10.13** — **unchanged** (correct fail-closed behavior)

## Root cause

Repeated Automation 010 failures for Submission `reczBZnA4DEiaP3P0` were caused by **contaminated disposable Athlete1 / Athlete 2 test data**, not by Automation 010.

The Submission linked **both** Athlete1 (`recZEwkkXTJanDlG6`) and Athlete 2 (`rec2UamYHzyc9ELd9`) Enrollments, while its Weekly Athlete Summary belonged to Athlete 2. Prior reconciliation signature evidence showed original Athlete1-only ownership. `Reconciliation Needed? = 1` repeatedly rearmed 010; 010 correctly failed closed on ambiguous Enrollment/Week/WAS identity.

Athlete 2 Enrollment shares the same Athlete record as Athlete1 (documented in SC-112). Dual-link contamination had spread across the entire Athlete1/Athlete 2 Submission cluster.

## Evidence

| Artifact | Path |
|----------|------|
| Pre-delete snapshot | [`docs/testing/evidence/010-dual-enrollment-cleanup/pre-delete-snapshot-20260905.json`](../testing/evidence/010-dual-enrollment-cleanup/pre-delete-snapshot-20260905.json) |
| Post-cleanup verification | [`docs/testing/evidence/010-dual-enrollment-cleanup/post-cleanup-verification-20260905.json`](../testing/evidence/010-dual-enrollment-cleanup/post-cleanup-verification-20260905.json) |

## Records deleted (purpose only; IDs in evidence JSON)

| Table | Count | Purpose |
|-------|------:|---------|
| XP Events | 26 | Dual-enrollment Submission/Video/Homework XP exclusive to contaminated Submissions, plus dual-enrollment milestone/threshold/streak XP owned only by Athlete1+Athlete2 |
| Athlete Achievement Unlocks | 8 | Dual-enrollment Early Bird shot-milestone unlocks |
| Streak Occurrences | 1 | Dual-enrollment 3-day streak |
| Homework Completions | 2 | Test completions linked only to contaminated Submissions |
| Video Feedback | 3 | Test VF exclusive to contaminated Submissions |
| Submission Assets | 6 | Test assets exclusive to contaminated Submissions |
| Submissions | 11 | Entire dual-enrollment Athlete1/Athlete 2 cluster including `reczBZnA4DEiaP3P0` |

## Records preserved

- Athlete1 and Athlete 2 Enrollments (and shared Athlete identity)
- Weeks (Early Bird, Week 1)
- Weekly Athlete Summaries (Athlete 2 Early Bird; Athlete1 Week 1)
- Single-enrollment Athlete1 Zoom XP Events (2)
- Rene Schmidt Enrollment + Submission evidence (untouched)
- Configuration, Weeks calendar, library, XP Reward Rules, Levels, Achievement/Milestone definitions
- Automation 010 script body (v10.13)

## Post-cleanup checks

| Check | Result |
|-------|--------|
| `reczBZnA4DEiaP3P0` absent | Pass |
| Surviving dual-enrollment Submissions for Athlete1/2 | **0** |
| Surviving XP linking both Athlete1+Athlete2 Enrollments | **0** |
| XP Source Keys still referencing deleted Submission | **0** |
| Orphaned Athlete1/2 Assets / HC / Video Feedback | **0** |
| Rene evidence intact | Pass (1 Submission retained) |
| Automation 010 version | **v10.13** unchanged |
| Settlement wait | ~90s; no Athlete1/2 dual-ownership reappearance |
| Duplicate active XP created by cleanup | None observed |
| Email / Ready handoffs created by cleanup | None observed |

## Out of scope (left untouched)

- Rene Schmidt “No Week” Submission still has `Reconciliation Needed? = 1` (protected)
- Unrelated “Unknown Athlete” Season Sim style fixtures still reconciling
- Empty Athlete 2 Early Bird WAS retained as Enrollment+Week parent (not deleted)

## Prohibited actions not taken

No Automation 010 change; no Weeks/Enrollments/Rene deletes; no Season Sim / FUT-029; no schema/config/library deletes; no S3 deletes; no intentional email send.

## Mike’s next action

**None** for this incident. Optional later: decide whether to deactivate Athlete 2 Enrollment or clear empty Athlete 2 Early Bird WAS under a separate authorization.
