# Shooting Challenge Test & Reliability Program — Orchestrator Control Document

**Program date:** 2026-09-08  
**Orchestrator branch:** `test-reliability/orchestrator`  
**Primary repo:** `Schmidt127/127-si-shooting-challenge`  
**Base branch:** `master` (fetched 2026-09-08)  
**Controlling issues:** `#67` (SC-003–SC-006), `#68` (SC-007–SC-008)  
**Controlling doc:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

---

## Program objective

Build a durable testing and reliability control system that makes the Shooting Challenge app easier to verify, regression-test, replay, audit, recover from failures, and prove correct in Production — without violating one-writer architecture, XP ownership, or active promotion boundaries.

---

## CRITICAL NO-TOUCH BOUNDARY — PR #486 / SC-STRUCTURED-HOMEWORK-FILES-001

**Status:** OPEN PR `#486` on branch `sc-structured-homework-files-001` (only open PR on master as of 2026-09-08).

**Do not modify** (read-only inspection permitted):

| Path | Change type | Owner |
|------|-------------|-------|
| `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` | MODIFIED | PR #486 |
| `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` | MODIFIED | PR #486 |
| `airtable/automations/shooting-challenge/lib/070a-submission-gate.js` | ADDED | PR #486 |
| `airtable/automations/shooting-challenge/lib/070a-submission-gate.test.js` | ADDED | PR #486 |
| `web/app/api/curriculum/homework/submit/route.ts` | MODIFIED | PR #486 |
| `web/app/api/curriculum/homework/upload-staging/route.ts` | ADDED | PR #486 |
| `web/app/api/curriculum/redeem/route.ts` | MODIFIED | PR #486 |
| `web/lib/airtable/client.ts` | MODIFIED | PR #486 |
| `web/lib/curriculum/handoff.ts` | MODIFIED | PR #486 |
| `web/lib/curriculum/submit-service.ts` | MODIFIED | PR #486 |
| `web/lib/curriculum/submit-validation.ts` | MODIFIED | PR #486 |
| `web/lib/curriculum/submit-validation.test.ts` | MODIFIED | PR #486 |
| `web/lib/curriculum/upload-staging-service.ts` | ADDED | PR #486 |
| `web/lib/curriculum/upload-staging-store.ts` | ADDED | PR #486 |
| `web/lib/curriculum/upload-staging-validation.ts` | ADDED | PR #486 |
| `web/lib/curriculum/upload-staging.test.ts` | ADDED | PR #486 |
| `web/types/optional-aws-sdk.d.ts` | ADDED | PR #486 |
| `docs/audits/SC-CURRICULUM-PHA-001-20260907.md` | MODIFIED | PR #486 |
| `docs/audits/SC-STRUCTURED-HOMEWORK-FILES-001-070a-trigger-20260907.md` | ADDED | PR #486 |

**Program rule:** No agent may exercise the Structured Curriculum upload/submit path in controlled Production writes until PR #486 is fully merged. Legacy homework/upload paths remain in scope for Agents 6/7.

**Also isolated (operator promotion):** five-band handoff, Shot Tracker assignment implementation, 070a/070b v4.8 operator docs for tomorrow, Curriculum Hub PR #18.

---

## Current-state inventory (master @ 2026-09-08)

### Open PRs

| PR | Branch | Title | Risk |
|----|--------|-------|------|
| #486 | `sc-structured-homework-files-001` | SC-STRUCTURED-HOMEWORK-FILES-001: curriculum file assets + 070a HC path | **NO-TOUCH** |

No other open PRs. No existing `test-reliability/*` branches on remote.

### Completion Master baseline (SC-003–SC-008)

| Item | Completion Master status | Last evidence | Program reassessment |
|------|-------------------------|---------------|---------------------|
| SC-003 | **Complete** | 2026-08-05 `--require-installed` 10/10 | Re-verify views still present; refresh if transactional purge changed counts |
| SC-004 | Live Tested in PROD | 2026-08-04 identity 17/17 | **Re-resolve** canonical IDs before any write (see identity section) |
| SC-005 | Live Tested in PROD | 2026-08-04 matrix 11/4/2/0 | Expand executable coverage; unify CLI; refresh post-2026-09 purge |
| SC-006 | Live Tested in PROD | 2026-08-04 offline 11/11 | Extend domains; wire into unified runner |
| SC-007 | Live Tested in PROD | 2026-08-04 idempotency pack | Machine-readable registry missing; live replay proofs stale |
| SC-008 | Live Tested in PROD | 2026-08-04 failure pack + asset contract | Live inject optional; refresh after infrastructure changes |

Issues `#67` and `#68` remain **OPEN** — program goal is to consolidate, refresh, and make the existing harness durable rather than re-claim historical Complete without fresh evidence.

### Existing test infrastructure (repository)

| Asset | Path | Notes |
|-------|------|-------|
| E2E matrix doc | `docs/V2_END_TO_END_TEST_MATRIX.md` | A–L sections; last updated 2026-08-04 |
| Executable matrix runner | `tools/testing/run_e2e_matrix.mjs` | Read-only default; no `--execute` flag yet |
| Expected-vs-actual engine | `tools/testing/lib/expected_actual.js` | PASS/FAIL/BLOCKED/NOT_TESTED/MANUAL_REQUIRED |
| Scenario catalog | `docs/testing/scenarios/catalog.json` | 43 SCN fixtures |
| Scenario JSON files | `docs/testing/scenarios/scn-*.json` | Includes dry-run, idempotency, failure inject |
| Testing views spec | `docs/testing/views/TESTING-VIEWS-SPEC.json` | SC-003; Meta API verifier |
| Testing views verifier | `tools/testing/verify_testing_views.mjs` | `--require-installed` |
| Schmidt identity verifier | `tools/testing/verify_schmidt_identity.mjs` | SC-004 read-only |
| SC-007/008 suite | `tools/testing/sc-007-008/` | idempotency-matrix, failure-path-pack, prod-reliability-evidence |
| Reliability runbook | `docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md` | Offline + optional live inject |
| Overnight baseline | `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md` | 2026-07-24; partially superseded |
| Field writer audit | `docs/overnight/testing-integrity/FIELD-WRITER-AUDIT.md` | One-writer reference |
| XP idempotency audit | `docs/overnight/testing-integrity/XP-IDEMPOTENCY-AUDIT.md` | Pre-reset inventory |
| Unified CLI | `tools/testing/sc-test-control/` | **NOT YET PRESENT** — Wave B deliverable |
| Idempotency registry JSON | `tools/testing/idempotency-contracts.json` | **NOT YET PRESENT** — Agent 4 deliverable |

### Recent Production activity affecting tests

| Event | Date | Impact |
|-------|------|--------|
| Transactional purge | 2026-09-05 | Schmidt transactional tables reset; evidence under `docs/testing/evidence/transactional-purge-2026-09-05/` |
| SC-160 stage 6 recovery | 2026-09-05 | Weekless WAS proof |
| PR #486 in flight | 2026-09-07 | 070a/070b + curriculum upload path — NO-TOUCH |

**Action:** All agents must re-resolve Schmidt identity and fixture RIDs from live Airtable before declaring PASS on Production scenarios.

---

## Agent ownership matrix

| Agent | Scope | Issue | Branch | Files owned | Shared dependencies | PROD proof required |
| ----- | ----- | ----- | ------ | ----------- | ------------------- | ------------------- |
| **0** | Program orchestrator, shared schemas, collision gate, evidence layout | #67, #68 (coordination) | `test-reliability/orchestrator` | `docs/testing/TEST-RELIABILITY-PROGRAM-20260908.md`, `docs/testing/evidence/2026-09-08/*`, `tools/testing/sc-test-control/schemas/*` | All agents | READ_ONLY_PROD for identity re-resolution gate only |
| **1** | Testing views + controlled identity | #67 / SC-003, SC-004 | `test-reliability/testing-control-center` | `docs/testing/views/*`, `tools/testing/verify_schmidt_identity.mjs`, `tools/testing/verify_testing_views.mjs`, `tools/testing/lib/testing_views.js` | Agent 3 `expected_actual.js` (read); Agent 0 schema | READ_ONLY_PROD: view presence + identity 17/17 refresh |
| **2** | Executable E2E matrix + test runner orchestration | #67 / SC-005 | `test-reliability/e2e-matrix` | `tools/testing/run_e2e_matrix.mjs`, `docs/testing/scenarios/*`, `tools/testing/sc-test-control/cli.js` (runner skeleton), domain scenario modules | Agent 3 verifier; Agent 0 schema; Agent 4 dedupe keys (read) | Mixed: read-only rows default; CONTROLLED_PROD_WRITE for explicit scenarios |
| **3** | Expected-vs-actual comparison engine | #67 / SC-006 | `test-reliability/expected-actual` | `tools/testing/lib/expected_actual.js`, `tools/testing/verify_scenario.mjs` | Agent 2 consumes; no competing validators | READ_ONLY_PROD default |
| **4** | Idempotency / duplicate proof registry | #68 / SC-007 | `test-reliability/idempotency` | `tools/testing/idempotency-contracts.json`, `tools/testing/sc-007-008/idempotency-matrix.js`, idempotency scenario modules | Agent 2 runner; v2-engine-contracts (read) | REPLAY + CONTROLLED_PROD_WRITE for replay proofs |
| **5** | Failure injection / recovery framework | #68 / SC-008 (failure classes) | `test-reliability/failure-recovery` | `tools/testing/sc-007-008/failure-path-pack.test.js`, generic failure harness, test-only endpoints (if any) | Agents 6/7 contribute domain failures | FAILURE_INJECTION (offline default); narrow PROD inject via orchestrator gate |
| **6** | Upload / reviewer / Make reliability (legacy path) | #68 | `test-reliability/upload-pipeline` | Upload pipeline test modules, Lambda unittest wrappers, legacy asset proofs | Agent 5 framework; **NOT** PR #486 files | CONTROLLED_PROD_WRITE on legacy Submission Assets only |
| **7** | Email / external handoff reliability | #68 | `test-reliability/email-handoff` | Email send protection tests, MRW-F07 harness, weekly/homework/video handoff modules | Agent 5 framework; **NOT** 070a/070b until #486 merged | TEST recipient only; OPERATOR_UI_REQUIRED for live inject |

---

## Collision map

### Shared files — single writer rule

| File / area | Owner | Consumers (read-only or PR) |
|-------------|-------|----------------------------|
| `tools/testing/sc-test-control/cli.js` | Agent 2 | Agents 3–7 register scenario modules |
| `tools/testing/sc-test-control/lib/safety-gate.js` | Agent 0 → Agent 2 implements | All `--execute` paths |
| `tools/testing/lib/expected_actual.js` | Agent 3 | Agents 1, 2, 5 |
| `tools/testing/idempotency-contracts.json` | Agent 4 | Agents 2, 5, 6, 7 |
| `tools/testing/sc-007-008/idempotency-matrix.js` | Agent 4 | Agent 2 evidence |
| `tools/testing/sc-007-008/failure-path-pack.test.js` | Agent 5 | Agents 6, 7 add cases |
| `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | Each agent updates **only** owned SC rows | Orchestrator reconciles |
| `docs/testing/evidence/2026-09-08/` | All agents write dated evidence | Orchestrator merges dashboard |

### Production script collision prevention

No two agents may independently edit the same Airtable automation script. All Production script changes require orchestrator approval and must respect field-writer audit (`FIELD-WRITER-AUDIT.md`).

| Script domain | Writer | Test agents |
|---------------|--------|-------------|
| 010 XP | 010 script only | 4 proves dedupe; 2 runs matrix |
| 020/067 Homework HC | 020/067 only | 4 proves; 2 matrix |
| 065 Homework XP | 065 only | 4 proves |
| 070a/070b handoff | 070a/070b (**#486 NO-TOUCH**) | 6 legacy only until merge |
| 114 Video XP | 114 only | 4 proves |
| 031 WAS | 031 only | 3 verifies; 4 proves uniqueness |
| 074 Weekly email | 074 + Make writeback | 7 proves send protection |
| Lambda upload | `lambda/upload-asset` | 6 proves; 5 failure inject (mock) |

### Overlap resolution

| Overlap | Resolution |
|---------|------------|
| E2E runner vs expected-actual | Agent 2 orchestrates; Agent 3 owns comparison functions |
| Idempotency docs vs registry | Agent 4 consolidates into `idempotency-contracts.json`; matrix.js becomes generator/consumer |
| Failure tests vs upload/email | Agent 5 owns generic framework; Agents 6/7 add domain packs |
| Homework structured vs legacy | Legacy only until #486 merged; Agent 6 explicitly excludes curriculum API |

---

## Controlled test identity

**Rule:** Re-resolve from live Airtable before any Production write. Do not blindly use stale historical IDs.

### Documented canonical IDs (Completion Master / TESTING-VIEWS-SPEC — verify live)

| Record | Documented RID | Notes |
|--------|----------------|-------|
| Schmidt Athlete | `recgqVstObQRzgXJF` | Must exist; Active |
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` | Must remain Active?=true; publicly visible |
| Foundation Week | `recVDKiYATgzsfpmE` | May need refresh after purge |
| Canonical WAS | `recuxvGq2kY8WKcey` | Completion Master; older baseline cited `rechWp330MqSgRWzN` — **resolve conflict live** |
| Testing Scenario seed | `recPdyfYRFgDtpzQ8` | 115 driver |
| Homework Completion | `recrBnHbLvDpFyIeO` | May have been purged 2026-09-05 |
| Homework XP | `rec6xE4V1t0atiTIP` | Linked to HC above |
| Upload proof asset | `recaXBfjeeu3bcm0t` | SC-008 success contract |

### Known identity drift (must reconcile)

`tools/testing/run_e2e_matrix.mjs` defines a **FALLBACK_BASELINE** (2026-08-23 autonomous QA) with different Athlete/Enrollment RIDs (`rec4EX91VL55d9PHr` / `recCrNNAdVmQ4Y8fL`). Agent 1 must determine which enrollment is the current controlled identity and update evidence — not force old IDs.

### Test recipient safety

- Schmidt-only recipients for any controlled live email
- Blank/invalid recipient must block send (re-arm Send to Make? without Sent?)
- No genuine family sends

---

## Test taxonomy

Every scenario must declare one primary classification:

| Class | Description | Default mode |
|-------|-------------|--------------|
| `OFFLINE_UNIT` | Pure logic / mock Airtable | Always safe |
| `CONTRACT` | Cross-module contract tests (Node `--test`) | Always safe |
| `READ_ONLY_PROD` | Live Airtable reads only | `--dry-run` |
| `CONTROLLED_PROD_WRITE` | Creates/updates Schmidt records | `--execute` + safety gate |
| `FAILURE_INJECTION` | Simulated failures (mock preferred) | Offline or narrow PROD |
| `REPLAY` | First-run + rerun idempotency proof | `--execute` + cleanup |
| `CLEANUP` | Post-test restoration | `--execute` + confirm |
| `OPERATOR_UI_REQUIRED` | Airtable UI / Mike action | Document only |

---

## Evidence contract

Every executable scenario produces a JSON record conforming to `tools/testing/sc-test-control/schemas/test-result.schema.json`:

```json
{
  "scenarioId": "SCN-001",
  "domain": "daily-submission",
  "mode": "dry-run",
  "classification": "READ_ONLY_PROD",
  "timestamp": "2026-09-08T00:00:00.000Z",
  "testIdentity": {
    "enrollmentId": "recgP9qZYjAhE7NXm",
    "athleteId": "recgqVstObQRzgXJF"
  },
  "preconditions": {},
  "expected": {},
  "actual": {},
  "recordIds": { "created": [], "modified": [] },
  "dedupeKeys": [],
  "mutations": [],
  "cleanup": { "keep": [], "delete": [], "restore": [], "verify": [] },
  "result": "PASS",
  "notes": ""
}
```

**Result values:** `PASS` | `FAIL` | `BLOCKED` | `UNKNOWN`

Store evidence under: `docs/testing/evidence/2026-09-08/<agent-or-run-id>/`

Do not commit secrets, tokens, or private file contents.

---

## Write safety gate (integration gate)

Live Production write testing is **BLOCKED** until ALL of:

1. [ ] Dry-run path exists for the scenario (`tools/testing/sc-test-control/` CLI)
2. [ ] Target identity verified via `verify_schmidt_identity.mjs` (fresh run)
3. [ ] Expected mutations declared in scenario definition
4. [ ] Cleanup documented (keep/delete/restore/verify)
5. [ ] Recipient allowlist passes (email scenarios)
6. [ ] PR #486 NO-TOUCH boundary confirmed — no agent modified #486 files
7. [ ] Orchestrator Wave B gate published (below)

### `--execute` requirements

1. Environment = Production acknowledged
2. Controlled test Enrollment matches configured RID
3. Athlete/Enrollment label matches expected test identity
4. Recipient allowlist passes
5. Scenario declares expected mutations
6. Cleanup exists
7. Destructive operations separately confirmed

---

## Wave A audit summary (2026-09-08)

### Agent 1 — Testing views + identity

| Area | Status | Gap |
|------|--------|-----|
| SC-003 views package | Complete in CM; spec + verifier exist | Re-verify after 2026-09-05 purge |
| SC-004 identity | Verifier exists; 17/17 at last run | Re-run live; reconcile WAS/HC IDs post-purge |
| Testing views for Zoom/PHA/Streak | Partial in spec | Confirm Zoom Attendance view; PHA testing view if needed |
| Operator checklist | `docs/testing/views/OPERATOR-CHECKLIST.md` | Refresh sign-off date |

### Agent 2 — E2E matrix

| Area | Status | Gap |
|------|--------|-----|
| Matrix documentation | A–L in `V2_END_TO_END_TEST_MATRIX.md` | Many rows still U (untested) |
| Executable runner | `run_e2e_matrix.mjs` exists | No unified CLI; no `--execute`; 11/4/2/0 stale |
| Scenario catalog | 43 JSON fixtures | Not wired to single runner |
| Domain coverage | Daily, HW partial, video presence, WAS, Zoom presence | Levels recalc, achievements, email, structured HW blocked |
| Dry-run pattern | Partial (`sc-pw-e2e.mjs`, `sc-athlete-wf.mjs`) | Not standardized across domains |

### Agent 3 — Expected-vs-actual

| Area | Status | Gap |
|------|--------|-----|
| Core engine | `expected_actual.js` ~1000+ lines | WARN status not formalized (uses BLOCKED) |
| Domains | Daily, identity, homework, video, zoom, XP inventory | Files/assets canonical URL checks; levels 042 contract |
| Writeback | Explicitly off | Correct per decision |

### Agent 4 — Idempotency

| Area | Status | Gap |
|------|--------|-----|
| Matrix data | `idempotency-matrix.js` 13 paths | No `idempotency-contracts.json` |
| Offline proofs | `idempotency-proof-pack.test.js` | Live replay proofs need refresh |
| Domains | Submission, HW, video, zoom, streak, milestone, PW, threshold, WAS, email | Zoom attend live fixture; milestone/PW live |

### Agent 5 — Failure recovery

| Area | Status | Gap |
|------|--------|-----|
| Offline pack | `failure-path-pack.test.js` | Generic harness not extracted |
| Classes covered | Webhook null/502/malformed, blank recipient, Lambda reject | Missing secret sim, timeout, semantic HTTP 200 |
| PROD inject | Documented optional in runbook | Requires Mike authorization |

### Agent 6 — Upload pipeline (legacy)

| Area | Status | Gap |
|------|--------|-----|
| Success contract | Asset `recaXBfjeeu3bcm0t` proven 2026-08-04 | Re-verify post-purge |
| Lambda tests | Python unittest auth/viewer/token/homework_route | Integrated runner missing |
| Structured curriculum | PR #486 in flight | **OUT OF SCOPE** until merge |

### Agent 7 — Email handoff

| Area | Status | Gap |
|------|--------|-----|
| Weekly email | MRW-F07 harness + SCN-029/040/041 | Live inject optional |
| Parent feedback | 070a/070b paths | **NO-TOUCH** until #486 merged |
| Recipient safety | Offline tests exist | Live TEST recipient proof refresh |

---

## Wave B integration gate

**Orchestrator decision (2026-09-08):** Wave B may proceed — **no file collisions** between agent branches and PR #486 if agents respect the NO-TOUCH list. Merge order:

1. Agent 0 shared schemas (`test-reliability/orchestrator`) ← **this branch**
2. Agent 2 test runner skeleton (`test-reliability/e2e-matrix`)
3. Agent 3 expected/actual extensions (`test-reliability/expected-actual`)
4. Agent 4 idempotency registry (`test-reliability/idempotency`)
5. Agent 5 failure-injection framework (`test-reliability/failure-recovery`)
6. Agents 1, 6, 7 domain wiring (parallel after step 2)

**Blocked until Wave B step 1 merges:** Production `--execute` scenarios.

---

## Program dashboard

| Work Item | Repo | Tests | PROD proof | Cleanup | Verdict |
| --------- | ---: | ----: | ---------: | ------: | ------- |
| SC-003 | SC | Views spec + verifier | 2026-08-05 (stale) | N/A | **AUDIT COMPLETE** — re-verify views |
| SC-004 | SC | Identity verifier | 2026-08-04 (stale) | N/A | **AUDIT COMPLETE** — re-resolve IDs |
| SC-005 | SC | Matrix runner + 43 SCN | 2026-08-04 (stale) | Per scenario | **AUDIT COMPLETE** — unify CLI |
| SC-006 | SC | expected_actual.js | 2026-08-04 | N/A | **AUDIT COMPLETE** — extend domains |
| SC-007 | SC | idempotency-matrix.js | 2026-08-04 | Per replay | **AUDIT COMPLETE** — registry JSON |
| SC-008 | SC | failure-path-pack | 2026-08-04 | Per inject | **AUDIT COMPLETE** — generic harness |

Allowed verdicts: NOT STARTED · AUDIT COMPLETE · CODE COMPLETE · READY FOR OPERATOR · LIVE PROOF COMPLETE · COMPLETE · BLOCKED

---

## Wave plan

| Wave | Status | Deliverables |
|------|--------|--------------|
| **A** Audit | **COMPLETE** (this document) | Inventory, collision map, taxonomy, evidence contract, integration gate |
| **B** Shared infrastructure | READY TO START | sc-test-control CLI, schema, safety gate, idempotency registry, failure framework |
| **C** Domain tests | BLOCKED on B | Wire enrollment → email scenarios |
| **D** Controlled PROD proof | BLOCKED on B+C | Ordered proof sequence per program spec |
| **E** Final report | BLOCKED on D | `TEST-RELIABILITY-FINAL-REPORT.md` |

---

## Stop conditions (program-wide)

Stop and escalate if any agent:

- Touches PR #486 files
- Rewrites 070a/070b outside #486 ownership
- Uses genuine participant records
- Sends uncontrolled email
- Creates competing XP/progression writer
- Weakens auth or makes S3 public
- Performs broad Production deletion without cleanup
- Changes business rules merely to make tests pass

---

## References

- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
- `docs/V2_END_TO_END_TEST_MATRIX.md`
- `docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md`
- `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md`
- `docs/testing/evidence/2026-09-08/WAVE-A-AUDIT-SUMMARY.md`
- GitHub issues: #67, #68
- GitHub PR: #486 (NO-TOUCH)
