# Web search indexing cutover — production promotion

**Date:** 2026-08-25  
**Master list:** SC-115 — noindex removal / search indexing

## Vercel production environment

Set at **build time** (redeploy required after change):

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING` | `true` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` |
| `AIRTABLE_BASE_ID` | Production Shooting Challenge base (`appn84sqPw03zEbTT`) |

## Post-deploy verification

1. `https://www.fairfieldbasketballclub.com/shoot/robots.txt` — allows `/shoot/`, disallows dashboard/admin/athletes/public-display/api
2. `https://www.fairfieldbasketballclub.com/shoot/sitemap.xml` — static program routes + dynamic `/homework/rec…`, `/tutorials/rec…`, etc.; no athlete or dashboard URLs
3. View-source on `/shoot/leaderboard` — robots meta **without** `noindex`
4. View-source on `/shoot/athletes/demo-athlete` — robots meta **with** `noindex`
5. `npm run test:smoke:prod` from `web/`

## Indexing policy summary

**Indexable when flag is true:** program home, leaderboard, homework, levels, tutorials, shoutouts, articles, zoom-meetings, game-manual, achievements, and published detail pages for those catalogs.

**Always noindex:** athlete profiles, dashboard, dashboard/preview, admin, public-display, API routes, 404.
