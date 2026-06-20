# Schema Notes (Current)

Living notes for the **127 SI Shooting Challenge** Airtable base. Update this file whenever production schema changes are deployed.

## Base Identity

| Item | Value |
|------|-------|
| Base name | *(fill in)* |
| Base ID | *(fill in)* |
| Environment | Production |
| Last reviewed | *(YYYY-MM-DD)* |

## Design Principles

- **Athlete-centric linking** — Submissions, XP Events, homework, and attendance roll up to the Athlete record.
- **Immutable XP Events** — XP is awarded via XP Event records; do not overwrite historical totals on Athlete.
- **Submission as source of truth** — Shooting stats and challenge progress originate from Submission records; derived fields use formulas or automations.
- **Idempotent automations** — Scripts and Make scenarios must tolerate retries without double-awarding XP or sending duplicate emails.

## Table Inventory (Summary)

See [table-map.md](./table-map.md) for the full table list and relationships.

Core tables typically include:

- Athletes
- Submissions
- XP Events
- Levels / Badges
- Homework
- Weekly Summaries
- Coaches / Parents (contacts)
- Zoom Attendance

## Recent Schema Changes

| Date | Table | Change | Deployed by | Notes |
|------|-------|--------|-------------|-------|
| | | | | |

## Known Issues / Tech Debt

- *(none yet)*

## Related Docs

- [table-map.md](./table-map.md)
- [field-map.md](./field-map.md)
- [automation-trigger-map.md](./automation-trigger-map.md)
- [../../../docs/architecture/architecture-review.md](../../../docs/architecture/architecture-review.md)

## Workflow

1. Propose schema change in GitHub (update these notes + field-map).
2. Review with ChatGPT or architecture review doc.
3. Apply in Airtable (prefer additive changes; avoid breaking linked fields).
4. Update automations and Make blueprints if triggers or field names change.
5. Run audit scripts (dry-run) before and after.
6. Snapshot schema to `../snapshots/` and note in `CHANGELOG.md`.
