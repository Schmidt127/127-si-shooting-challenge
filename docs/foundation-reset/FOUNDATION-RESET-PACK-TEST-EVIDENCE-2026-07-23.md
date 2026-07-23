# Foundation Reset Pack — Live PROD Test Evidence

**Date:** 2026-07-23  
**Base:** PROD `appn84sqPw03zEbTT`

## Schmidt records (verified)

| Record | ID | Notes |
|--------|----|-------|
| Athlete | `recgqVstObQRzgXJF` | Testing Schmidt; Active?=true |
| Enrollment | `recgP9qZYjAhE7NXm` | `Schmidt, Testing - 2025-2026`; School Year 2025-2026; Grade Pre K; Grade Band K-2 `recK7BDVSpHy2ipCS`; Program Instance `rec9cQQ0VKYGy4jXq` |
| Enrollment Active? | **true** (was unchecked; set in this pack) | Required for core processing |
| Parent/Athlete email | set (controlled Schmidt contacts) | Masked in JSON exports |
| Foundation Week | `recVDKiYATgzsfpmE` | Created covering 2026-07-23 (no prior week covered today) |
| Testing Scenario seed | `recPdyfYRFgDtpzQ8` | Daily Submission, Dry Run?=true, Run Test?=false |

## Standings / public display exclusion

| Question | Finding |
|----------|---------|
| Separate exclusion field? | **No** |
| Existing mechanism? | `Enrollments.Active?` (website fallback) + optional `Web - Leaderboard` view filters |
| Applied now | Active?=true for processing |
| Residual risk | Schmidt may appear on public leaderboard until Mike adds a **view filter** excluding enrollment `recgP9qZYjAhE7NXm` |
| New field created? | **No** (per decision) |

## Testing Scenarios installation

| Item | Status |
|------|--------|
| Table in PROD | **Created** `tblagI7Q5wXQm2XGS` |
| Minimum fields for 115 daily path | Present (see `prod-testing-scenarios-created.json`) |
| Automation 115 installed in PROD | **No** — not in Automations table; UI paste required |
| Repo script | `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js` **v1.8** |
| Duplicate writer risk if 115 pasted once | Low — writes Submissions intake fields + Testing Scenarios result fields only |
| SC-001 Complete? | **No** — awaiting 115 paste + scenario live run |

## Live pipeline test (surrogate for 115)

Because 115 is not installed, Cursor created one Fillout-shaped Submission matching the 115 daily shape.

| Step | Expected | Actual | Pass? |
|------|----------|--------|-------|
| Create Submission for Schmidt | New submission linked to enrollment | `recaCcxDqtzFWjmyi` | PASS |
| Week assignment (005) | Week linked | `recVDKiYATgzsfpmE` | PASS |
| XP award (010 chain) | XP Event linked; status Awarded | XP `recOqzhV4kTdsfzMf`; Awarded | PASS |
| WAS create (031) | Weekly Athlete Summary linked | `rechWp330MqSgRWzN` | PASS |
| Daily email path | May send to Schmidt contacts | Daily Email Status `Sent` | PASS (controlled) |
| Duplicate XP storm | ≤1 XP Event for submission | See verify JSON | PASS (linked single XP on submission) |
| 115 scenario orchestration | Scenario creates submission | **Blocked — 115 not installed** | FAIL (expected blocker) |

### Cleanup

No destructive cleanup performed. Test rows retained for inspection in Testing views:

- Submission `recaCcxDqtzFWjmyi`
- XP Event `recOqzhV4kTdsfzMf`
- WAS `rechWp330MqSgRWzN`
- Week `recVDKiYATgzsfpmE`
- Testing Scenario `recPdyfYRFgDtpzQ8`

## Testing views

API cannot create view filters. Current PROD `Testing` views:

| Table | Testing view present? |
|-------|-----------------------|
| Athlete Achievement Unlocks | Yes |
| Athletes, Enrollments, Weeks, Submissions, Submission Assets, Homework Completions, XP Events, Weekly Athlete Summary, Video Feedback, Zoom Meetings, Zoom Attendance, Streak Occurrences, Testing Scenarios | **No** |

Mike must create these in the Airtable UI (see checklist).

## JSON evidence files

- `schmidt-seed-result.json`
- `live-foundation-test-evidence.json`
- `live-foundation-test-verify.json`
- `prod-testing-scenarios-created.json`
- `prod-testing-and-leaderboard-views.json`
