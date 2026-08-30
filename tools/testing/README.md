# Shooting Challenge Testing Tools

Read-only verification and offline harnesses for Automation **115**, Schmidt identity, Testing views, E2E matrix, and XP/WAS integrity.

## Agent 4 QC suite (contracts + weekly email Live/Test regression)

Inventory, coverage matrix, release/rollback checklists:
`docs/testing/agent4-qc/`

```bash
node tools/testing/run-agent4-suite.js
```

## Autonomous production-readiness QA (2026-08-23)

Full orchestrator + manifest: `docs/testing/autonomous-qa/`

```bash
node tools/testing/autonomous-qa-run.mjs
node tools/testing/autonomous-qa-run.mjs --live-create
```

## Offline tests (no Airtable)

```bash
node --test tools/testing/tests/
```

Includes:

- `test_115_offline.mjs` — runs the **real** `115-*.js` script under mocks
- `test_expected_actual.mjs` — expected-versus-actual verifier (daily, identity, homework, video/zoom, writeback policy)
- `test_117_offline.mjs` — Stage 17 orchestrator offline suite (separate owner area)

## SC-003 Testing views

Spec + Omni install + checklist: `docs/testing/views/`

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

Airtable API **cannot** create views or read filter definitions. Verifier checks Meta API names + Data API row counts through existing views. Canonical `Testing - …` names and shorter PROD aliases (section `02 TESTING`) both count; matching is exact and table-specific. Offline: `node --test tools/testing/tests/test_testing_views.mjs`.

## SC-004 Schmidt identity

```bash
node tools/testing/verify_schmidt_identity.mjs
node tools/testing/probe_schmidt_control_center.mjs
```

## SC-005 executable E2E matrix

Companion narrative matrix: `docs/V2_END_TO_END_TEST_MATRIX.md`

```bash
node tools/testing/run_e2e_matrix.mjs
```

Records preconditions / action / expected / actual / record IDs / pass-fail / cleanup for each safe row. Policy and email failure injects remain BLOCKED (SC-007/SC-008).

## SC-ATHLETE-WF-001 individual athlete workflow

Pre–season-simulation disposable path (Testing3 Schmidt). Dry-run default; no email.

Plan: `docs/testing/athlete-workflow/SC-ATHLETE-WF.md`

```bash
node tools/testing/tests/test_sc_athlete_wf_contract.mjs
node tools/testing/sc-athlete-wf.mjs --case full
node tools/testing/sc-athlete-wf.mjs --case full --readonly
# gated live create (ATHWF| prefix only):
node tools/testing/sc-athlete-wf.mjs --case full --apply
node tools/testing/sc-athlete-wf.mjs --cleanup
```

Distinct from **SC-PW-E2E** and from **SC-SEASON-SIM-*** (do not run season simulation from this harness).

## Expected-versus-actual verifier (SC-006)

Library: `lib/expected_actual.js`  
CLI: `verify_scenario.mjs`

```bash
# Offline known live bundle
node tools/testing/verify_scenario.mjs --fixture tools/testing/fixtures/live-115-bundle.json

# Live PROD read-only (uses web/.env.local AIRTABLE_API_TOKEN)
node tools/testing/verify_scenario.mjs --live --scenario recPdyfYRFgDtpzQ8
```

Statuses: `PASS` | `FAIL` | `BLOCKED` | `NOT_TESTED` | `MANUAL_REQUIRED`

The verifier **never writes** to Airtable. Pass/Fail auto-writeback stays disabled — see `airtableWritebackPolicy()` (competing writers on Testing Scenarios result fields).

## PROD read-only probe

```bash
node tools/testing/prod_probe_read_only.mjs
```

Prints JSON summary for Schmidt enrollment, seed scenario, submission/XP/WAS uniqueness. No creates/updates/deletes.

## Orphan cleanup (destructive — off by default)

```bash
# Dry-run only
node tools/testing/cleanup_orphan_legacy_rows.mjs

# Requires explicit flag after Mike approval
node tools/testing/cleanup_orphan_legacy_rows.mjs --confirm-delete
```

## Scenario catalog

`docs/testing/scenarios/` — machine-readable fixtures + README.

## Safety

- Never log `AIRTABLE_API_TOKEN`
- Schmidt Enrollment `recgP9qZYjAhE7NXm` must remain Active and publicly visible
- Do not send uncontrolled emails from these tools

## SC-007 / SC-008 reliability packs

Idempotency + failure-path offline suites and PROD evidence probe:

```bash
node tools/testing/sc-007-008/run-suite.js
node tools/testing/sc-007-008/prod-reliability-evidence.mjs --check-anonymous-s3
```

Runbook: `docs/testing/SC-007-008-RELIABILITY-RUNBOOK.md`
