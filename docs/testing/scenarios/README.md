# Shooting Challenge — Testing Scenario Catalog

**Created:** 2026-07-24 (Overnight Agent 1 — testing/integrity)  
**Environment:** PROD `appn84sqPw03zEbTT`  
**Controlling doc:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

Machine-readable fixtures for repeatable Schmidt testing. Field names are taken from the PROD schema snapshot `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/` and Automation **115** — do not invent names.

## Index

See [`catalog.json`](./catalog.json) for the machine index.

| ID | File | Type | Status |
|----|------|------|--------|
| SCN-001 | `scn-001-valid-daily-submission.json` | Daily Submission | live_prod_pass_after_reset |
| SCN-002 | `scn-002-daily-submission-dry-run.json` | Daily Submission | live_prod_pass_after_reset |
| SCN-003 | `scn-003-live-daily-submission.json` | Daily Submission | live_prod_pass_after_reset |
| SCN-004 | `scn-004-rerun-same-scenario.json` | Daily Submission | repository_test_pass |
| SCN-005 | `scn-005-duplicate-daily-submission.json` | Daily Submission | live_prod_pass_after_reset |
| SCN-006 | `scn-006-backdated-daily-submission.json` | Daily Submission | blocked (needs prior Week) |
| SCN-007 | `scn-007-zero-shot-submission.json` | Daily Submission | repository_test_pass |
| SCN-008 | `scn-008-missing-enrollment.json` | Daily Submission | repository_test_pass |
| SCN-009 | `scn-009-missing-week.json` | Daily Submission | not_tested |
| SCN-010 | `scn-010-invalid-activity-date.json` | Daily Submission | repository_test_pass |
| SCN-011 | `scn-011-high-shot-boundary.json` | Daily Submission | not_tested |
| SCN-012 | `scn-012-missing-required-shot-field.json` | Daily Submission | repository_test_pass |
| SCN-013 | `scn-013-partial-downstream-failure.json` | Daily Submission | not_tested |
| SCN-014 | `scn-014-retry-after-failure.json` | Daily Submission | not_tested |
| SCN-015 | `scn-015-xp-duplicate-attempt.json` | XP reprocess | live_prod_pass_after_reset (inventory) |
| SCN-016 | `scn-016-was-duplicate-attempt.json` | WAS uniqueness | live_prod_pass_after_reset |
| SCN-017 | `scn-017-invalid-scenario-type.json` | Award Generation | repository_test_pass |
| SCN-018 | `scn-018-disabled-scenario.json` | Daily Submission | decision_needed |
| SCN-019 | `scn-019-scenario-already-running.json` | Daily Submission | not_tested |
| SCN-020 | `scn-020-scenario-with-stale-result-fields.json` | Daily Submission | repository_test_pass |
| SCN-021 | `scn-021-homework-satisfactory-xp.json` | Homework Completion | repository_fixture_ready |
| SCN-022 | `scn-022-homework-duplicate-prevent.json` | Homework Completion | repository_fixture_ready |
| SCN-023 | `scn-023-video-feedback-xp.json` | Video Feedback | repository_fixture_ready |
| SCN-024 | `scn-024-zoom-attendance-xp.json` | Zoom Attendance | repository_fixture_ready |
| SCN-025 | `scn-025-weekly-threshold-xp.json` | Weekly Threshold | repository_fixture_ready |
| SCN-026 | `scn-026-weekly-threshold-duplicate-prevent.json` | Weekly Threshold | repository_fixture_ready |
| SCN-027 | `scn-027-quiz-option-b-completion.json` | Homework Quiz | repository_test_pass |
| SCN-028 | `scn-028-quiz-duplicate-prevent.json` | Homework Quiz | repository_test_pass |
| SCN-029 | `scn-029-weekly-email-retry-after-make-failure.json` | Weekly Email | repository_fixture_ready |
| SCN-030 | `scn-030-weekly-threshold-missing-reward-rule.json` | Weekly Threshold | repository_fixture_ready |
| SCN-031 | `scn-031-weekly-threshold-duplicate-active-rules.json` | Weekly Threshold | repository_fixture_ready |
| SCN-032 | `scn-032-weekly-threshold-inactive-enrollment-skip.json` | Weekly Threshold | repository_fixture_ready |
| SCN-033 | `scn-033-weekly-threshold-legacy-xp-dedupe.json` | Weekly Threshold | repository_fixture_ready |
| SCN-034 | `scn-034-perfect-week-dst-boundary.json` | Perfect Week | repository_fixture_ready |
| SCN-035 | `scn-035-perfect-week-future-date-rejection.json` | Perfect Week | repository_fixture_ready |
| SCN-036 | `scn-036-perfect-week-duplicate-day-submissions.json` | Perfect Week | repository_fixture_ready |
| SCN-037 | `scn-037-homework-multi-asset-single-completion.json` | Homework Completion | repository_fixture_ready |
| SCN-038 | `scn-038-homework-partial-processing-recovery.json` | Homework Completion | repository_fixture_ready |
| SCN-039 | `scn-039-weekly-email-malformed-webhook-response.json` | Weekly Email | repository_fixture_ready |
| SCN-040 | `scn-040-weekly-email-duplicate-success-callback.json` | Weekly Email | repository_fixture_ready |
| SCN-041 | `scn-041-weekly-email-contradictory-sent-state.json` | Weekly Email | repository_fixture_ready |
| SCN-042 | `scn-042-lookup-array-normalization.json` | Data Integrity | repository_test_pass |
| SCN-043 | `scn-043-stale-week-link-mismatch.json` | Data Integrity | repository_fixture_ready |

**Note:** SCN-021–026 PR #43; SCN-027–028 PR #44 quiz Option B; SCN-029 PR #46 weekly-email retry; SCN-030–043 Agent 1 hardening wave 2026-07-27.

## Known live records

| Role | Record ID |
|------|-----------|
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Schmidt Athlete | `recgqVstObQRzgXJF` |
| Seed Testing Scenario | `recPdyfYRFgDtpzQ8` |
| Foundation Week | `recVDKiYATgzsfpmE` |
| 115 live Submission | `recuuTBgstSTGg2E3` |
| Submission Base XP | `recOodD23MQrP1O9F` |
| Schmidt WAS | `rechWp330MqSgRWzN` |

## Fixture schema (common keys)

Each JSON file includes:

- `scenario_id`, `name`, `type`, `description`
- `related_sc_items`
- `prerequisites`, `safe_environment`, `enrollment`
- `input_fields` (exact Airtable field names)
- `expected_created_records`, `expected_links`
- `expected_xp_source`, `expected_xp_amount`
- `expected_dedupe_key_pattern`
- `expected_result_status`
- `prohibited_side_effects`
- `safe_rerun_behavior`, `cleanup_instructions`
- `manual_requirements`
- `current_automation_support`, `test_status`

## Regenerate

```bash
# Preferred: index all scn-*.json fixtures (includes SCN-027+)
node tools/testing/validate-scenario-catalog.js --write
node tools/testing/validate-scenario-catalog.js

# Legacy generator (SCN-001–026 only) — do not use alone after SCN-027+
# node docs/testing/scenarios/_generate_catalog.mjs
```

## Verify expected vs actual

```bash
# Offline fixture (known live 115 bundle)
node tools/testing/verify_scenario.mjs --fixture tools/testing/fixtures/live-115-bundle.json

# Live PROD read-only
node tools/testing/verify_scenario.mjs --live --scenario recPdyfYRFgDtpzQ8
```

## Related docs

- `docs/overnight/testing-integrity/CURRENT-PROD-BASELINE.md`
- `docs/overnight/testing-integrity/AUTOMATION-115-AUDIT.md`
- `docs/overnight/testing-integrity/XP-IDEMPOTENCY-AUDIT.md`
- `tools/testing/README.md`
