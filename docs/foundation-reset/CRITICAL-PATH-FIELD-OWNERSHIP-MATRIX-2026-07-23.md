# Critical-Path Field Ownership Matrix — Foundation Reset Pack

**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** 2026-07-23  
**Scope:** Initial matrix for pipeline-critical fields only. Not a full Stage K cleanup.

## How to read this

- **Intended writer:** automation/script (or human/Fillout) that should own the field  
- **Other possible writers:** other scripts/UI that might also write it  
- **Multiple writers?** Yes/No/Unknown  
- **Risk:** High / Medium / Low  
- Corrections in this package: **only** Schmidt `Active?` set to `true` (SC-004). No unrelated ownership rewrites.

## Dependency review summary

| Area | Dependency notes |
|------|------------------|
| Website leaderboard | Uses `Web - Leaderboard` view when present; fallback `AND({Active?}, {Lifetime XP Total} >= 0)` on Enrollments |
| Standings exclusion field | **No separate exclusion field found** on Enrollments |
| Testing Scenarios | Framework fields must stay on Testing Scenarios only (no pipeline test flags) |
| 115 | Creates Submissions only; must not write XP/WAS/achievements directly |
| Zoom recording | Must never write `Zoom Meetings.Attendees` (101 double-credit risk) |
| XP | One source record → one XP Event via Source Key / dedupe key |

## Matrix

| Table | Field | Type | Intended writer | Other possible writers | Readers / dependencies | Multiple writers? | Risk | Recommended correction |
|-------|-------|------|-----------------|------------------------|------------------------|-------------------|------|------------------------|
| Enrollments | Active? | checkbox | Human / ops (SC-004) | C-010 guards in many scripts (skip when false) | Website leaderboard fallback; 056/066/101 skip inactive; emails | Yes (ops + policy) | High | Keep `true` for Schmidt processing; exclude from public standings via **view filter**, not a new field |
| Enrollments | Athlete | link | 001 | Fillout / human | Pipeline identity | Low | Medium | None now |
| Enrollments | Grade / Grade Band | select / link | 002/003 | Human | XP rules, WAS copy | Possible | Medium | None now |
| Enrollments | Program Instance | link | Intake / human | — | Season scoping | Low | Medium | None now |
| Enrollments | Parent Email / Athlete Email | email | Fillout / human | — | Make email sends | Low | High (PII) | Controlled Schmidt contacts only |
| Submissions | Enrollment | link | 023 or pre-link (115) | Fillout | All downstream | Possible | High | 115 pre-links for Schmidt; avoid dual assign fights |
| Submissions | Week | link | 005 | — | WAS, XP week context | No (intended) | High | None now |
| Submissions | Activity Date | date | Fillout / 115 | Human | 005 week mapping | Possible | High | None now |
| Submissions | Shot Total | number | Fillout / 115 | Human | 010 XP | Possible | High | None now |
| Submissions | Duplicate Review Status | singleSelect | 007 / 115 (`Count It`) | Human | Counted shots / XP readiness | Yes | High | Monitor dual paths |
| Submissions | XP Award Status | singleSelect | 008/010 chain | — | XP pipeline | Unknown | High | Inventory live writers later |
| Submissions | Daily Email Status | singleSelect | 076/077 | — | Parent daily email | Unknown | Medium | Schmidt emails OK for tests |
| Submission Assets | Enrollment - Linked | link/lookup | 009 chain | — | Upload/HW/video | Unknown | High | None now |
| Submission Assets | Canonical URL / hash fields | text | Lambda/070*/116 | — | C-013/C-023 | Possible | High | None now |
| Homework Completions | Enrollment | link | 020 | 067 quiz path | 064/065/071 | Possible | High | Quiz path still open (SC-013/014) |
| Homework Completions | Satisfactory? / review fields | checkbox/select | Coach / 061 | — | XP + email | Possible | High | None now |
| XP Events | Source Key / XP Dedupe Key | text | Creating XP script (010/065/114/059/101/…) | Backfills | Idempotency | **Must be one pattern per source** | Critical | Catalog in SC-049 later |
| XP Events | Enrollment / Points | link/number | Same XP script | — | Levels, WAS | No | Critical | None now |
| Athlete Achievement Unlocks | Enrollment / Achievement / Week | links | 058/066/… | — | 059 XP | Possible | High | Keep H-001 dedupe rules |
| Streak Occurrences | Enrollment | link | 053/054/055/056 | — | Streak XP | Possible | High | Active? interactions |
| Shot milestone unlocks | via 066 | — | 066 | — | Achievements | — | High | Live OMNI still pending historically |
| Weekly Athlete Summary | Enrollment / Week | links | 031 | 118 (not installed) | 072/074 emails | Possible after C-011 | High | None now |
| Weekly Athlete Summary | Build/Send checkboxes | checkbox | Human / 118/119 | — | 072/074 | Future dual | High | Keep schedules off until authorized |
| Levels / Level Gate Rules | config fields | various | Human/config | 042 writes enrollment level fields | Progression | Split config vs enrollment | Medium | None now |
| Enrollments | Current Level / Next Level | links | 042 | 041 marks recalc | Gates, public formulas | Intended 042 | High | None now |
| Zoom Meetings | Attendees | link | Live attendance only | **Forbidden:** recording path | 101 XP | Critical if violated | Critical | Never write from 117 |
| Zoom Attendance | credit/conflict fields | various | 117/057/042 | — | Gates/Perfect Week | Coordinated | High | Stage 17 rules |
| Video Feedback | Enrollment | link | 013/111/112 | — | 113/114 XP + 073 email | Possible legacy 112 | Medium | 112 retirement still open |
| Testing Scenarios | Run Test? / results fields | checkbox/text | Operator + 115 | — | ETF only | No pipeline writers | Medium | Keep framework fields here only |
| Testing Scenarios | Linked Submission | link | 115 | — | Traceability | No | Medium | None now |
| Make handoff fields | webhook/status fields on SA/WAS/etc | various | 070*/071/074/077 | Make writebacks | External systems | Possible | High | Secrets never in git |
| Website/public fields | Active?, publish flags, public formulas | various | Config/human | Scripts | Next.js queries | View-dependent | Medium | Schmidt standings via view filter |

## Package-specific correction performed

| Change | Why | Safe? |
|--------|-----|-------|
| Set Enrollments `recgP9qZYjAhE7NXm` `Active?` = true | SC-004: Schmidt must be eligible for core XP/automation paths | Yes for processing; **increases public leaderboard visibility risk** until view filter applied |

## Explicit non-corrections

- Did not rename/delete fields
- Did not change single-select options
- Did not merge Tutorials tables
- Did not disable email automations
