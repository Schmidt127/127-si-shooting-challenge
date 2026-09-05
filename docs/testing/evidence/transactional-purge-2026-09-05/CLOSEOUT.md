# Production transactional purge — closeout 2026-09-05

**Base:** `appn84sqPw03zEbTT`  
**Approval:** `APPROVE TRANSACTIONAL PURGE` (exact)  
**Manifest:** v2 stamp `20260905_211033`  
**Execute stamp:** `20260905_211903`  
**origin/master at Phase 1:** `57831fe7892755a471d0f1934dbe1f52b289aaff`

## Summary

Production athlete/workflow test transactional data purged so the base is ready for genuine registrations. Configuration, curriculum, Weeks, PHA, rules, Countries/State, and reusable Zoom catalog meetings were preserved.

| Metric | Value |
|--------|------:|
| Approved planned deletes | **200** |
| Pass-1 deleted | **200** |
| Remnant pass (automation side-effects) | **4** (XP Events 3 + Video Feedback 1) |
| **Total deleted** | **204** |
| Failed deletions | **0** |
| Schema / fields / tables changed | **0** |
| External files deleted | **0** |
| Automations paused | **0** (MCP cannot safely toggle ON/OFF; FUT-030 remnant pattern) |

## Deleted by table (pass 1 + remnant)

| Table | Pass 1 | Remnant | Total |
|-------|-------:|--------:|------:|
| Email Handoff Queue | 24 | 0 | 24 |
| Award Recipients | 1 | 0 | 1 |
| XP Events | 83 | 3 | 86 |
| Athlete Achievement Unlocks | 12 | 0 | 12 |
| Streak Occurrences | 35 | 0 | 35 |
| Video Feedback | 7 | 1 | 8 |
| Zoom Attendance | 3 | 0 | 3 |
| Zoom Meetings (selected disposable) | 7 | 0 | 7 |
| Homework Completions | 2 | 0 | 2 |
| Submission Assets | 5 | 0 | 5 |
| Submissions | 6 | 0 | 6 |
| Weekly Athlete Summary | 8 | 0 | 8 |
| Enrollments | 4 | 0 | 4 |
| Athletes | 3 | 0 | 3 |

## Post-purge zeros / preserves (live recount)

**Zero:** Athletes, Enrollments, Submissions, Submission Assets, Homework Completions, Video Feedback, Weekly Athlete Summary, XP Events, Athlete Achievement Unlocks, Streak Occurrences, Zoom Attendance, Award Recipients, Email Handoff Queue, Payment Transactions, Final Reflection Quiz Submissions.

**Preserved:** Zoom Meetings **2** (Introduction, Motivation); Weeks **11**; PHA **18**; Homework Library **121**; Countries **194**; State **50**; Config **4**; XP Reward Rules **31**; Achievements **15**; Levels **12**; Level Gate Rules **12**; Shot Milestones **61**; Grade Bands **7**; Awards **31**; Tutorials & Assets **32**; Automations **50**; Program Instance **3**; Target Goal Shots **7**; School - Synced **1241**; Testing Scenarios **1**.

## Website

- `GET /shoot` → **200**
- `GET /shoot/api/airtable` → **200** `tokenValid: true`

## External artifacts retained (intentional)

S3/CloudFront objects, Make history, previously sent email, Vercel logs, Fillout configuration. No AWS/S3 deletes.

## Evidence

`docs/testing/evidence/transactional-purge-2026-09-05/` — Phase 1 dry-run + Phase 2 deletion report `20-phase2-deletion-report-20260905_211903.json` + `21-post-purge-verify-live.json`.

## Confirmed unchanged

No schema, formulas, views, Interfaces, automation scripts, payment/registration activation, or external file changes.
