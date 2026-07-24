# Challenge-Year Engine + Season Launch Control System

**Status:** Built in Repository (2026-07-24) — not live-installed  
**Scope:** Shooting Challenge only (not Team Shot Tracker)  
**Timezone:** America/Denver  

This package makes each new Shooting Challenge year safer and repeatable: generate Weeks, validate Config/Enrollment/WAS/XP season boundaries, audit automations, and run a fail-closed Season Launch lifecycle through activation and rollback.

## What it is

| Layer | Path |
|-------|------|
| Pure engine | [`lib/challenge-year/`](../../lib/challenge-year/) |
| CLI | [`tools/challenge-year/cli.js`](../../tools/challenge-year/cli.js) |
| Tests | [`tests/challenge-year/`](../../tests/challenge-year/) |
| Dry-run Airtable helpers | `airtable/extension-scripts/audits/preview-challenge-year-*.js`, `preview-season-launch-*.js`, `preview-cross-season-xp-risks.js`, `preview-stale-email-flags.js` |
| Extends | [`lib/config-selection`](../../lib/config-selection/), [`tools/enrollment-season`](../../tools/enrollment-season/), [`lib/was-email-contracts`](../../lib/was-email-contracts/), [`lib/reliability-command-center`](../../lib/reliability-command-center/) |

## Docs in this folder

| Doc | Purpose |
|-----|---------|
| [SEASON-LAUNCH-CONTROL.md](./SEASON-LAUNCH-CONTROL.md) | **Start here** — lifecycle, CLI, operator Q&A |
| [AUTOMATION-SEASON-AUDIT.md](./AUTOMATION-SEASON-AUDIT.md) | Season-sensitive automation inventory + hard-code policy |
| [CHALLENGE-YEAR-CONTRACT.md](./CHALLENGE-YEAR-CONTRACT.md) | Config contract: verified vs proposed fields |
| [WEEK-CONTRACT.md](./WEEK-CONTRACT.md) | Week labels, keys, Sunday–Saturday rules |
| [ANNUAL-ROLLOVER.md](./ANNUAL-ROLLOVER.md) | Preflight + manifest architecture |
| [ACTIVATION-RUNBOOK.md](./ACTIVATION-RUNBOOK.md) | Full annual activation checklist |
| [FILLOUT-SEASON-ACTIVATION.md](./FILLOUT-SEASON-ACTIVATION.md) | Fillout routing package + attestations |
| [MAKE-SEASON-ACTIVATION.md](./MAKE-SEASON-ACTIVATION.md) | Make routing; preserve Bulk Email May 18 |
| [WEB-SEASON-ACTIVATION.md](./WEB-SEASON-ACTIVATION.md) | Next.js `/shoot` season filters |
| [SOFTR-SEASON-ACTIVATION.md](./SOFTR-SEASON-ACTIVATION.md) | **Obsolete / Historical Reference Only** — Softr not used |
| [SEASON-LAUNCH-DASHBOARD-VIEWS.md](./SEASON-LAUNCH-DASHBOARD-VIEWS.md) | Airtable views (coord. with RCC) |
| [SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md](./SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md) | Controlled PROD test matrix |
| [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md) | Activation go-live |
| [ROLLBACK-CHECKLIST.md](./ROLLBACK-CHECKLIST.md) | Abort / restore |
| [FIELD-OWNERSHIP.md](./FIELD-OWNERSHIP.md) | Challenge-year field ownership notes |
| Installation packets | [`../deploy-checklists/challenge-year-rollover-installation-packet.md`](../deploy-checklists/challenge-year-rollover-installation-packet.md), [`../deploy-checklists/season-launch-control-installation-packet.md`](../deploy-checklists/season-launch-control-installation-packet.md) |

## Quick commands

```bash
# Full week import package
node tools/challenge-year/cli.js generate-week-package \
  --challenge-year 2027-2028 \
  --week-zero-start 2027-05-30 \
  --regular-weeks 8 \
  --output tmp/weeks-2027-2028

# Season launch gate
node tools/challenge-year/cli.js launch-preflight \
  --config tests/fixtures/challenge-year/launch-preflight-pass.json

# Activation / rollback dry-run
node tools/challenge-year/cli.js activation-preview --config <recId> --input <export.json>
node tools/challenge-year/cli.js rollback-preview --config <recId> --input <export.json>

# Automation hard-code audit
node tools/challenge-year/cli.js audit-automations

# Tests
node tests/challenge-year/challenge-year-engine.test.js
node tests/challenge-year/season-launch-control.test.js
```

## Hard rules

- Never silently pick the first Config when multiple qualify.
- Never hard-code a permanent current year (e.g. 2026–2027).
- Never auto-delete WAS / historical links.
- Preserve `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback`.
- Do not disable 118/119 merely because older docs said OFF (abort-only).
- Airtable helpers are admin-run, dry-run only, require explicit Config ID + year label.
- Do not claim live installation unless it occurred.
- No Team Shot Tracker inactivity / coach-digest features.
