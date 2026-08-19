# V2 End-to-End Test Matrix — Shooting Challenge

**Status:** Launch athlete-scenario matrix + executable PROD runner (SC-005)
**Last updated:** 2026-08-04 (SC-003–SC-006 testing control center)
**Environment:** **PROD** `appn84sqPw03zEbTT` is the active construction/testing base (completion master §1). Production optional.
**Companions:** [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) · [v2/08-testing-standards.md](./v2/08-testing-standards.md) · [v2/V2_PROD_EXECUTION_RUNBOOK.md](./v2/V2_PROD_EXECUTION_RUNBOOK.md) · [v2/V2_LAUNCH_SMOKE_TESTS.md](./v2/V2_LAUNCH_SMOKE_TESTS.md) · [deploy-checklists/C-020-testing-scenarios-script-checklist.md](./deploy-checklists/C-020-testing-scenarios-script-checklist.md) · [overnight/testing-integrity/CURRENT-PROD-BASELINE.md](./overnight/testing-integrity/CURRENT-PROD-BASELINE.md) · [testing/scenarios/README.md](./testing/scenarios/README.md) · [testing/evidence/2026-08-04-sc-003-006-testing-control-center/](./testing/evidence/2026-08-04-sc-003-006-testing-control-center/)

**Prep status (2026-08-04):** Automation **115** installed in PROD; dry + live + rerun PASS on Schmidt. Executable matrix runner lives at `tools/testing/run_e2e_matrix.mjs` (read-only safe rows). Do not upgrade BLOCKED/NOT_TESTED rows to PASS without new evidence.

## How to use

1. Prefer **Fillout-shaped** Submissions (C-020 / automation **115**) or verified production-shaped intake — not hand-typed incomplete rows.
2. Use **Schmidt** Enrollment `recgP9qZYjAhE7NXm` (must remain Active and publicly visible).
3. Record Pass / Fail / Blocked / N/A with enrollment ID, date, and automation versions.
4. Run the executable matrix (preferred for SC-005 evidence):

```bash
node tools/testing/run_e2e_matrix.mjs
node tools/testing/verify_schmidt_identity.mjs
node --test tools/testing/tests/
```

5. Repository contract tests cover pure logic only — they do **not** replace live matrix rows:

```bash
node airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js
node airtable/automations/shooting-challenge/lib/upload-make-lambda-response.test.js
cd web && npm test
```

### Executable matrix evidence (2026-08-04)

| Item | Value |
|------|-------|
| Runner | `tools/testing/run_e2e_matrix.mjs` |
| Results | `docs/testing/evidence/2026-08-04-sc-003-006-testing-control-center/E2E-MATRIX-RESULTS.json` |
| Counts | 11 PASS · 4 BLOCKED · 2 NOT_TESTED · 0 FAIL |
| PASS rows | A3, A4, B1, B2, C4, C6, D1, I1, J1, L1, SC006-WRITEBACK |
| BLOCKED | B3 (policy), B5 (backdate week), I6 (email/SC-008), L3 (failure inject/SC-008) |
| NOT_TESTED | E1 streak unlocks, F1 milestone unlocks (no unlock rows on Schmidt yet) |

**Result key (legacy columns):** P = Pass · F = Fail · B = Blocked · N = N/A · U = Untested

**Evidence categories (prefer in notes):** historical pass · repository test pass · offline fixture pass · live PROD pass before reset · live PROD pass after reset · Mike-attested live pass · independently verified live pass · blocked · not tested

### Automation 115 evidence (post-reset)

| Item | Value |
|------|-------|
| Scenario | `recPdyfYRFgDtpzQ8` |
| Dry-run | PASS 2026-07-23 (mode `dry_run`, shot total 25) |
| Live-run | PASS 2026-07-23 → Submission `recuuTBgstSTGg2E3`, XP 20, WAS `rechWp330MqSgRWzN` |
| Rerun | PASS 2026-07-24 → Submission `recjt6QpUcprSIxAk`, XP `recovVbiZynRUtDwF` (`SUBMISSION_XP\|recjt6QpUcprSIxAk`), WAS remained unique (4 subs / 100 shots) |
| Evidence | `docs/overnight/testing-integrity/live-115-rerun-latest.json`, `prod-probe-latest.json` |

---

## A. Intake and identity

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| A1 | New enrollment creates/links athlete | Fresh test registrant | 001–003 | Athlete linked; grade band assigned | U | U |
| A2 | Grade change reassigns band | Change grade on enrollment | 003 | Band updates once; no loop | U | U |
| A3 | Submission gets enrollment + week | Fillout-shaped daily log | 023, 005 (+115 pre-link) | Enrollment + Week set; Denver date key correct | U | P — re-verified 2026-08-04 (`run_e2e_matrix` A3 PASS; Week `recVDKiYATgzsfpmE`) |
| A4 | Malformed `recordId` input | Automation test with bad id | any V2 script | `statusOut=error`; no partial writes | U | P — repository test pass (115 offline harness; matrix A4) |

---

## B. Daily shooting XP and duplicates

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| B1 | First counted submission day awards XP | Count This Submission? checked | 010 | One XP Event; Source Key `SUBMISSION_XP\|{submissionId}` | U | P — live PROD pass after reset (`recOodD23MQrP1O9F` / `recovVbiZynRUtDwF`) |
| B2 | Same submission automation rerun | Re-run 010 on awarded row | 010 | Skip/repair; **no second** XP Event | U | P — independently verified inventory (0 Subs with >1 XP); UI re-trigger still MANUAL_REQUIRED |
| B3 | Second submission same calendar day | Two counted logs same Denver day | 010 + rules | At most one shooting XP per enrollment per day (engine rule) | U | B — 115 presets `Count It`; 4 same-day Schmidt Subs each earned XP (policy decision open; not Source Key failure) |
| B4 | Duplicate key collision | Two rows share Duplicate Key | 007 | Status Needs Review; not silently double-counted | U | U — 115 Count It bypasses 007a (see SCN-005) |
| B5 | Backdated submission date | Activity date in prior week | 005, 010, 031 | Week assignment + XP activity date use normalized Denver key | U | B — needs manually seeded prior Week (SCN-006) |

---

## C. Homework

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| C1 | Homework asset creates completion | Homework attachment path | 009/020 | One Homework Completion linked | U | U |
| C2 | Homework asset rerun / duplicate | Re-trigger 020 | 020 | Links existing; no second completion | U | U |
| C3 | Unsatisfactory review — no XP | Mark not satisfactory | 064/065 | No `HOMEWORK_XP\|…` Event | U | U |
| C4 | Satisfactory review awards XP | Coach marks satisfactory | 064/065 | One Event `HOMEWORK_XP\|{completionId}` | U | P — 2026-08-04 HC `recrBnHbLvDpFyIeO` → XP `rec6xE4V1t0atiTIP` |
| C5 | Homework XP rerun | Re-run 065 after Awarded | 065 | Skip/link existing; no duplicate | U | U |
| C6 | Reflection quiz → completion | Final reflection path | 067 | Completion linked/created once | U | P — Option B quiz links on HC (matrix C6) |
| C7 | Homework upload to storage (optional wave) | 070a enabled in Production only | 070a | Payload accepted; PROD remains OFF until scheduled | U | N |

---

## D. Video feedback and upload

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| D1 | Video asset → Video Feedback | Video upload on submission | 013/112 | Feedback row linked once | U | P — VF `recBqqe0uGMsqjUrF` linked to Schmidt (enrollment presence; 114 award still open) |
| D2 | Base video XP assigned | Review path | 113 | Base XP field set per rules | U | U |
| D3 | Posted feedback creates XP | Ready for XP Automation? | 114 | `VIDEO_SUBMISSION\|{vfId}` once | U | U |
| D4 | Video XP steal-guard | Linked XP belongs to other VF | 114 | Error / manual review; no steal | U | U |
| D5 | Video XP rerun | Re-run 114 | 114 | Update/repair same Event only | U | U |
| D6 | Async video upload success | 070b/070c happy path | 070b, 070c | Uploaded + hash + canonical URL | U | U |
| D7 | Duplicate bytes / reuse decision | C-023 fixture | 116 | Reuse consequences applied once | U | U |
| D8 | Malformed Lambda / writeback | Invalid hash or status | 070c | Verification fails; trigger not cleared incorrectly | U | U |

---

## E. Streaks

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| E1 | Build 3-day contiguous streak | Three counted days in a row | 053, 055 | Streak occurrence upserted | U | U |
| E2 | Gap breaks streak blocks | Day skipped mid-week | 053 | Separate blocks; no false merge | U | U |
| E3 | Streak XP award | Occurrence Ready for XP | 054 | `STREAK_XP\|enr\|ach\|endDate` once | U | U |
| E4 | Streak XP rerun / repair | Re-run 054 | 054 | Repair same Event; no duplicate | U | U |
| E5 | Daily streak refresh | Scheduled 056 | 056 | Current streak fields refresh without duplicate XP | U | U |

---

## F. Shot milestones

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| F1 | Cross single threshold | Shots move 90 → 120 | 066 | One unlock `SHOT_MILESTONE\|enr\|ms` | U | U |
| F2 | Cross multiple thresholds same run | 90 → 260 | 066 | One unlock per newly crossed milestone | U | U |
| F3 | Milestone rerun | Re-check after unlocks exist | 066 | No duplicate unlocks for same Source Key | U | U |
| F4 | Milestone XP via unlock | Unlock ready for 059 | 059 | One XP Event per unlock Source Key | U | U |

---

## G. Perfect Week

Canonical fixture pack (PROD): `docs/testing/perfect-week/` — Automation **057 v1.5** installed/running; verification open (do not treat as Complete).

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| G1 | Eligible Perfect Week | Required daily days + homework (+ video/zoom if configured) | 057 v1.5 → 058 → 059 | Eligible flag set; missing days empty; one PERFECT_WEEK XP | U | Fixture CASE-01 (pending) |
| G2 | Missing one required day | Six of seven days (Sun–Sat product rule) | 057 | Not eligible; missing day listed | U | Fixture CASE-03 (pending) |
| G3 | Create unlock | Eligible + unlock empty | 058 | Unlock Source Key `PERFECT_WEEK\|enr\|week` | U | U |
| G4 | Unlock rerun | Re-run 058 | 058 | No second unlock | U | Fixture CASE-15 (pending) |
| G5 | Unlock → XP | 059 path | 059 | One XP Event | U | Fixture CASE-01/15 (pending) |

---

## H. Levels and gates

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| H1 | XP-only advance (no gate) | Lifetime XP crosses next level; gate disabled/absent | 041, 042 | Status Assigned; Current/Next correct | U | U |
| H2 | Gate Blocked | XP enough; homework/videos below gate | 042 | Status Gate Blocked; Current stays; Next = gated level | U | U |
| H3 | Gate clears | Meet remaining gate stats | 042 | Advances; Level Gate Rule updates | U | U |
| H4 | Recalc mark from XP Event | New XP Event | 041 → 042 | Recalc Needed cleared after assign | U | U |

---

## I. Weekly summaries and email packages

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| I1 | WAS create from counted submission | New week submission | 031 | One WAS per enrollment+week | U | P — WAS `recuxvGq2kY8WKcey` unique Enrollment+Week (2026-08-04) |
| I2 | WAS rerun | Re-run 031 | 031 | Links existing; no duplicate WAS | U | U |
| I3 | Goal + homework attach | Goal/homework present | 032, 033 | Links set once | U | U |
| I4 | Previous week helpers | Multi-week history | 034 | Previous week ordered by Week Start Date | U | U |
| I5 | Build weekly email package | Build flag checked | 072 | Package fields populated; send still OFF | U | U |
| I6 | Send weekly package (controlled) | Make Production webhook | 074 | Send once; failure does not clear incorrectly | U | N |

---

## J. Zoom

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| J1 | Live attendance base XP | Meeting + enrollment attendance | 101 | `ZOOM_ATTEND_BASE\|meeting\|enr` once | U | P — attendance rows linked (XP key assert optional/not forced 2026-08-04) |
| J2 | Live attendance bonuses | 2nd / 3rd meeting rules | 101 | Bonus keys once per enrollment rules | U | U |
| J3 | Attendance rerun | Re-run Create XP Events | 101 | No duplicate live XP Events | U | U |
| J4 | Zoom recording credit | Recording quiz Satisfactory | **117a** | `ZOOM_RECORDING\|…` once; blocked if live exists; Config % of live | U (repo ready) | N |
| J5 | Recording credit rerun | Re-run 117a | **117a** | `skipped_already_awarded` | U | N |
| J6 | Recording approval email | Config enabled + Satisfactory | **117b** | Send once after Satisfactory only | U | N |

---

## K. Asset upload validation and malformed records

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| K1 | Valid uploaded writeback | Complete hash/URL/key | 070b/070c | Verification pass; trigger clear per design | U | U |
| K2 | Invalid SHA-256 | Short/non-hex hash | 070c | Fail closed; no false success | U | U |
| K3 | Missing enrollment/week on WAS | Broken WAS row | 057 | Error status; no unlock | U | U |
| K4 | Blank Duplicate Key | Submission without key | 007 | Skip safely | U | U |

---

## L. Automation reruns (cross-cutting)

| ID | Athlete scenario | Setup | Automations | Pass criteria | Production | PROD smoke |
|----|------------------|-------|-------------|---------------|-----|------------|
| L1 | XP Source Key idempotency battery | Re-run 010, 065, 114, 054, 101 | listed | Event counts unchanged | U | U |
| L2 | Unlock Source Key idempotency | Re-run 058, 066, 059 | listed | Unlock/XP counts unchanged | U | U |
| L3 | Email send trigger resilience | Force webhook 5xx in Production | 071/073/074 | Trigger not cleared on failure | U | N |

---

## M. Web / public smoke (non-styling)

| ID | Scenario | Pass criteria | Production/local | PROD |
|----|----------|---------------|-----------|------|
| M1 | `/shoot` loads | 200; brand shell intact | U | U |
| M2 | Airtable health | `/shoot/api/airtable` tokenValid | U | U |
| M3 | Leaderboard / homework catalog reads | No client token leakage; server-only | U | U |

Do not use this matrix to redesign frontend styling.

---

## Sign-off for matrix execution

| Wave | Operator | Date | Result | Notes |
|------|----------|------|--------|-------|
| Production full matrix | | | | |
| PROD smoke subset (B1–B2, C4, D3, F1, G3, H2, J1, M1–M2) | | | | |
| PROD executable safe matrix (SC-005) | Cursor agent | 2026-08-04 | 11 PASS / 4 BLOCKED / 2 NOT_TESTED / 0 FAIL | `E2E-MATRIX-RESULTS.json`; views install still Mike/Omni (SC-003) |

**Known launch blockers:** see [known-issues.md](./known-issues.md) § Launch blockers.
