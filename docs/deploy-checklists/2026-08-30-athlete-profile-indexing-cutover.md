# Athlete profile search indexing cutover — future Mike promotion

**Date:** 2026-08-30  
**Master list:** FUT-025 — Sitemap, indexing, and public athlete profiles  
**Depends on:** SC-115 program indexing cutover ([2026-08-25-web-search-indexing-cutover.md](./2026-08-25-web-search-indexing-cutover.md))

## Status

**ENABLED in production (2026-09-04).** Mike authorized `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true`. Redeploy `dpl_4tbg25UzYPFruga1PzQthewWswNP` READY. Evidence: [`docs/audits/FUT-025-indexing-cutover-20260904.md`](../audits/FUT-025-indexing-cutover-20260904.md).

Athlete profiles with Public Profile Enabled + slug are `index, follow`. They remain excluded from `sitemap.xml` by design.

## Consent assumptions (verify before cutover)

Registration consent for the Shooting Challenge covers **in-page** public display of:

- Full athlete name
- School
- Grade
- Approved progress information (XP, levels, achievements, homework status, etc.)

Registration consent does **not** automatically authorize search-engine indexing. Athlete profile indexing is a **separate Mike decision** after verifying:

1. Current registration / waiver language still covers name, image, and likeness for **public web promotion** (not only in-program display).
2. No parent contact information, email addresses, private submission metadata, or payment fields appear in profile HTML or metadata (verified by `public-athlete-profile-privacy.test.ts` and `athlete-profile-metadata.test.ts`).
3. Only enrollments with **Public Profile Enabled** and a unique **Public Profile Slug** resolve to public profile routes.
4. Duplicate slug policy remains fail-closed (`queries.ts` duplicate slug guard).

## Vercel production environment (when Mike approves)

Set at **build time** (redeploy required):

| Variable | Required value | Notes |
|---|---|---|
| `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING` | `true` | Already set for SC-115 program pages |
| `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` | `true` | **New** — athlete-specific cutover; default unset/false |

Do **not** unset `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` unless rolling back athlete search indexing.

## Expected behavior after cutover

| Surface | Before cutover | After cutover |
|---|---|---|
| Athlete profile `<meta robots>` | `noindex, nofollow` | `index, follow` |
| `robots.txt` | `Disallow: /shoot/athletes/` | `/athletes/` removed from disallow list |
| `sitemap.xml` | No athlete URLs | **Still no athlete URLs** (by design — discovery via leaderboard links) |
| Meta description / OG / Twitter | Name + generic leaderboard copy only | Same privacy-safe copy (no grade/school/email) |
| In-page profile HTML | Registration-consent allowlist | Unchanged |

Implementation: `web/lib/seo/metadata.ts` (`isAthleteProfileIndexingEnabled`, `resolveAthleteProfileRobots`, `resolveRobotsDisallowSegments`), `web/lib/seo/athlete-profile-metadata.ts`.

## Post-deploy verification

1. View-source on `/shoot/athletes/<known-public-slug>` — robots meta **without** `noindex`
2. `https://www.fairfieldbasketballclub.com/shoot/robots.txt` — **no** `Disallow: /shoot/athletes/` line
3. `https://www.fairfieldbasketballclub.com/shoot/sitemap.xml` — still **no** `/shoot/athletes/` URLs
4. Meta description on athlete profile — no grade, school, or `@` email patterns
5. From `web/`:

```bash
NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true npm run test -- lib/seo/athlete-profile-metadata.test.ts lib/seo/metadata.test.ts
npm run test:smoke:prod
```

## Rollback

Remove `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` (or set `false`) on Vercel Production and redeploy. Profiles return to `noindex`; `robots.txt` restores `/athletes/` disallow.
