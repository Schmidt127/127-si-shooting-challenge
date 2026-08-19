# Schema Notes (Current)

Living pointer for the **127 SI Shooting Challenge** Airtable base.

## Base Identity

| Item | Value |
|------|-------|
| Base name | 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026 |
| Base ID | `appn84sqPw03zEbTT` |
| Environment | Production |
| Last schema export reviewed | **2026-08-19** (`prod-20260819/`, stamp `20260819_184903`) |
| Refresh summary | [`docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md`](../../../docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md) |
| Data-model pack | [`docs/next-wave/data-model/`](../../../docs/next-wave/data-model/) |

## Design Principles

- **Enrollment-centric linking** — Submissions, XP Events, homework, Zoom, and WAS roll up to **Enrollment** (athlete × school year).
- **Immutable XP Events** — append-only; idempotent `Source Key` patterns.
- **Week calendar** — Start/End dateTime America/Denver; Week Key = record ID; Week Name = label.
- **Year separation** — Config `Active School Year` + Enrollment `School Year` + Program Instance; do not collapse Config rows.
- **Idempotent automations** — tolerate retries without double XP or duplicate emails.

## 2026-08-19 snapshot notes

- **32 tables** in PROD (was 29 in `prod-20260706`).
- Homework split: **`Homework Library`** (reusable content) + **`Program Homework Assignments`** (week/season schedule). Legacy **`FBC Curriculum - SYNC`** removed from PROD.
- **`Program Instance - Sync`** is the live synced Program Instance table name (was `Program Instance - Synced`).
- **`Email Handoff Queue`** present for email/Make handoff.
- **`Testing Scenarios`** (C-020) now in PROD.
- **`Lesson Key`** on Homework Library — **deleted in PROD** (Mike 2026-08-19). Use `Record Id` for content identity; PHA.`Schedule Key` for schedule dedupe.
- **`Week Lkp`** on Submissions — **deleted in PROD** (Mike 2026-08-19). Use **`Submissions.Week`** (005) for submission week.
- Hand-maintained `table-map.md` / `field-map.md` in this folder remain **stale** until Agent A refresh.

## Known doc corrections (2026-07-24 Agent 2)

- `Week Key` is `RECORD_ID()` (relational). `Week Code` is the annual ops formula (attest in OMNI). `Week Name` is the display label.
- No `Week End Key` field on Weeks — schedulers derive Saturday from End Date.
- Weekly email schedules 118/119 are ON in PROD (verified 2026-07-24).
- Stale Athlete-hub table-map language is superseded.

## Related Docs

- [table-map.md](./table-map.md) *(stale)*
- [field-map.md](./field-map.md) *(stale)*
- [C-028 Award Recipients Tremendous fields](./C-028-award-recipients-tremendous-fields.md)
- [automation-trigger-map.md](./automation-trigger-map.md)
- [docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md](../../../docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md) *(historical)*
- [docs/next-wave/data-model/README.md](../../../docs/next-wave/data-model/README.md)
