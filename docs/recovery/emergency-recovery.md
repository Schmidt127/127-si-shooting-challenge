# Emergency Recovery

Runbook for **production incidents** in the 127 SI Shooting Challenge (Airtable + Make). Calm, ordered steps—fix forward, document everything.

## Severity Guide

| Level | Examples | First action |
|-------|----------|--------------|
| S1 | Wrong XP mass-awarded, emails to wrong parents | Pause automations & Make scenarios |
| S2 | Single automation failing, backlog of submissions | Disable one automation; manual XP queue |
| S3 | Audit warnings, non-blocking formula glitch | Schedule fix; dry-run audits |

## Immediate Steps (S1 / S2)

1. **Pause** — Turn off affected Airtable automation(s) and Make scenario(s). Note time and who paused.
2. **Scope** — Identify tables: Submissions, XP Events, Homework, Weekly Summaries.
3. **Communicate** — Notify coaches/ops; defer parent emails if email scenario is involved.
4. **Preserve evidence** — Export affected views to CSV from Airtable; screenshot automation run history.

## Common Incidents

### Duplicate XP Events

- **Detect:** Audit script [audits](../../airtable/extension-scripts/audits/README.md) (`audit-xp-vs-submissions`)
- **Fix:** Do not delete without review. Create adjusting XP Events (negative points) or manual correction per ops policy.
- **Prevent:** Verify dedupe keys in shooting-challenge script; redeploy from GitHub.

### Automation Loop / Rate Limit

- **Detect:** Airtable automation errors, duplicate field flips
- **Fix:** Disable automation; fix trigger conditions; test on one record
- **Prevent:** Architecture review — no script writing fields that re-trigger same condition

### Make Email Storm

- **Detect:** Parents report duplicate weekly emails
- **Fix:** Stop scenario; clear erroneous `Email Sent` only after root cause fixed
- **Prevent:** Idempotent `eventId`; filter module in Make

### Missing Submissions / XP Gap

- **Detect:** Athlete reports missing XP; audit shows submission without event
- **Fix:** [Safe backfill](../../airtable/extension-scripts/safe-backfills/README.md) dry-run then small batch
- **Prevent:** Re-enable automation after script fix

## Recovery Workflow

```
Pause → Diagnose (audit dry-run) → Fix root cause (GitHub → deploy)
    → Backfill if needed (CONFIRM_WRITE) → Re-run audit → Re-enable automations
    → CHANGELOG + incident note
```

## GitHub & Cursor

- Restore scripts from last known good commit
- Compare [schema snapshots](../../airtable/schema/snapshots/) if schema drift suspected
- Use ChatGPT to review fix diff before redeploy

## Schema Rollback

Airtable has no full base rollback. Options:

- Restore fields from snapshot notes
- Re-import CSV backup if available
- Manual field revert with change log

## Post-Incident

| Task | Owner |
|------|-------|
| Update CHANGELOG.md | |
| Update automation-trigger-map if triggers changed | |
| Add audit case if new failure mode | |
| Schedule architecture review if S1 | |

## Contacts

| Role | Contact |
|------|---------|
| Airtable admin | *(fill in)* |
| Make admin | *(fill in)* |
| Program lead | *(fill in)* |

## Related

- [Weekly maintenance checklist](../checklists/weekly-maintenance-checklist.md)
- [Architecture review](../architecture/architecture-review.md)
