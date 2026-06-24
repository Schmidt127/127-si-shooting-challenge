# Cursor Instructions

Guidance for AI-assisted development in the `web/` folder.

## Context

- Parent repo: Airtable automations, audits, and schema docs for the same production base
- This app is **read-only** toward Airtable until admin phase is explicitly scoped
- Softr replacement — match public data exposure, not internal ops UI

## Conventions

1. **Server-first data** — Fetch Airtable in Server Components or `lib/airtable/queries.ts`. No token in client bundles.
2. **Thin pages** — `app/**/page.tsx` composes components; mapping lives in `lib/data/`.
3. **Types** — Add shared shapes to `types/` before building components.
4. **Placeholders** — Use `PlaceholderPage` until a route has real data.
5. **Comments** — Document non-obvious business rules (publish flags, XP buckets).
6. **Minimal diffs** — One feature per PR when possible.

## File placement

| Need | Location |
|------|----------|
| New public route | `app/{name}/page.tsx` |
| Airtable query | `lib/airtable/queries.ts` |
| Record → UI type | `lib/data/{feature}.ts` |
| Reusable UI | `components/{feature}/` |
| Format XP/dates | `lib/formatters/` |

## Do not

- Call Airtable directly from `"use client"` components
- Write to Airtable without an approved design doc
- Expose fields listed in `public-data-rules.md` as forbidden
- Duplicate automation business logic (XP calculation stays in Airtable scripts)

## Useful parent repo paths

```
airtable/schema/current/table-map.md
airtable/schema/snapshots/          # field names
web/docs/airtable-data-map.md
web/docs/public-data-rules.md
```

## Testing locally

```bash
cd web && npm install && npm run dev
curl http://localhost:3000/api/airtable
```

## Deployment

See [deployment-notes.md](./deployment-notes.md).
