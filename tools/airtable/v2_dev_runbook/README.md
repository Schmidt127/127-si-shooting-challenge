# V2 DEV execution runbook tooling

Offline-safe fixtures plus a **safe operator CLI** that turns [docs/V2_END_TO_END_TEST_MATRIX.md](../../../docs/V2_END_TO_END_TEST_MATRIX.md) into one-scenario-at-a-time DEV smoke execution.

**Docs:** [V2_DEV_EXECUTION_RUNBOOK.md](../../../docs/v2/V2_DEV_EXECUTION_RUNBOOK.md) · [V2_LAUNCH_SMOKE_TESTS.md](../../../docs/v2/V2_LAUNCH_SMOKE_TESTS.md)

## Hard stops

- DEV base only: `appTetnuCZlCZdTCT`
- Never target PROD `appn84sqPw03zEbTT`
- Default **dry-run** — Airtable writes require `--dev-confirm` **and** `--execute`
- Tokens are never printed
- Make/email scenarios are **not** implemented in the CLI yet
- Live writes require Mike named DEV authorization (human gate; flags alone are not permission)

## Operator CLI (Mike / Desktop Lead)

```bash
# Help
node tools/airtable/v2_dev_runbook/cli.js help

# List / plan
node tools/airtable/v2_dev_runbook/cli.js list
node tools/airtable/v2_dev_runbook/cli.js list --smoke-only
node tools/airtable/v2_dev_runbook/cli.js plan --smoke-only

# Offline contracts (no Airtable)
node tools/airtable/v2_dev_runbook/cli.js run-offline

# Env check (requires --dev-confirm; never prints token)
# In tools/airtable/.env set:
#   AIRTABLE_TOKEN=pat...
#   BASE_ID=appTetnuCZlCZdTCT
node tools/airtable/v2_dev_runbook/cli.js verify-env --dev-confirm

# Dry-run one supported live scenario (default — no writes)
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --enrollment recXXXXXXXX

# Execute write path ONLY after Mike authorization
node tools/airtable/v2_dev_runbook/cli.js run-test A3 --dev-confirm --execute --enrollment recXXXXXXXX --operator Mike

# Evidence + cleanup (owned records only)
node tools/airtable/v2_dev_runbook/cli.js collect-evidence A3 --dev-confirm --result pass --notes "Week linked"
node tools/airtable/v2_dev_runbook/cli.js cleanup A3 --dev-confirm --rollback-only
node tools/airtable/v2_dev_runbook/cli.js cleanup A3 --dev-confirm --rollback-only --execute

# Local status
node tools/airtable/v2_dev_runbook/cli.js status
```

### Initial live-supported tests

`A3` · `B1` · `B2` · `F1` · `F2` · `F3`

Recommended order: **A3 → B1 → B2 → F1 → F2 → F3**

### Evidence output

`docs/v2/evidence/dev-runs/<YYYY-MM-DD>/<TEST-ID>.md`

### Run-state (local, gitignored)

`tools/airtable/v2_dev_runbook/.run-state/` — ownership proof for cleanup. Shared fixtures are never deleted.

## Offline suite (no CLI)

```bash
node tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js
node tools/airtable/v2_dev_runbook/print_live_plan.js --smoke-only --check-credentials
node tools/airtable/v2_dev_runbook/cli.test.js
```

## Layout

| Path | Purpose |
|---|---|
| `cli.js` | Operator CLI entrypoint |
| `cli.test.js` | Safety unit/integration tests |
| `lib/safety.js` | DEV base / flag / token guards |
| `lib/env_verify.js` | verify-env checks |
| `lib/run_state.js` | Owned-record run-state |
| `lib/evidence.js` | Evidence markdown writer |
| `lib/airtable_client.js` | DEV-only REST client |
| `lib/scenarios.js` | A3/B1/B2/F1–F3 handlers |
| `matrix-classification.json` | Mode tags + launch_smoke flags |
| `fixtures/*.json` | Setup / expected / cleanup / rollback per domain |
| `run_offline_fixture_suite.js` | Offline validation suite |
| `print_live_plan.js` | Legacy dry plan printer |

## Domains covered (fixtures)

enrollment · submission_xp · homework_completion · video_feedback · zoom_attendance · zoom_recording · streaks · milestones · perfect_week · weekly_summary · levels_gates · asset_reuse · duplicate_prevention
