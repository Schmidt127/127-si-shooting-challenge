# JR Referee Clinics — documentation index

Program docs for **127SI - JR REF** (Airtable) and **hoopchallenges.com/jr-referee-clinics** (web).

## Start here

| Doc | Purpose |
|-----|---------|
| [getting-started.md](./getting-started.md) | Cursor, GitHub, Vercel, first schema pull |
| [program-overview.md](./program-overview.md) | What the program is, Fairfield → statewide |
| [state-wide-expansion.md](./state-wide-expansion.md) | Goals and Airtable changes for MT-wide rollout |
| [../../web/docs/jr-ref/airtable-data-map.md](../../web/docs/jr-ref/airtable-data-map.md) | Tables → web routes |
| [../../web/docs/jr-ref/project-roadmap.md](../../web/docs/jr-ref/project-roadmap.md) | Build phases |
| [../../airtable/schema/jr-ref/current/table-map.md](../../airtable/schema/jr-ref/current/table-map.md) | Table relationships (update after schema export) |

## Airtable (backend)

| Path | Purpose |
|------|---------|
| [../../airtable/automations/jr-referee-clinics/README.md](../../airtable/automations/jr-referee-clinics/README.md) | Automation scripts folder |
| [../../airtable/extension-scripts/jr-ref/README.md](../../airtable/extension-scripts/jr-ref/README.md) | Audits and in-base exports |
| [../../tools/airtable/jr-ref/README.md](../../tools/airtable/jr-ref/README.md) | **Pull schema from Airtable** (Python) |
| [../../airtable/schema/jr-ref/snapshots/README.md](../../airtable/schema/jr-ref/snapshots/README.md) | Dated schema exports |

## Web (frontend)

Same Vercel project as Hoop Challenges (`web/` root). JR Ref routes live under `/jr-referee-clinics`.

| Doc | Purpose |
|-----|---------|
| [../../web/docs/jr-referee-clinics.md](../../web/docs/jr-referee-clinics.md) | Routes and env vars |
| [../../web/docs/jr-ref/cursor-instructions.md](../../web/docs/jr-ref/cursor-instructions.md) | AI editing rules for JR Ref pages |
| [../../web/docs/jr-ref/public-data-rules.md](../../web/docs/jr-ref/public-data-rules.md) | What may appear publicly |
| [../../web/docs/deployment-notes.md](../../web/docs/deployment-notes.md) | Vercel (shared) |

## Common tasks

| I want to… | Go to |
|------------|-------|
| Export JR REF schema | [tools/airtable/jr-ref/README.md](../../tools/airtable/jr-ref/README.md) |
| Add a public page | [web/docs/jr-referee-clinics.md](../../web/docs/jr-referee-clinics.md) |
| Add an automation | [airtable/automations/jr-referee-clinics/](../../airtable/automations/jr-referee-clinics/) |
| Check Vercel env | `JR_REF_AIRTABLE_BASE_ID` in [deployment-notes](../../web/docs/deployment-notes.md) |
