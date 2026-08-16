# PKG-039 — First-Time Setup and Scheduled-Check Dependency Map

**Status:** Repository-ready — no Production proof claimed  
**Last updated:** 2026-08-16  
**Canonical packet:** [PKG-039 first-time setup packet](../deploy-checklists/PKG-039-FIRST-TIME-SETUP-SCHEDULED-CHECKS-PRODUCTION-PACKET.md)  
**Related WAS/goal packet:** [PKG-039 WAS weekly-goal integrity](../deploy-checklists/PKG-039-WAS-WEEKLY-GOAL-INTEGRITY-PRODUCTION-PACKET.md)

## Purpose

Map every workflow that behaves differently when:

- the first Enrollment is created
- the first Submission is entered
- the first XP Event is created
- the first Weekly Athlete Summary is created
- a scheduled process runs with zero, one, or multiple eligible records

This document is the repository dependency authority for PKG-039. It does not
prove installed automation versions or Production trigger behavior.

## First-record milestone map

| Milestone | Primary owner | Upstream inputs | Downstream consumers | First-record behavior | Rerun behavior |
|---|---|---|---|---|---|
| First Enrollment | **001** | Registration / intake identity | **002**, **003**, **041**, **075** | Find-or-create Athlete; link exactly one canonical Enrollment for Athlete + School Year + Program Instance | Skip duplicate Enrollment creation; fail closed on ambiguous identity |
| First Submission | **031** (WAS) via **023→005→007→009** | Enrollment, Activity Date, PHA context | **010**, **053**, **076**, **118** | Intake chain must resolve Enrollment + Week before counted XP or WAS | Replay must reuse canonical WAS and Submission Base XP event |
| First XP Event | **010** (Submission Base) | Counted Submission + canonical WAS | **041**, **042**, standings formulas | Creates one `SUBMISSION_XP\|{Submission ID}` when reconciliation latch fires | Same-event deactivate/reactivate; never duplicate key |
| First WAS | **031** | Counted Submission Enrollment + Week + Program Instance | **032**, **033**, **035**, **057**, **072**, **076**, **101**, **118** | Exactly one canonical WAS per Enrollment record ID + Week record ID | Reuse existing WAS; concurrent create must fail closed |
| First goal link | **032** | WAS Enrollment Program Instance + Grade Band | **035**, **057**, **058**, **076** | Link exactly one active Target Goal Shots row | Skip when Goal Record already matches |
| First Homework on WAS | **033** | WAS Enrollment + Week + Program Instance | **064**, **065**, **071** | PHA-only assignment; separate approved packet | Not PKG-039 Lane A scope |
| First progression queue | **041** | Enrollment lifetime XP / gate signature change | **042** | Queue latch on first material XP or enrollment create | Idempotent queue signature; no direct level writes |
| First level assignment | **042** | `Level Recalc Needed?` + `Active?` | standings, public web | Assign Beginner at zero XP on first eligible run | Reconcile without creating duplicate level rows |

## Scheduled-job map

| Automation | Schedule | Trigger table | Dynamic input | Zero eligible | One eligible | Multiple eligible | Email/Make boundary |
|---|---|---|---|---|---|---|---|
| **041** | Every 15 minutes | Enrollments | optional `recordId` | No-op queue scan | Queue one Enrollment | Queue each distinct signature; no level write | None |
| **056** | Daily (confirm in Airtable) | Enrollments | *confirm* | Skip refresh | Refresh one athlete streak context | Batch refresh per trigger design | None |
| **118** | Sunday 05:00 Denver | Weeks / Enrollments | `dryRun`, `sendMode`, `excludedEnrollmentIds`, `includeSchmidt`, `emptyWeekPolicy` | Skip / report no targets | Arm one existing canonical WAS only | Filter excluded/inactive before strict validation; never create WAS | Must keep **072**, **079**, **119**, **074**, Make OFF during integrity proof |
| **119** | Sunday 10:00 Denver | Weeks / Enrollments | `emptyWeekPolicy`, `sendMode` | Skip send arm | Arm `Send to Make?` on one ready WAS | Uses scheduler filters; does not create WAS | Consumer only; **074** posts webhook |

## Input-field contracts (record-triggered first-create paths)

| Automation | Required writable / evaluated inputs | Fail-closed cases |
|---|---|---|
| **001** | Enrollment identity, Athlete match keys, Program Instance, School Year | Duplicate Enrollment, ambiguous Athlete match |
| **023** | Submission Week, Fillout Enrollment Id, Program Instance from Week | Multiple active Enrollments without explicit PI context |
| **005** | Activity Date, Enrollment Program Instance, PHA ids on Submission | No Week for date in PI calendar; future date; wrong PI Week |
| **007** | Enrollment, Activity Date, duplicate exclusion flags | Marks duplicate; does not award XP |
| **009** | Submission, asset payloads | Creates assets only; no XP |
| **010** | `Reconciliation Needed?`, Enrollment, Week, WAS, countability | Missing WAS, duplicate key, inactive Enrollment |
| **031** | Count readiness, stat mode, Enrollment, Week, Program Instance | Zero/multiple Enrollment or Week links; concurrent WAS create |
| **032** | WAS Enrollment, Grade Band, Goal Record blank | Zero/multiple active goals for PI + Grade Band |
| **076** | `Build Daily Email Now?`, parent email cleaned, PI goal settled | Unconfigured goal; queue only after 031 validation |

## Writer ownership (no duplicate work)

| Function | Sole owner | Retired / prohibited |
|---|---|---|
| Canonical WAS create | **031** | **068** |
| Submission Base XP | **010** | manual XP rows |
| Weekly goal link | **032** | manual Goal Record selection by display name |
| WAS Homework assign | **033** | **068** |
| Daily email readiness | **031 → 076** | **077**, legacy Make/Gmail daily sender |
| Weekly email schedule arm | **118** | must not create WAS |
| Weekly email build | **072** | must not call Make |
| Weekly email send arm | **119 → 074** | must not mark Sent? in 119 |
| Progression output | **042** | **043** |

## Read-only audits

| Audit | Path | Use in PKG-039 |
|---|---|---|
| First setup + scheduled checks | `airtable/extension-scripts/audits/audit-pkg-039-first-setup-scheduled-checks.js` | Primary PKG-039 preflight |
| Counted submission / WAS / goal | `audit-counted-submission-xp-standings-reliability.js` | Submission Base XP + weekly goal findings |
| Achievement XP pipeline | `audit-achievement-xp-pipeline-integrity.js` | Optional when streak/milestone consumers are in scope |

## Repository tests

```bash
node tests/reliability/pkg-039-first-setup-scheduled-checks.test.js
node tests/weekly-athlete-summary/pkg-033-was-integrity.test.js
node airtable/extension-scripts/audits/audit-pkg-039-first-setup-scheduled-checks.test.js
```

## Coordination gates

| Package | Relationship |
|---|---|
| **PKG-006R** | Submission Base XP owner; lock must be released before broader first-submission proof |
| **PKG-036** | Progression observation lock; 041/042 are observe-only during PKG-039 Lane A |
| **PKG-038** | Streak/milestone consumers; Lane B only — do not enable 053/054/059/066 during Lane A |
| **Communications Hub** | 076→079 daily handoff is Lane B; keep Hub/Make isolated during WAS integrity proof |
| **PKG-037** | Consumes PKG-039 Lane A evidence as prerequisite for end-to-end certification |
