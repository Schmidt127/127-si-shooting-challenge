# FUT-020–024 — National SEO promotion

**Branch:** `agent/seo-fut-020-024`  
**Starting commit:** `00f3f9ae4339f94b27c8aa049c61f95f947cb568`

## Pre-merge validation (local)

From `web/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Production promotion

1. Merge `agent/seo-fut-020-024` into `master` (Mike approval).
2. Vercel auto-deploys from `master` (root directory `web`).
3. Confirm `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` in Vercel production env when ready for crawl.
4. After deploy Ready, run:

```bash
cd web
npm run test:smoke:prod
npx playwright test tests/national-seo.spec.ts --workers=1
```

5. Verify:
   - https://www.fairfieldbasketballclub.com/shoot — new homepage title/messaging
   - https://www.fairfieldbasketballclub.com/shoot/faq — FAQ page + JSON-LD
   - https://www.fairfieldbasketballclub.com/shoot/sitemap.xml — includes `/faq`
   - https://www.fairfieldbasketballclub.com/shoot/robots.txt — unchanged private disallow rules

## Rollback

Revert the SEO commits on `master` or restore files from starting commit `00f3f9ae`.

Unrelated working-tree changes (Airtable automations, homework contracts) were never part of this branch.
