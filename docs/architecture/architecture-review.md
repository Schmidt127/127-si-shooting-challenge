# Architecture Review

Periodic review checklist for the **127 SI Shooting Challenge** system (Airtable + Make + GitHub). Use with ChatGPT or team review before major season changes or after incidents.

## System Context

Youth basketball shooting challenge: athletes log submissions, earn XP, complete homework, receive weekly summaries; coaches and parents notified via Make.

| Layer | Responsibility |
|-------|----------------|
| Airtable | Data, formulas, native automations, extension scripts |
| Make.com | Drive, Gmail, webhooks, cross-system orchestration |
| GitHub | Versioned scripts, schema docs, blueprints, recovery |
| Cursor | Local editing |
| ChatGPT | Design review, script audit, doc drafting |

## Architecture Goals

1. **Single source of truth for XP** — XP Events ledger; no silent overwrites on Athlete.
2. **Idempotent automations** — Safe retries for Airtable and Make.
3. **Recoverability** — Schema snapshots, blueprint exports, documented runbooks.
4. **Minimal PII exposure** — Test payloads sanitized; emails routed carefully in non-prod.
5. **Coach/ops clarity** — Views and docs match what staff see in Airtable.

## Review Areas

### Data Model

- [ ] Table links match [table-map.md](../../airtable/schema/current/table-map.md)
- [ ] Field names stable for scripts and Make mappings
- [ ] Rollups vs formulas: totals derive from XP Events
- [ ] Enrollment status gates automations for inactive athletes

### Automations

- [ ] Trigger map current ([automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md))
- [ ] Shooting challenge script reviewed for XP edge cases
- [ ] No automation loops (condition → script → same field flip)

### Make.com

- [ ] Blueprints exported to [make/blueprints/](../../make/blueprints/)
- [ ] Webhook idempotency documented
- [ ] Test vs production bases separated

### Operations

- [ ] Audit scripts cover submissions, homework, weekly summaries
- [ ] Safe backfills require dry-run + confirm flag
- [ ] [Weekly maintenance checklist](../checklists/weekly-maintenance-checklist.md) still accurate
- [ ] [Emergency recovery](../recovery/emergency-recovery.md) contacts current

## Data Flow References

- [Submission → XP](../data-flow/submission-to-xp-flow.md)
- [Homework](../data-flow/homework-flow.md)
- [Weekly summary](../data-flow/weekly-summary-flow.md)

## Review Log

| Date | Reviewer | Scope | Outcome |
|------|----------|-------|---------|
| | | | |
