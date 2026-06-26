# Weekly Maintenance Checklist

Recurring ops tasks for the shooting challenge season. Run weekly (e.g. Sunday evening before summary emails).

## Airtable health

- [ ] Confirm shooting-challenge automations are **on** and last runs succeeded (spot-check Airtable automation history)
- [ ] Spot-check 3 random submissions: XP Event exists, award status set
- [ ] Review homework view: nothing stuck in Submitted > 7 days
- [ ] Active athletes view matches expected enrollment count

## Audits (dry-run) — Stages A–J order

Run extension scripts from [audits README](../../airtable/extension-scripts/audits/README.md). **Log counts; investigate non-zero issues before any writes.**

Recommended weekly subset (fast):

- [ ] **B** — `audit-xp-vs-submissions.js`
- [ ] **F** — `audit-homework-pipeline-integrity.js`
- [ ] **G** — `audit-video-pipeline-integrity.js`
- [ ] **H** — `audit-video-xp-pipeline-integrity.js`

Monthly or after bulk changes — full pass **A → J**:

| Stage | Audit script |
|-------|--------------|
| A | `audit-submission-pipeline-integrity.js` |
| B | `audit-xp-vs-submissions.js` |
| C | `audit-submission-pipeline-integrity.js`, `audit-orphan-xp-events.js` |
| D | `audit-submission-pipeline-integrity.js` |
| E | `audit-homework-completion-upload-edge-cases.js`, `audit-stuck-upload-processing.js` |
| F | `audit-homework-pipeline-integrity.js` |
| G | `audit-video-pipeline-integrity.js` |
| H | `audit-video-xp-pipeline-integrity.js` |
| I | `audit-achievement-xp-pipeline-integrity.js`, `audit-pending-shot-milestone-unlocks.js` |
| J | `audit-field-coverage-report.js`, `audit-legacy-cleanup-candidates.js` |

Backfill only after audit identifies issues: [safe-backfills README](../../airtable/extension-scripts/safe-backfills/README.md)

## Weekly summaries

Per [weekly-summary-flow.md](../data-flow/weekly-summary-flow.md):

- [ ] Week boundary and timezone correct for new week (America/Denver)
- [ ] Summary build automation (072) / chain completed
- [ ] Make email scenario (074) sent; sample check one parent email
- [ ] Weekly email sent flag set on all summary rows for prior week

## Make.com

- [ ] Scenarios ON: upload asset engine (070a/070b), weekly email (074), critical webhooks (071, 073)
- [ ] No error backlog in Make execution history
- [ ] Blueprint exports in GitHub match production (if scenarios changed)

## Web / Vercel

- [ ] `GET /shoot/api/airtable` returns `configured: true` on production
- [ ] Spot-check leaderboard and one catalog page after any deploy

## GitHub / documentation

- [ ] Production script changes committed this week reflected in repo
- [ ] `CHANGELOG.md` updated for any deploy
- [ ] [PROJECT_STATE.md](../PROJECT_STATE.md) updated if audit status or env changed
- [ ] Schema notes updated if fields changed

## Seasonal

- [ ] Levels/XP thresholds still match program rules
- [ ] Coach/parent contact fields valid (bounce check if available)

## Sign-off

| Week of | Completed by | Issues | Follow-up |
|---------|--------------|--------|-----------|
| | | | |

## Escalation

If audits show widespread issues, follow [emergency-recovery.md](../recovery/emergency-recovery.md) before bulk backfills.
