# Agent 4 — Testing, QC, and Production Safety

**Date:** 2026-07-24  
**Scope:** Shooting Challenge only (not Team Shot Tracker; no 3/7/10-day inactivity alerts)  
**Repo checkpoint before work:** `adfabc5` · pulled tip at branch creation: `a8f3b00`  
**Verified weekly email path:** `118 → 072 → 119 → 074 → Make live → Gmail → Airtable writeback`

## Deliverables

| Doc | Purpose |
|-----|---------|
| [TEST-INVENTORY.md](./TEST-INVENTORY.md) | Existing suites, coverage, stale claims |
| [COVERAGE-MATRIX.md](./COVERAGE-MATRIX.md) | Workflow × condition matrix |
| [FAILURE-VISIBILITY.md](./FAILURE-VISIBILITY.md) | Where errors surface / silent gaps |
| [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) | Safe change types before go-live |
| [ROLLBACK-CHECKLIST.md](./ROLLBACK-CHECKLIST.md) | Rollback after bad deploy |
| [PRODUCTION-READINESS-MATRIX.md](./PRODUCTION-READINESS-MATRIX.md) | Evidence-graded readiness |
| [UNRESOLVED-TEST-GAPS.md](./UNRESOLVED-TEST-GAPS.md) | Remaining gaps |
| [REPORT.md](./REPORT.md) | Session report |
| [RESULTS.json](./RESULTS.json) | Machine-readable run record |

## Canonical companions (reuse, do not fork)

- Weekly email architecture: [`docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)
- End-to-end athlete matrix: [`docs/V2_END_TO_END_TEST_MATRIX.md`](../../V2_END_TO_END_TEST_MATRIX.md)
- Release checklist: [`docs/V2_RELEASE_CHECKLIST.md`](../../V2_RELEASE_CHECKLIST.md)
- Testing standards: [`docs/v2/08-testing-standards.md`](../../v2/08-testing-standards.md)

## Run Agent 4 suite

```bash
node tools/testing/run-agent4-suite.js
```

Also:

```bash
node tests/was-email-contracts/run-all.js
cd web && npm test
```

**Evidence standard:** repository contract pass ≠ live PROD integration pass.
