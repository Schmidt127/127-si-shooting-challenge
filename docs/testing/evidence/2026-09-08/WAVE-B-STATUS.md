# SC-003–SC-008 — Wave B Status

**Date:** 2026-09-08  
**Verdict:** `WAVE B COMPLETE — MERGED`

---

## Merge / publication

| Field | Value |
|-------|-------|
| PR | #487 — SC-003–SC-008 testing control framework and reliability harness |
| Merge commit | `fb954807eeda8e66d263bc21959efe21dd813c26` |
| Branch | `test-reliability/orchestrator` |
| Repository QA | automation-contracts PASS; python-contracts PASS |
| #486 overlap | 0 implementation files |

---

## Controlled identity — live verified

Live Airtable read-only verification on 2026-09-08:

| Field | Value |
|-------|-------|
| Athlete | `recshWT5DQPUZXDvr` — Testing Schmidt |
| Enrollment | `recn54wbxTjygydqa` |
| Enrollment Active? | true |
| Program Instance | `rec5mEM0YPqPqq0hZ` — Shooting Challenge \| 2026-2027 |
| School Year | 2026-2027 |
| Grade | 12 |
| Grade Band | 9-12 |
| Lifetime XP | 0 |
| Total Submissions | 0 |
| Total Homework Completions | 0 |
| Total Video Submissions | 0 |
| Total Zoom Attendances | 0 |
| Identity verdict | `IDENTITY_VERIFIED_NON_EMAIL` |

The previous historical IDs remain historical only and must not be used for new Production tests.

---

## Shared CLI

| Field | Value |
|-------|-------|
| Path | `tools/testing/sc-test-control/` |
| Commands | `list`, `identity verify\|show`, `scenario`, `domain`, `report`, `verify-cleanup`, `failures list`, `readonly-scan` |
| Default mode | dry-run / read-only |
| Execute gate | requires verified controlled identity + explicit Production acknowledgement |
| Email execute | remains blocked pending allowlisted test recipient |

---

## Scenario Matrix

| Metric | Count |
|--------|------:|
| Total | **66** |
| Live-ready in registry | **13** |
| Fixture-only / offline | **2** |
| Structured Curriculum C8 | blocked pending #486 merge/deploy/proof |
| Operator UI scenarios | remain operator-gated |

Registry report: `docs/testing/evidence/2026-09-08/SCENARIO-REGISTRY-REPORT.json`

---

## Idempotency / failure recovery

| Area | Result |
|------|--------|
| SC-007/008 run-suite | **8/8 PASS** |
| Idempotency registry | **3/3 PASS** |
| CLI safety | **PASS** |
| Idempotency domains | 15 |
| Failure framework | installed under `tools/testing/sc-test-control/lib/failure-injection.js` |

---

## Testing Views

| Field | Value |
|-------|-------|
| Package | `docs/testing/test-reliability/TESTING-VIEWS-OPERATOR-PACKAGE.md` |
| Live installed? | Still requires Airtable view-level verification |
| Identity blocker | **CLEARED** |
| Remaining operator work | verify/update Testing Views filters against `recn54wbxTjygydqa` and run installed-view verification |

---

## Upload / email boundaries

- Legacy upload pipeline may proceed with read-only/offline proofs.
- Structured Curriculum upload/submit remains isolated until PR #486 is merged/deployed/proven.
- Email live execution remains blocked until an allowlisted test recipient is configured.
- No genuine participant records may be used for controlled tests.

---

## Wave transition

**Wave B is complete and merged. Wave C may proceed with read-only domain baselines against Testing Schmidt.**

Production write scenarios remain gated individually by scenario classification, expected mutations, cleanup, controlled identity, and recipient safety.
