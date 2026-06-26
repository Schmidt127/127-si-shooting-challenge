# JR Ref — Cursor instructions

Guidance for AI-assisted work on **JR Referee Clinics** in `web/`.

## Context

- **Program:** JR Referee Clinics (statewide expansion of Fairfield clinic model)
- **Airtable:** `127SI - JR REF` — Fillout writes, web reads
- **Parent docs:** `docs/jr-ref/README.md`, `airtable/schema/jr-ref/current/`
- **Routes:** `/jr-referee-clinics/*`

## Conventions

1. **Server-first data** — Use `lib/jr-ref/airtable.ts`, not the Shooting Challenge client.
2. **Thin pages** — `app/jr-referee-clinics/**/page.tsx` composes components; mapping in `lib/data/jr-ref/`.
3. **Public only** — Follow `public-data-rules.md`; no parent PII on public routes.
4. **Schema first** — If field names are unknown, run `tools/airtable/jr-ref/export_schema.py` before guessing.
5. **Product shell** — Use `JR_REFEREE_CLINICS_NAV` in layouts; match Shooting Challenge catalog styling.

## File placement

| Need | Location |
|------|----------|
| New JR Ref route | `app/jr-referee-clinics/{name}/page.tsx` |
| Airtable query | `lib/jr-ref/queries.ts` |
| Record → UI type | `lib/data/jr-ref/{feature}.ts` |
| UI components | `components/jr-ref/` |
| Nav items | `lib/navigation/jr-referee-clinics-nav.ts` |

## Do not

- Use `AIRTABLE_BASE_ID` for JR Ref data (wrong base)
- Call Airtable from `"use client"` components
- Write to Airtable without an approved design
- Mix JR Ref routes into `SHOOTING_CHALLENGE_NAV`

## Useful paths

```
docs/jr-ref/getting-started.md
airtable/schema/jr-ref/current/table-map.md
web/docs/jr-ref/airtable-data-map.md
web/docs/jr-ref/public-data-rules.md
```

## Local checks

```powershell
cd web
npm run dev
curl http://localhost:3000/api/jr-ref/airtable
```
