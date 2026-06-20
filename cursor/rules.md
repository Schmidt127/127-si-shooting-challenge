# Cursor Rules — 127 SI Shooting Challenge

Project-specific guidance for AI-assisted editing in Cursor. This is a **youth basketball Airtable app**, not a robotics project.

## Project Identity

- **App:** 127 Sports Intensity Shooting Challenge
- **Stack:** Airtable (production), Make.com (Drive/Gmail/webhooks), GitHub (source of truth), ChatGPT (review), Cursor (local edit)
- **Domain:** Athletes, submissions, XP Events, levels, streaks, homework, video feedback, Zoom attendance, weekly summaries, parent/coach email

## Do Not Confuse With

- Team Shot Tracker (separate repo)
- Robotics / FRC / hardware projects

## File Layout

| Path | Purpose |
|------|---------|
| `airtable/schema/current/` | Live schema notes, table/field/automation maps |
| `airtable/automations/` | Native automation scripts |
| `airtable/extension-scripts/` | Audit and safe-backfill extensions |
| `airtable/formulas/` | Formula documentation |
| `make/` | Blueprints, docs, test payloads |
| `docs/` | Architecture, data flows, recovery, checklists |

## Editing Rules

1. **Do not rewrite** `README.md`, `CHANGELOG.md`, or `SYSTEM_OVERVIEW.md` unless explicitly asked.
2. **Scripts:** Default to dry-run for audits/backfills; require explicit confirm flag for writes.
3. **Idempotency:** XP Events use dedupe keys; respect `XP Awarded` and `Email Sent` flags.
4. **PII:** No real athlete/parent data in test payloads or commits.
5. **Deploy path:** GitHub first → review (ChatGPT) → Airtable/Make production.
6. **Document production changes** in `CHANGELOG.md` and relevant schema/automation maps.

## Airtable Script Conventions

- Use `selectRecordsAsync` with views/filters; batch updates.
- Field names must match [field-map.md](../airtable/schema/current/field-map.md).
- Prefer creating XP Events over mutating Athlete XP totals directly.

## Make Conventions

- Webhooks include stable `eventId` and `eventType`.
- Document mappings in `make/documentation/`; export blueprints to `make/blueprints/`.
- Test with `make/test-payloads/` against non-prod base.

## When Asked to Implement Features

1. Read relevant data-flow doc under `docs/data-flow/`.
2. Update schema maps if fields/tables change.
3. Add or update automation README in the feature folder.
4. Note recovery impact in `docs/recovery/` if failure modes change.

## Helpful References

- [Submission → XP](../docs/data-flow/submission-to-xp-flow.md)
- [Homework flow](../docs/data-flow/homework-flow.md)
- [Weekly summary flow](../docs/data-flow/weekly-summary-flow.md)
- [Emergency recovery](../docs/recovery/emergency-recovery.md)
