# SC-162 — Compact Homework list + durable assignment links

**Date:** 2026-09-05  
**Branch:** `wave/a3-homework-ux-links-20260905`  
**Backlog:** SC-162 (follow-on to FUT-014; **not** FUT-029)

## Summary

1. **Compact list** — `/shoot/homework` shows dense rows (title, week, due date, category, due-status chip, **View assignment**). Full copy, files, and submission rules stay on `/homework/[id]`.
2. **Durable links** — Airtable attachment CDN URLs are never baked into catalog/detail HTML. Docs / Cover Images use `/api/homework/[id]/attachment/[attachmentId]`; ephemeral `URL` / `URL Additional` values route through `/api/homework/[id]/link`. Delivery re-fetches with `cache: "no-store"` and 302s to a fresh authorized URL without logging Location.

## Expired-link root cause

Airtable attachment hosts (`*.airtableusercontent.com`, `dl.airtable.com`) issue **time-limited signed URLs**. The homework catalog previously embedded those URLs (Docs, Cover Images, and sometimes pasted `URL` text) into ISR HTML (`revalidate = 300`). After expiry, browsers show **“URL link has expired.”** Re-fetching the Homework Library record via Airtable API yields a new signed URL; storing refreshed URLs permanently does not help.

## Durable solution

| Source | Public HTML | Delivery |
|---|---|---|
| Durable https (`URL`, `URL Additional`) | External href as-is | Direct |
| Ephemeral CDN in `URL` / `URL Additional` | App `/link` path | Re-read field; durable OK, ephemeral → 410 unavailable |
| `Docs` / `Cover Images` attachments | App `/attachment/...` path by `att…` id | Re-fetch attachment; 302 fresh URL; missing → 410 |
| Gone / unsupported | Unavailable copy on detail | Fail closed |

Authorization: delivery only for homework ids on the active PHA schedule for the Registering Shooting Challenge Program Instance.

## Out of scope (confirmed)

FUT-029 grade-band platform, Learning Activities, XP / Perfect Week rules, nav/footer/levels.

## Tests

- `web/lib/data/homework-resources.test.ts`
- `web/lib/airtable/homework-attachment-delivery.test.ts`
- `web/lib/data/homework.test.ts` (CDN rewrite assertions)
- `web/components/homework/homework-catalog-view.test.ts`
- `web/components/homework/homework-detail-view.test.ts`
- Existing `homework-queries` + sitemap fixtures updated for new fields

## Files touched

See PR diff; exclusive Agent 3 ownership paths plus minimal `sitemap-entries.test.ts` fixture fields required by the homework type change.
