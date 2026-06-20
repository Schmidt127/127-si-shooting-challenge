# Weekly Summary Flow

How **weekly athlete summaries** are built, stored, and emailed to parents.

## Overview

```
Scheduled trigger (Airtable or Make)
    → Select active athletes (view filter)
    → Aggregate week stats (submissions, XP, homework, streak)
    → Create/update Weekly Summary record
    → Make: format email → Gmail to parent
    → Set Email Sent on summary record
```

## Tables

- **Weekly Summaries** — one row per athlete per week ([field-map.md](../../airtable/schema/current/field-map.md))
- **Athletes** — parent email, enrollment status
- **Submissions / XP Events** — source data for rollups

## Week Boundary

Document the canonical week start (e.g. Monday 00:00 America/New_York). All automations and Make filters must use the same definition.

| Setting | Value |
|---------|-------|
| Week starts | *(e.g. Monday)* |
| Timezone | *(fill in)* |
| Season active dates | Config table |

## Build Phase (Airtable)

Options:

1. **Scheduled automation** — loops active athletes, writes Weekly Summary fields
2. **Make scheduled scenario** — queries Airtable, creates summary records

Aggregates typically include:

- Submission count and total makes
- XP earned in week
- Homework completed count
- Current streak / level highlight

## Send Phase (Make)

1. Trigger: webhook when summary row ready, or scheduled scan of unsent rows
2. Module: Gmail with HTML from `{Summary Text}` or template
3. Idempotency: skip if `{Email Sent}` true; set true after successful send
4. Payload: see [weekly-summary sample](../../make/test-payloads/README.md)

## Parent Experience

- Email from configured Gmail account
- Unsubscribe / support contact documented in Make template
- No real PII in GitHub test payloads

## Failure Modes

| Symptom | Action |
|---------|--------|
| Summary row exists, no email | Check Make ops; verify parent email |
| Duplicate emails | Strengthen `eventId` + Email Sent guard |
| Missing athletes | Review active enrollment view filter |
| Wrong totals | Audit rollups vs raw submissions/XP Events |

## Verification

- [ ] Test athlete receives one email per week
- [ ] Audit weekly summaries script (dry-run)
- [ ] [Weekly maintenance checklist](../checklists/weekly-maintenance-checklist.md)

## Related

- [architecture-review.md](../architecture/architecture-review.md)
- [Emergency recovery](../recovery/emergency-recovery.md)
