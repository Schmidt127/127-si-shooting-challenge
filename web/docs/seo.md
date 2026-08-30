# Website SEO — Shooting Challenge (`/shoot`)

**Authority:** FUT-020 through FUT-024 · `web/lib/seo/`

## Rollback reference (FUT-020–024 branch)

| Field | Value |
|-------|--------|
| Branch | `agent/seo-fut-020-024` |
| Starting commit | `00f3f9ae4339f94b27c8aa049c61f95f947cb568` |
| Scope | `web/` SEO, messaging, FAQ, tests, docs only |

Unrelated working-tree changes (Airtable automations, homework contracts, testing tools) were **not** staged or committed.

## Indexing policy

| Control | Location |
|---------|----------|
| Program indexing | `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` enables indexable robots on public program pages |
| Athlete profile indexing | `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true` **and** program flag — separate Mike cutover; default off |
| Default | `noindex, nofollow` when flags are unset |
| Private routes | `/dashboard`, `/admin`, `/public-display`, `/api/*` stay `noindex` |
| Athlete routes | `/athletes/*` stays `noindex` until athlete cutover flag; excluded from sitemap by design |
| Sitemap | `/shoot/sitemap.xml` — static public routes + published Airtable catalog rows (no athlete slugs) |
| Robots | `/shoot/robots.txt` — allow `/shoot/`, disallow private paths; `/athletes/` disallow removed only after athlete cutover |

Implementation: `web/lib/seo/metadata.ts`, `web/app/robots.ts`, `web/app/sitemap.ts`.

## Canonical program facts

Single source for public copy: `web/lib/seo/program-facts.ts`

- Boys and girls in **grades 1–8**
- **Educational Athletics** (127 Sports Intensity)
- Based in **Fairfield, Montana** — online submissions, homework, Zoom, and progress tracking are nationally accessible where supported
- **No** unsupported in-person service claims outside Fairfield area

## Metadata builder

All public pages use `buildPageMetadata()` for:

- Unique title and description
- Canonical URL (`SITE_URL` + route path)
- Open Graph and Twitter/X cards
- Robots policy

Root defaults: `web/app/layout.tsx`  
Home JSON-LD: `buildProgramHomeJsonLd()` on `/shoot`

## FUT-022 route audit (no duplicate pages)

| Subject | Route decision |
|---------|----------------|
| Youth basketball program / Shooting Challenge | **Home** `/shoot` — enhanced messaging |
| Youth basketball training | **Homework** `/homework`, **Tutorials** `/tutorials` |
| Team Shot Tracker | **No page** — separate product; omitted from public copy per `public-surface.ts` |
| About / organization | **Footer** + home hero + FAQ |
| Activities and events | **Zoom** `/zoom-meetings`, **Homework**, **Tutorials**, **Shoutouts** |
| Contact | **Registration gateway** on home + FAQ registration section; no standalone contact page |
| FAQ | **New** `/shoot/faq` — only route added |
| Game manual / rules | **Existing** `/game-manual` |
| Levels / achievements / leaderboard | **Existing** routes — metadata improved |

## FAQ and structured data (FUT-024)

- Page: `web/app/(program)/faq/page.tsx`
- Content: `web/lib/seo/faq-content.ts`
- JSON-LD: `buildFaqRouteJsonLd()` — Organization + FAQPage
- Privacy: no parent emails, athlete private fields, or Airtable record IDs

**Blocked (documented):** Team Shot Tracker FAQ topic — excluded to preserve `FORBIDDEN_CROSSOVER_PRODUCTS` in `web/lib/release/public-surface.ts`.

## Tests

| Suite | Path |
|-------|------|
| Unit | `web/lib/seo/*.test.ts` |
| Playwright | `web/tests/search-indexing.spec.ts`, `web/tests/national-seo.spec.ts`, `web/tests/feature-images.spec.ts` |

Run from `web/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:smoke:prod
npx playwright test tests/national-seo.spec.ts
```

**Production (2026-08-27):** Merged `master` @ `ee5d3fd`. `/shoot/faq` live; sitemap includes `/shoot/faq`; `national-seo.spec.ts` 7/7 on production.

## Related docs

- [site-hierarchy.md](./site-hierarchy.md) — canonical route map
- [production-closeout.md](./production-closeout.md) — env vars for production indexing
