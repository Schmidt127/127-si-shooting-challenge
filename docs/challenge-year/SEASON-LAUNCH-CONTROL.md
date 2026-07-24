# Season Launch Control System

**Status:** Built in Repository (2026-07-24) — not live-installed  
**Scope:** Shooting Challenge only (not Team Shot Tracker)  
**Timezone:** America/Denver  
**Front end:** Next.js `/shoot` — **Softr is Obsolete / Not Used**  
**Extends:** Challenge-Year Rollover Engine + Reliability Command Center (season findings boundary)

This is the operator-facing control plane for preparing, validating, activating, and rolling back a new Shooting Challenge year with fail-closed checks.

## Active systems

Airtable PROD · Airtable automations · Fillout · Make.com · Gmail · Google Drive/storage/Lambda (where applicable) · Next.js `/shoot` · GitHub · testing/rollback tooling

## Operator questions answered

| Question | How |
|----------|-----|
| Is the new challenge year fully configured? | `launch-preflight` + Config export validator |
| Are all Week records correct? | Week package + Week/export validators |
| Are forms pointing to the correct Config? | [FILLOUT-SEASON-ACTIVATION.md](./FILLOUT-SEASON-ACTIVATION.md) |
| Are automations processing the correct year? | `audit-automations` + [AUTOMATION-SEASON-AUDIT.md](./AUTOMATION-SEASON-AUDIT.md) |
| Are weekly emails targeting the correct Week? | Week End Key map + 118/119 verification steps |
| Are XP and achievements using the correct Enrollment? | Export validators + cross-season XP preview |
| Are old-season records excluded? | Enrollment/WAS/XP validators |
| Is `/shoot` showing the intended season? | [WEB-SEASON-ACTIVATION.md](./WEB-SEASON-ACTIVATION.md) |
| Are Test and Live settings correct? | Launch state + 074 sendMode rules |
| Can the new season safely be activated? | `activation-preview` + Approved for Live gate |
| What exactly will change when activation occurs? | Activation preview JSON/Markdown |
| How can activation be rolled back? | `rollback-preview` + [ROLLBACK-CHECKLIST.md](./ROLLBACK-CHECKLIST.md) |

## Lifecycle states

```
Draft → Dates Pending → Weeks Generated → Weeks Imported → Config Validated
  → Forms Updated → Automations Validated → Make Validated → Web Validated
  → Test Ready → Test Passed → Approved for Live → Live
  ↔ Paused → Closed
Any non-Draft → Rolled Back / Blocking Error (per transition table)
```

Contract: `lib/challenge-year/launch-state.js`  
Obsolete alias: `Softr Validated` → `Web Validated`

| Transition target | Required checks (repository) |
|-------------------|------------------------------|
| Dates Pending | new_config_dates_present, week_zero_sunday, regular_week_count |
| Weeks Generated | week_plan_validation_pass, canonical_week_codes |
| Weeks Imported | weeks_present_in_export, no_week_gaps_overlaps |
| Config Validated | exactly_one_target_config, no_multiple_active_configs |
| Forms Updated | fillout_checklist_complete |
| Automations Validated | automation_hardcode_audit_pass, season_sensitive_automations_reviewed |
| Make Validated | make_checklist_complete, weekly_email_scenario_preserved |
| Web Validated | web_checklist_complete |
| Test Ready | schmidt_test_plan_ready, test_mode_gates_documented |
| Test Passed | schmidt_controlled_tests_pass |
| Approved for Live | preflight_pass, mike_operational_approval |
| Live | activation_evidence_recorded, single_current_config |

**Test Mode cannot transition to Live.**

## Proposed Config fields (not auto-created)

See `PROPOSED_LAUNCH_FIELDS` in `launch-state.js`. **Mike must authorize schema create.**

## CLI

```bash
node tools/challenge-year/cli.js launch-status --input <export-or-launch.json>
node tools/challenge-year/cli.js launch-preflight --config <recId> --input <export.json>
node tools/challenge-year/cli.js launch-manifest --config <recId> --output <folder>
node tools/challenge-year/cli.js activation-preview --config <recId> --input <export.json>
node tools/challenge-year/cli.js rollback-preview --config <recId> --input <export.json>
node tools/challenge-year/cli.js generate-week-package --challenge-year YYYY-YYYY --week-zero-start YYYY-MM-DD --regular-weeks N --output <folder>
node tools/challenge-year/cli.js validate-export --input <export.json>
node tools/challenge-year/cli.js audit-automations
```

Every launch command exits with **PASS**, **PASS WITH WARNINGS**, or **FAIL**, and writes JSON + Markdown (CSV where useful).

## Packages

| Package | Doc |
|---------|-----|
| Fillout | [FILLOUT-SEASON-ACTIVATION.md](./FILLOUT-SEASON-ACTIVATION.md) |
| Make | [MAKE-SEASON-ACTIVATION.md](./MAKE-SEASON-ACTIVATION.md) |
| Website `/shoot` | [WEB-SEASON-ACTIVATION.md](./WEB-SEASON-ACTIVATION.md) |
| Softr | [SOFTR-SEASON-ACTIVATION.md](./SOFTR-SEASON-ACTIVATION.md) — **Obsolete / Historical Reference Only** |
| Dashboard views | [SEASON-LAUNCH-DASHBOARD-VIEWS.md](./SEASON-LAUNCH-DASHBOARD-VIEWS.md) |
| Schmidt tests | [SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md](./SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md) |
| Go-live | [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md) |
| Rollback | [ROLLBACK-CHECKLIST.md](./ROLLBACK-CHECKLIST.md) |
| Install packet | [`../deploy-checklists/season-launch-control-installation-packet.md`](../deploy-checklists/season-launch-control-installation-packet.md) |

## RCC integration (no fork)

Season Launch does **not** vendor Reliability Command Center.

`lib/challenge-year/season-findings.js` emits portable season findings and, when `lib/reliability-command-center` is present on master (PR #40), maps them through the canonical RCC `buildIssue` contract. This PR carries only season-specific finding codes (multiple active Configs, Week gaps, cross-season Enrollment/WAS/XP, stale send flags).

## Hard rules

- Fail closed on multiple active Configs or overlapping dates.
- Never hard-code a permanent current year in production scripts.
- Never auto-delete WAS / historical links.
- Preserve `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback`.
- Do not disable 118/119 merely because older docs said OFF (abort-only).
- Softr is not an active dependency — do not block launch on Softr.
- No Team Shot Tracker inactivity / coach-digest features.
