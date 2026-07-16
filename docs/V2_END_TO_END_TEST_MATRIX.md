# V2 End-to-End Test Matrix — Shooting Challenge

**Status:** Launch athlete-scenario matrix  
**Last updated:** 2026-07-16  
**Environment:** DEV first (`appTetnuCZlCZdTCT`) · PROD smoke only after Mike approval  
**Companions:** [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) · [v2/08-testing-standards.md](./v2/08-testing-standards.md) · [v2/V2_DEV_EXECUTION_RUNBOOK.md](./v2/V2_DEV_EXECUTION_RUNBOOK.md) · [v2/V2_LAUNCH_SMOKE_TESTS.md](./v2/V2_LAUNCH_SMOKE_TESTS.md) · [deploy-checklists/C-020-testing-scenarios-script-checklist.md](./deploy-checklists/C-020-testing-scenarios-script-checklist.md) · [deploy-checklists/DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md)

**Prep status (2026-07-16):** Repository contract tests PASS. Merge gate #25/#26/#27 closed. Live matrix rows remain **U** until Mike/OMNI execute on DEV. Recommended first live DEV block: **F1–F3** (066) then **J4–J5** (117a). Do not mark P without enrollment IDs + automation output evidence.

## How to use

1. Prefer **Fillout-shaped** Submissions (C-020 / automation **115**) or verified production-shaped intake — not hand-typed incomplete rows.
2. Use named **test enrollments** only (Schmidt + DEV sandbox enrollments).
3. Record Pass / Fail / Blocked / N/A with enrollment ID, date, and automation versions.
4. Repository contract tests cover pure logic only — they do **not** replace this matrix:

```bash
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
cd web && npm test
```

**Result key:** P = Pass · F = Fail · B = Blocked · N = N/A · U = Untested

---

## A. Intake and identity

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| A1 | New enrollment creates/links athlete | Fresh test registrant | 001–003 | Athlete linked; grade band assigned | U | U |
| A2 | Grade change reassigns band | Change grade on enrollment | 003 | Band updates once; no loop | U | U |
| A3 | Submission gets enrollment + week | Fillout-shaped daily log | 023, 005 | Enrollment + Week set; Denver date key correct | U | U |
| A4 | Malformed `recordId` input | Automation test with bad id | any V2 script | `statusOut=error`; no partial writes | U | U |

---

## B. Daily shooting XP and duplicates

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| B1 | First counted submission day awards XP | Count This Submission? checked | 010 | One XP Event; Source Key `SUBMISSION_XP\|{submissionId}` | U | U |
| B2 | Same submission automation rerun | Re-run 010 on awarded row | 010 | Skip/repair; **no second** XP Event | U | U |
| B3 | Second submission same calendar day | Two counted logs same Denver day | 010 + rules | At most one shooting XP per enrollment per day (engine rule) | U | U |
| B4 | Duplicate key collision | Two rows share Duplicate Key | 007 | Status Needs Review; not silently double-counted | U | U |
| B5 | Backdated submission date | Activity date in prior week | 005, 010, 031 | Week assignment + XP activity date use normalized Denver key | U | U |

---

## C. Homework

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| C1 | Homework asset creates completion | Homework attachment path | 009/020 | One Homework Completion linked | U | U |
| C2 | Homework asset rerun / duplicate | Re-trigger 020 | 020 | Links existing; no second completion | U | U |
| C3 | Unsatisfactory review — no XP | Mark not satisfactory | 064/065 | No `HOMEWORK_XP\|…` Event | U | U |
| C4 | Satisfactory review awards XP | Coach marks satisfactory | 064/065 | One Event `HOMEWORK_XP\|{completionId}` | U | U |
| C5 | Homework XP rerun | Re-run 065 after Awarded | 065 | Skip/link existing; no duplicate | U | U |
| C6 | Reflection quiz → completion | Final reflection path | 067 | Completion linked/created once | U | U |
| C7 | Homework upload to storage (optional wave) | 070a enabled in DEV only | 070a | Payload accepted; PROD remains OFF until scheduled | U | N |

---

## D. Video feedback and upload

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| D1 | Video asset → Video Feedback | Video upload on submission | 013/112 | Feedback row linked once | U | U |
| D2 | Base video XP assigned | Review path | 113 | Base XP field set per rules | U | U |
| D3 | Posted feedback creates XP | Ready for XP Automation? | 114 | `VIDEO_SUBMISSION\|{vfId}` once | U | U |
| D4 | Video XP steal-guard | Linked XP belongs to other VF | 114 | Error / manual review; no steal | U | U |
| D5 | Video XP rerun | Re-run 114 | 114 | Update/repair same Event only | U | U |
| D6 | Async video upload success | 070b/070c happy path | 070b, 070c | Uploaded + hash + canonical URL | U | U |
| D7 | Duplicate bytes / reuse decision | C-023 fixture | 116 | Reuse consequences applied once | U | U |
| D8 | Malformed Lambda / writeback | Invalid hash or status | 070c | Verification fails; trigger not cleared incorrectly | U | U |

---

## E. Streaks

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| E1 | Build 3-day contiguous streak | Three counted days in a row | 053, 055 | Streak occurrence upserted | U | U |
| E2 | Gap breaks streak blocks | Day skipped mid-week | 053 | Separate blocks; no false merge | U | U |
| E3 | Streak XP award | Occurrence Ready for XP | 054 | `STREAK_XP\|enr\|ach\|endDate` once | U | U |
| E4 | Streak XP rerun / repair | Re-run 054 | 054 | Repair same Event; no duplicate | U | U |
| E5 | Daily streak refresh | Scheduled 056 | 056 | Current streak fields refresh without duplicate XP | U | U |

---

## F. Shot milestones

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| F1 | Cross single threshold | Shots move 90 → 120 | 066 | One unlock `SHOT_MILESTONE\|enr\|ms` | U | U |
| F2 | Cross multiple thresholds same run | 90 → 260 | 066 | One unlock per newly crossed milestone | U | U |
| F3 | Milestone rerun | Re-check after unlocks exist | 066 | No duplicate unlocks for same Source Key | U | U |
| F4 | Milestone XP via unlock | Unlock ready for 059 | 059 | One XP Event per unlock Source Key | U | U |

---

## G. Perfect Week

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| G1 | Eligible Perfect Week | Required daily days + homework (+ video/zoom if configured) | 057 | Eligible flag set; missing days empty | U | U |
| G2 | Missing one required day | Four of five days | 057 | Not eligible; missing day listed | U | U |
| G3 | Create unlock | Eligible + unlock empty | 058 | Unlock Source Key `PERFECT_WEEK\|enr\|week` | U | U |
| G4 | Unlock rerun | Re-run 058 | 058 | No second unlock | U | U |
| G5 | Unlock → XP | 059 path | 059 | One XP Event | U | U |

---

## H. Levels and gates

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| H1 | XP-only advance (no gate) | Lifetime XP crosses next level; gate disabled/absent | 041, 042 | Status Assigned; Current/Next correct | U | U |
| H2 | Gate Blocked | XP enough; homework/videos below gate | 042 | Status Gate Blocked; Current stays; Next = gated level | U | U |
| H3 | Gate clears | Meet remaining gate stats | 042 | Advances; Level Gate Rule updates | U | U |
| H4 | Recalc mark from XP Event | New XP Event | 041 → 042 | Recalc Needed cleared after assign | U | U |

---

## I. Weekly summaries and email packages

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| I1 | WAS create from counted submission | New week submission | 031 | One WAS per enrollment+week | U | U |
| I2 | WAS rerun | Re-run 031 | 031 | Links existing; no duplicate WAS | U | U |
| I3 | Goal + homework attach | Goal/homework present | 032, 033 | Links set once | U | U |
| I4 | Previous week helpers | Multi-week history | 034 | Previous week ordered by Week Start Date | U | U |
| I5 | Build weekly email package | Build flag checked | 072 | Package fields populated; send still OFF | U | U |
| I6 | Send weekly package (controlled) | Make DEV webhook | 074 | Send once; failure does not clear incorrectly | U | N |

---

## J. Zoom

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| J1 | Live attendance base XP | Meeting + enrollment attendance | 101 | `ZOOM_ATTEND_BASE\|meeting\|enr` once | U | U |
| J2 | Live attendance bonuses | 2nd / 3rd meeting rules | 101 | Bonus keys once per enrollment rules | U | U |
| J3 | Attendance rerun | Re-run Create XP Events | 101 | No duplicate live XP Events | U | U |
| J4 | Zoom recording credit | Recording quiz Satisfactory | **117a** | `ZOOM_RECORDING\|…` once; blocked if live exists; Config % of live | U (repo ready) | N |
| J5 | Recording credit rerun | Re-run 117a | **117a** | `skipped_already_awarded` | U | N |
| J6 | Recording approval email | Config enabled + Satisfactory | **117b** | Send once after Satisfactory only | U | N |

---

## K. Asset upload validation and malformed records

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| K1 | Valid uploaded writeback | Complete hash/URL/key | 070b/070c | Verification pass; trigger clear per design | U | U |
| K2 | Invalid SHA-256 | Short/non-hex hash | 070c | Fail closed; no false success | U | U |
| K3 | Missing enrollment/week on WAS | Broken WAS row | 057 | Error status; no unlock | U | U |
| K4 | Blank Duplicate Key | Submission without key | 007 | Skip safely | U | U |

---

## L. Automation reruns (cross-cutting)

| ID | Athlete scenario | Setup | Automations | Pass criteria | DEV | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| L1 | XP Source Key idempotency battery | Re-run 010, 065, 114, 054, 101 | listed | Event counts unchanged | U | U |
| L2 | Unlock Source Key idempotency | Re-run 058, 066, 059 | listed | Unlock/XP counts unchanged | U | U |
| L3 | Email send trigger resilience | Force webhook 5xx in DEV | 071/073/074 | Trigger not cleared on failure | U | N |

---

## M. Web / public smoke (non-styling)

| ID | Scenario | Pass criteria | DEV/local | PROD |
|----|----------|---------------|-----------|------|
| M1 | `/shoot` loads | 200; brand shell intact | U | U |
| M2 | Airtable health | `/shoot/api/airtable` tokenValid | U | U |
| M3 | Leaderboard / homework catalog reads | No client token leakage; server-only | U | U |

Do not use this matrix to redesign frontend styling.

---

## Sign-off for matrix execution

| Wave | Operator | Date | Result | Notes |
|------|----------|------|--------|-------|
| DEV full matrix | | | | |
| PROD smoke subset (B1–B2, C4, D3, F1, G3, H2, J1, M1–M2) | | | | |

**Known launch blockers:** see [known-issues.md](./known-issues.md) § Launch blockers.
