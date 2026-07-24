# Shooting Challenge Testing Tools

Read-only verification and offline harnesses for Automation **115** and XP/WAS integrity.

## Agent 4 QC suite (contracts + weekly email Live/Test regression)

Inventory, coverage matrix, release/rollback checklists:
`docs/testing/agent4-qc/`

```bash
node tools/testing/run-agent4-suite.js
```

## Offline tests (no Airtable)

```bash
node --test tools/testing/tests/
```

Includes:

- `test_115_offline.mjs` — runs the **real** `115-*.js` script under mocks (14 tests)
- `test_expected_actual.mjs` — expected-versus-actual verifier (7 tests)
- `test_117_offline.mjs` — Stage 17 orchestrator offline suite (separate owner area)

## Expected-versus-actual verifier

Library: `lib/expected_actual.js`  
CLI: `verify_scenario.mjs`

```bash
# Offline known live bundle
node tools/testing/verify_scenario.mjs --fixture tools/testing/fixtures/live-115-bundle.json

# Live PROD read-only (uses web/.env.local AIRTABLE_API_TOKEN)
node tools/testing/verify_scenario.mjs --live --scenario recPdyfYRFgDtpzQ8
```

Statuses: `PASS` | `FAIL` | `BLOCKED` | `NOT_TESTED` | `MANUAL_REQUIRED`

The verifier **never writes** to Airtable.

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

`docs/testing/scenarios/` — 20 machine-readable fixtures + README.

## Safety

- Never log `AIRTABLE_API_TOKEN`
- Schmidt Enrollment `recgP9qZYjAhE7NXm` must remain Active and publicly visible
- Do not send uncontrolled emails from these tools
