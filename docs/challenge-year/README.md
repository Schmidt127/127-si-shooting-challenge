# Challenge-Year Configuration and Season Rollover Engine

**Status:** Built in Repository (2026-07-24) — not live-installed  
**Scope:** Shooting Challenge only (not Team Shot Tracker)  
**Timezone:** America/Denver  

This package makes each new Shooting Challenge year safer and repeatable without depending on ad-hoc Airtable setup.

## What it is

| Layer | Path |
|-------|------|
| Pure engine | [`lib/challenge-year/`](../../lib/challenge-year/) |
| CLI | [`tools/challenge-year/cli.js`](../../tools/challenge-year/cli.js) |
| Tests | [`tests/challenge-year/`](../../tests/challenge-year/) |
| Dry-run Airtable helpers | `airtable/extension-scripts/audits/preview-challenge-year-*.js` |
| Extends | [`lib/config-selection`](../../lib/config-selection/), [`tools/enrollment-season`](../../tools/enrollment-season/), [`lib/was-email-contracts`](../../lib/was-email-contracts/) |

## Docs in this folder

| Doc | Purpose |
|-----|---------|
| [CHALLENGE-YEAR-CONTRACT.md](./CHALLENGE-YEAR-CONTRACT.md) | Config contract: verified vs proposed fields |
| [WEEK-CONTRACT.md](./WEEK-CONTRACT.md) | Week labels, keys, Sunday–Saturday rules |
| [ANNUAL-ROLLOVER.md](./ANNUAL-ROLLOVER.md) | Preflight + manifest architecture |
| [ACTIVATION-RUNBOOK.md](./ACTIVATION-RUNBOOK.md) | Full annual activation checklist |
| [FIELD-OWNERSHIP.md](./FIELD-OWNERSHIP.md) | Challenge-year field ownership notes |
| Installation packet | [`../deploy-checklists/challenge-year-rollover-installation-packet.md`](../deploy-checklists/challenge-year-rollover-installation-packet.md) |

## Quick commands

```bash
# Generate Week plan (JSON + CSV + Markdown + validation)
node tools/challenge-year/cli.js generate-weeks \
  --challenge-year 2027-2028 \
  --week-zero-start 2027-05-30 \
  --regular-weeks 8 \
  --output tmp/weeks-2027-2028

# Preflight
node tools/challenge-year/cli.js preflight \
  --config tests/fixtures/challenge-year/rollover-preflight-pass.json

# Manifest (JSON + Markdown checklist + Airtable Weeks CSV)
node tools/challenge-year/cli.js manifest \
  --config tests/fixtures/challenge-year/rollover-preflight-pass.json \
  --output tmp/rollover-2027-2028

# Tests
node tests/challenge-year/challenge-year-engine.test.js
```

## Hard rules

- Never silently pick the first Config when multiple qualify.
- Never hard-code a permanent current year (e.g. 2026–2027).
- Never auto-delete WAS / historical links.
- Airtable helpers are admin-run, dry-run only, require explicit Config ID + year label.
- Do not claim live installation unless it occurred.
