# SC-162 test evidence — 2026-09-05

## Command

```powershell
cd web
npx vitest run lib/data/homework-resources.test.ts lib/data/homework.test.ts lib/airtable/homework-attachment-delivery.test.ts components/homework/homework-catalog-view.test.ts components/homework/homework-detail-view.test.ts lib/seo/sitemap-entries.test.ts lib/airtable/homework-queries.test.ts
```

## Result

**61/61 passed** (7 files).

## Coverage notes

- Compact catalog omits full instructions and resource CDN URLs; exposes View assignment → `/homework/[id]`.
- Docs map to `/api/homework/.../attachment/...` (no `airtableusercontent.com` in HTML).
- Delivery mocks: fresh attachment OK; missing attachment unavailable; ephemeral URL field unavailable; durable URL OK; unscheduled homework not_found.
- Detail view strips ephemeral CDN if present and shows unavailable resource state.

## Live attachment note

Live Airtable attachment expiry was not exercised against production CDN in this worktree (no secrets logged). Behavior is covered by mocks that mirror Airtable’s fresh-URL-on-GET contract.
