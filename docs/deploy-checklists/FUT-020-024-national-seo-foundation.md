# FUT-020–024 — National SEO promotion

**Branch:** `agent/seo-fut-020-024` (merged to `master`)  
**SEO commit:** `94c018e`  
**Starting master (rollback):** `e312422` — tag `rollback/pre-seo-merge-2026-08-27`  
**Merged master:** `94c018e` (fast-forward 2026-08-27)

## Scope

| ID | Status | Notes |
|----|--------|-------|
| FUT-020 | Complete | Metadata, sitemap, robots, JSON-LD, canonical URLs |
| FUT-021 | Complete | Homepage national-first messaging |
| FUT-022 | Complete | Route audit — only new route: `/faq` |
| FUT-023 | Complete | Per-page metadata, descriptive links, alt text |
| FUT-024 | **Partial** | Team Shot Tracker FAQ blocked by `FORBIDDEN_CROSSOVER_PRODUCTS` |

## Pre-merge validation (local, 2026-08-27)

From `web/` on `agent/seo-fut-020-024` / merged `master`:

| Check | Result |
|-------|--------|
| `npm run lint` | Pass (4 pre-existing warnings in `public-athlete-homework.ts`) |
| `npm run typecheck` | Pass |
| `npm run test` | Pass — 432/432 |
| `npm run build` | Pass |
| `public-surface.test.ts` | Pass — Team Shot Tracker protection is **expected policy test**, not regression |
| `/faq` in sitemap (unit) | Pass — `SITEMAP_PUBLIC_ROUTES` + `sitemap-entries.test.ts` |

**Known pre-deploy production gap:** Production sitemap `/faq` Playwright failure before merge was expected — `/faq` route did not exist on deployed `master` (`e312422`). Resolves after Vercel deploy of merged `master`.

## Production promotion

1. ~~Merge `agent/seo-fut-020-024` into `master`~~ Done (fast-forward 2026-08-27).
2. Vercel auto-deploys from `master` (root directory `web`).
3. Confirm `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` in Vercel production env when ready for crawl.
4. After deploy Ready, run:

```bash
cd web
npm run test:smoke:prod
npx playwright test tests/national-seo.spec.ts --workers=1
npx playwright test tests/search-indexing.spec.ts --workers=1
```

5. Verify:
   - https://www.fairfieldbasketballclub.com/shoot — new homepage title/messaging
   - https://www.fairfieldbasketballclub.com/shoot/faq — FAQ page + JSON-LD
   - https://www.fairfieldbasketballclub.com/shoot/sitemap.xml — includes `/shoot/faq`
   - https://www.fairfieldbasketballclub.com/shoot/robots.txt — unchanged private disallow rules
   - No Team Shot Tracker crossover in public nav/copy

## Rollback

```bash
git checkout master
git revert 94c018e   # or reset to tag rollback/pre-seo-merge-2026-08-27 (Mike approval only)
git push origin master
```

Unrelated working-tree changes (Airtable automations, homework contracts) were never part of this branch.

## Post-deploy verification (2026-08-27)

| Check | Result |
|-------|--------|
| Vercel deploy | Ready — `master` @ `ee5d3fd` |
| `/shoot/faq` | HTTP 200 |
| Sitemap `/shoot/faq` | Present — `<loc>https://www.fairfieldbasketballclub.com/shoot/faq</loc>` |
| `npm run test:smoke:prod` | 50/50 pass (after smoke helper h1 update) |
| `national-seo.spec.ts` (prod) | 7/7 pass |
| `public-surface.test.ts` | 18/18 pass — Team Shot Tracker checks are **policy protection tests** |
| Rollback tag | `rollback/pre-seo-merge-2026-08-27` → `e312422` |

**Production URLs verified:**
- https://www.fairfieldbasketballclub.com/shoot
- https://www.fairfieldbasketballclub.com/shoot/faq
- https://www.fairfieldbasketballclub.com/shoot/sitemap.xml
- https://www.fairfieldbasketballclub.com/shoot/robots.txt
