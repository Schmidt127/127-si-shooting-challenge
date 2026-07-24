# Production installation packet — Reliability Command Center

**Status:** Ready for Production Installation (repository + MVP views)  
**Airtable Interface:** Designed only — **not installed** by this packet  
**Optional RCC fields / Findings table:** **Deferred**  
**Date:** 2026-07-24  
**Scope:** Shooting Challenge only  
**Authoritative MVP steps:** [MVP-PRODUCTION-RELEASE.md](../reliability-command-center/MVP-PRODUCTION-RELEASE.md)

## Preconditions

- [ ] PR #40 reviewed / merged to `master` (or integration-approved)
- [ ] `node tests/reliability-command-center/run-all.js` PASS
- [ ] Related contract tests PASS (`tests/was-email-contracts`, `tests/homework-contracts`)
- [ ] Mike authorizes Airtable view creation (OMNI in-base)
- [ ] No Team Shot Tracker changes
- [ ] Weekly email ownership unchanged: `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback`
- [ ] PROD confirmed: **072 ON · 074 ON · 118 ON · 119 ON · 074 sendMode=Live**
- [ ] Do **not** disable 118/119 based on older OFF docs

## Files and scripts involved

| Path | Role |
|------|------|
| `lib/reliability-command-center/**` | Health model, helpers, workflow checkers |
| `tools/reliability-command-center/cli.js` | Offline audit runner |
| `tools/reliability-command-center/repair-preview.js` | Dry-run repair preview |
| `tests/reliability-command-center/**` | Fixtures + tests |
| `docs/reliability-command-center/**` | Authoritative docs |
| This checklist | Production steps |

## Proposed new fields

**None for MVP.** Do not create optional `RCC *` formulas or Findings table unless Mike later authorizes.

## Exact minimum Airtable views (create first)

All use **existing PROD fields** — create directly (no helper formulas):

1. **Weekly Email Health** — WAS filter OR(Build, Ready, Send, Sent)
2. **P0 Ready package incomplete** — Ready AND (Subject OR Recipients OR HTML blank)
3. **P0 Send armed not Ready** — Send to Make? AND NOT Ready
4. **P0 Sent / Make writeback mismatch** — Sent XOR Make Sent / still armed

Exact filters + visible fields: [MVP-PRODUCTION-RELEASE.md](../reliability-command-center/MVP-PRODUCTION-RELEASE.md).

Optional day-1 aid: XP Events grouped by `Source Key`.

## Automation changes

**None.** Do not add/enable/disable Airtable automations for RCC v1.  
118/119 remain **ON**.

## Test procedure (repository)

```bash
node tests/reliability-command-center/run-all.js
node tests/was-email-contracts/run-all.js
node tests/homework-contracts/run-all.js

node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/healthy.json

node tools/reliability-command-center/cli.js \
  --fixture tests/reliability-command-center/fixtures/mixed-health.json \
  --output /tmp/rcc-mixed
```

## Controlled production validation (read-only)

1. Export sanitized JSON for at least: Weekly Athlete Summary, Enrollments, Weeks, XP Events (see MVP export format).
2. Strip real PII before any commit.
3. Run CLI `--input` → review P0 list + duplicate-risk findings.
4. Create Views 1–4 in Airtable.
5. **No automatic repairs.** Dry-run preview only with explicit record IDs if proposing fixes.
6. Record evidence (report paths + view names) under deploy notes / operator folder.

## Expected outputs

- `report.json` + `report.md` with P0–P3 counts
- Affected record IDs + retry eligibility
- No live Airtable mutations from CLI

## Rollback procedure

See [ROLLBACK.md](../reliability-command-center/ROLLBACK.md). Delete MVP views if needed. Never clear `Weekly Email Sent?` to force resend.

## Confirm no duplicate XP / unlocks / summaries / emails

After any manual repair: re-export → re-run RCC → zero new duplicate/resend findings attributable to the repair.

## Status gates (SC-147)

| Evidence | Status |
|----------|--------|
| Code + tests in repo | **Built / Tested** *(current)* |
| MVP packet ready | **Ready for Production Installation** |
| Views created in Airtable | **Installed** (do not mark until views exist) |
| CLI on current PROD export + findings reviewed | **Live Tested in PROD** (do not mark until done) |
