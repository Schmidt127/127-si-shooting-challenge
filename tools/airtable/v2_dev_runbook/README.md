# V2 DEV execution runbook tooling

Offline-safe fixtures and planners that turn [docs/V2_END_TO_END_TEST_MATRIX.md](../../../docs/V2_END_TO_END_TEST_MATRIX.md) into an executable DEV plan.

**Docs:** [V2_DEV_EXECUTION_RUNBOOK.md](../../../docs/v2/V2_DEV_EXECUTION_RUNBOOK.md) · [V2_LAUNCH_SMOKE_TESTS.md](../../../docs/v2/V2_LAUNCH_SMOKE_TESTS.md)

## Hard stops

- DEV base only: `appTetnuCZlCZdTCT`
- Never target PROD `appn84sqPw03zEbTT`
- No live Airtable writes from these scripts
- Live API/UI runs require Mike named DEV authorization

## Commands

```bash
# Offline fixture + classification suite (no credentials)
node tools/airtable/v2_dev_runbook/run_offline_fixture_suite.js

# Print classified live plan (dry)
node tools/airtable/v2_dev_runbook/print_live_plan.js
node tools/airtable/v2_dev_runbook/print_live_plan.js --smoke-only
node tools/airtable/v2_dev_runbook/print_live_plan.js --mode offline
node tools/airtable/v2_dev_runbook/print_live_plan.js --check-credentials
```

## Layout

| Path | Purpose |
|---|---|
| `matrix-classification.json` | Mode tags + launch_smoke flags for every matrix ID |
| `fixtures/*.json` | Setup / expected / cleanup / rollback per domain |
| `fixture_builders.js` | Source Key + evidence shell helpers |
| `run_offline_fixture_suite.js` | Offline validation suite |
| `print_live_plan.js` | Dry plan printer + credential presence check |

## Domains covered

enrollment · submission_xp · homework_completion · video_feedback · zoom_attendance · zoom_recording · streaks · milestones · perfect_week · weekly_summary · levels_gates · asset_reuse · duplicate_prevention
