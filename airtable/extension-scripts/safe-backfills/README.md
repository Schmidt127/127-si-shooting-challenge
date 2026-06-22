# Safe Backfill Extension Scripts

Controlled Airtable extension scripts to **repair or backfill** data after audits or schema changes. Always ship with dry-run mode and explicit write gates.

## Purpose

When audits find gaps (missing XP Events, unset flags, incomplete weekly summaries), backfill scripts apply fixes in small, logged batches—not bulk destructive edits.

## Safety Rules

1. **Dry-run first** — Every script defaults to reporting planned changes only.
2. **Explicit confirm flag** — e.g. `CONFIRM_WRITE = false` must be set true manually for writes.
3. **Batch limits** — Cap records per run (e.g. 50); re-run until complete.
4. **Dedupe keys** — Use same keys as production automations ([field-map.md](../../schema/current/field-map.md)).
5. **No deletes** — Backfills create or update; deletions are manual with recovery doc.
6. **Log everything** — Record IDs and before/after values in script output.

## Planned Scripts

| Script file | Use case |
|-------------|----------|
| `backfill-xp-event-weekly-summary-links.js` | Link orphan XP Events to Weekly Athlete Summary when Enrollment + Week match |
| `dedupe-zoom-meeting-xp-events.js` | Remove duplicate Zoom attendance XP Events after Automation 101 re-run |
| `backfill-xp-from-submissions.js` | Create missing XP Events for submissions with `XP Awarded` false |
| `backfill-homework-xp.js` | Award XP for reviewed homework without events |
| `backfill-weekly-summary-records.js` | Generate missing Weekly Summary rows for a week |
| `reset-idempotency-flag.js` | Careful reset of flags after failed automation (manual approval only) |

## Runbook

1. Run relevant **audit** script; save output.
2. Run matching **backfill** in dry-run; verify planned changes.
3. Set `CONFIRM_WRITE = true` on a small batch.
4. Re-run audit.
5. Update `CHANGELOG.md` with date, scope, and record counts.

## When Not to Use Backfills

- Widespread logic bugs in live automations — **fix automation first**, then backfill.
- Suspected duplicate Make emails — fix scenario idempotency before resetting `Email Sent` flags.

## Related

- [Audits](../audits/README.md)
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
- [Submission → XP flow](../../../docs/data-flow/submission-to-xp-flow.md)
