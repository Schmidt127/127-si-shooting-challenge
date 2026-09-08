# Testing Views Operator Package — Wave B10

**SC:** SC-003  
**Date:** 2026-09-08  
**Spec:** `docs/testing/views/TESTING-VIEWS-SPEC.json`  
**Live installed?:** **READY_FOR_OPERATOR** — Meta API verifier with PAT; views not auto-installed by Wave B

## Rule

Do not hide Schmidt from public standings. Filter on **live** controlled Enrollment RID `recn54wbxTjygydqa`.

## Required views (10 + 2 optional)

| # | Table | View name | Filter | Sort | Purpose |
|---|-------|-----------|--------|------|---------|
| 1 | Testing Scenarios | Testing — Schmidt Scenarios | Related Enrollment = controlled Enrollment RID | Last Run At desc | Drive 115 runs |
| 2 | Submissions | Testing — Schmidt Submissions | Enrollment = controlled RID | Activity Date desc | Confirm intake + links |
| 3 | XP Events | Testing — Schmidt XP Events | Enrollment = controlled RID | Created desc | Idempotency / Source Keys |
| 4 | Weekly Athlete Summary | Testing — Schmidt WAS | Enrollment = controlled RID | Week Start desc | Uniqueness Enrollment+Week |
| 5 | Submission Assets | Testing — Schmidt Assets | Enrollment - Linked = controlled RID | Created desc | Upload pipeline |
| 6 | Homework Completions | Testing — Schmidt Homework | Enrollment = controlled RID | Created desc | HC identity |
| 7 | Video Feedback | Testing — Schmidt Video | Enrollment = controlled RID | Created desc | Video path |
| 8 | Athlete Achievement Unlocks | Testing — Schmidt Unlocks | Enrollment = controlled RID | Created desc | Milestone/PW |
| 9 | Enrollments | Testing — Schmidt Enrollment | Record ID or Athlete = test athlete | — | Exactly 1 row |
| 10 | Weeks | Testing — Seeded Weeks | Manual seeded weeks | Week Start desc | Week assignment tests |
| 11 | Zoom Attendance | Testing — Schmidt Zoom (optional) | Enrollment = controlled RID | — | Zoom XP |
| 12 | Program Homework Assignments | Testing — Active PHA (optional) | Active assignments for test week | — | Homework scheduling |

## Additional tables (monitoring)

| Table | View | Filter | Purpose |
|-------|------|--------|---------|
| Streak Occurrences | Testing — Schmidt Streaks | Enrollment = controlled RID | Streak proofs |
| Email Handoff Queue | Testing — Test handoffs | Test Mode? = true OR test enrollment | Email safety |

## Verification

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

## Operator work remaining

1. Restore controlled Enrollment; update filter RID in all views if not `recgP9qZYjAhE7NXm`
2. Run verifier; commit fresh `TESTING-VIEWS-VERIFY.json` under `docs/testing/evidence/2026-09-08/`
