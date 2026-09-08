# Program Dashboard — Test & Reliability Program

**Updated:** 2026-09-08 (Wave A)  
**Orchestrator:** Agent 0

| Work Item | Repo | Tests | PROD proof | Cleanup | Verdict |
| --------- | ---: | ----: | ---------: | ------: | ------- |
| SC-003 | SC | Views spec + verifier (`verify_testing_views.mjs`) | 2026-08-05 — **needs refresh** | N/A | AUDIT COMPLETE |
| SC-004 | SC | `verify_schmidt_identity.mjs` | 2026-08-04 — **needs refresh** | N/A | AUDIT COMPLETE |
| SC-005 | SC | `run_e2e_matrix.mjs` + 43 SCN fixtures | 2026-08-04 — **needs refresh** | Per scenario | AUDIT COMPLETE |
| SC-006 | SC | `expected_actual.js` + offline suite | 2026-08-04 — **needs refresh** | N/A | AUDIT COMPLETE |
| SC-007 | SC | `sc-007-008/idempotency-matrix.js` | 2026-08-04 — **needs refresh** | Per replay | AUDIT COMPLETE |
| SC-008 | SC | `sc-007-008/failure-path-pack.test.js` | 2026-08-04 — **needs refresh** | Per inject | AUDIT COMPLETE |

## Program integrity (Wave A)

| Check | Status |
|-------|--------|
| #486 untouched | YES (audit only) |
| Genuine participants untouched | YES (no writes in Wave A) |
| Uncontrolled emails sent | NO |
| Duplicate writers introduced | NO |
| Cleanup complete | N/A (Wave A read-only) |
| Remaining operator actions | **P0:** Restore or re-document controlled enrollment post-purge; re-run identity + views verifiers; reconcile Completion Master SC-003/SC-004 |

## Branch registry

| Agent | Branch | PR | Status |
|-------|--------|-----|--------|
| 0 | `test-reliability/orchestrator` | Pending | Wave A deliverables |
| 1 | `test-reliability/testing-control-center` | Not created | Blocked on B merge order (can start in parallel) |
| 2 | `test-reliability/e2e-matrix` | Not created | Wave B |
| 3 | `test-reliability/expected-actual` | Not created | Wave B |
| 4 | `test-reliability/idempotency` | Not created | Wave B |
| 5 | `test-reliability/failure-recovery` | Not created | Wave B |
| 6 | `test-reliability/upload-pipeline` | Not created | Wave C |
| 7 | `test-reliability/email-handoff` | Not created | Wave C |

## Wave status

| Wave | Status |
|------|--------|
| A — Audit | **COMPLETE** (all 7 specialist audits reconciled) |
| B — Shared infrastructure | **READY** |
| C — Domain tests | BLOCKED on B |
| D — Controlled PROD proof | **BLOCKED** on identity re-verification |
| E — Final report | BLOCKED on D |
