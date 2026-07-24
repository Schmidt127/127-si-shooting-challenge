# Schema Notes (Current)

Living pointer for the **127 SI Shooting Challenge** Airtable base.

## Base Identity

| Item | Value |
|------|-------|
| Base name | 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026 |
| Base ID | `appn84sqPw03zEbTT` |
| Environment | Production |
| Last schema export reviewed | 2026-07-23 (foundation-reset post-ts) |
| Data-model pack | [`docs/next-wave/data-model/`](../../../docs/next-wave/data-model/) |

## Design Principles

- **Enrollment-centric linking** — Submissions, XP Events, homework, Zoom, and WAS roll up to **Enrollment** (athlete × school year).
- **Immutable XP Events** — append-only; idempotent `Source Key` patterns.
- **Week calendar** — Start/End dateTime America/Denver; Week Key = record ID; Week Name = label.
- **Year separation** — Config `Active School Year` + Enrollment `School Year` + Program Instance; do not collapse Config rows.
- **Idempotent automations** — tolerate retries without double XP or duplicate emails.

## Known doc corrections (2026-07-24 Agent 2)

- `Week Key` is `RECORD_ID()`, not `2026-2027|Week N`.
- No `Week End Key` field on Weeks — schedulers derive Saturday from End Date.
- Stale Athlete-hub table-map language is superseded.

## Related Docs

- [table-map.md](./table-map.md)
- [field-map.md](./field-map.md)
- [automation-trigger-map.md](./automation-trigger-map.md)
- [docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md](../../../docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md)
- [docs/next-wave/data-model/README.md](../../../docs/next-wave/data-model/README.md)
