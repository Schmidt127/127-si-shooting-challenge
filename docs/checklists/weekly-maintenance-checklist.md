# Weekly Maintenance Checklist

Recurring ops tasks for the shooting challenge season. Run weekly (e.g. Sunday evening before summary emails).

## Airtable Health

- [ ] Confirm shooting-challenge automation is **on** and last runs succeeded
- [ ] Spot-check 3 random submissions: XP Event exists, `{XP Awarded}` set
- [ ] Review homework view: nothing stuck in Submitted > 7 days
- [ ] Active athletes view matches expected enrollment count

## Audits (Dry-Run)

Run extension scripts from [audits](../../airtable/extension-scripts/audits/README.md):

- [ ] XP vs submissions
- [ ] Homework XP parity
- [ ] Weekly summary coverage (prior week)
- [ ] Athlete rollup sanity (optional)

Log counts; investigate any non-zero issues before enabling writes.

## Weekly Summaries

Per [weekly-summary-flow.md](../data-flow/weekly-summary-flow.md):

- [ ] Week boundary and timezone correct for new week
- [ ] Summary build automation/scenario completed
- [ ] Make email scenario sent; sample check one parent email
- [ ] `{Email Sent}` set on all summary rows for prior week

## Make.com

- [ ] Scenarios ON: homework Drive, weekly email, critical webhooks
- [ ] No error backlog in Make execution history
- [ ] Blueprint exports in GitHub match production (if scenarios changed)

## GitHub / Documentation

- [ ] Production script changes committed this week reflected in repo
- [ ] `CHANGELOG.md` updated for any deploy
- [ ] Schema notes updated if fields changed

## Seasonal

- [ ] Levels/XP thresholds still match program rules
- [ ] Coach/parent contact fields valid (bounce check if available)

## Sign-Off

| Week of | Completed by | Issues | Follow-up |
|---------|--------------|--------|-----------|
| | | | |

## Escalation

If audits show widespread issues, follow [emergency-recovery.md](../recovery/emergency-recovery.md) before bulk backfills.
