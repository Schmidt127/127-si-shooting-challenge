# Indexing / SEO Decision — SC-115 (noindex removal)

**Agent 6 overnight** · 2026-07-23 · **Decision owner: Mike** · **No indexing change made tonight.**

---

## Current state (verified in code tonight)

| Item | State |
|------|-------|
| Sitewide robots | `index: false, follow: false` in `web/app/layout.tsx` metadata — every `/shoot` page emits `<meta name="robots" content="noindex, nofollow">` |
| Per-page reinforcement | `/athletes/[slug]` and `/admin` set `noindex` again at page level (stays even after sitewide flip) |
| robots.txt / sitemap | None in `web/` (fine while noindexed; needed before real SEO) |
| Regression guard | New Playwright spec asserts the noindex meta is present — **this test must be updated intentionally when Mike flips the decision**, preventing accidental indexing |
| metadataBase | `NEXT_PUBLIC_SITE_URL` (defaults `hoopchallenges.com`) — verify set to `https://www.hoopchallenges.com/shoot` in Vercel before indexing |

## Conditions required before removing noindex

1. **Content:** real season data seeded (levels, achievements, homework, meetings) — indexing empty catalogs wastes the first crawl impression.
2. **Privacy:** public-data rules pass on a production deploy (standings audit + security audit both green — done at repo level tonight; needs one live-deploy spot check).
3. **Softr:** at least soft cutover decided (`SOFTR-CUTOVER-DECISION.md`) so search traffic lands on the surviving site, and duplicate-content between Softr and `/shoot` is not competing.
4. **Metadata:** page titles/descriptions reviewed (already reasonable), `NEXT_PUBLIC_SITE_URL` verified, favicon/OG basics confirmed.
5. **Demo routes:** `/dashboard`, `/athletes/*`, `/admin` keep per-page noindex (already true for athletes/admin; add to dashboard at flip time).
6. **Mike's explicit written approval** — treat as production deployment.

## Execution plan when approved (small, reversible)

1. Edit `web/app/layout.tsx`: remove sitewide `robots` block (or set index true).
2. Add per-page `robots: { index: false }` to `/dashboard`.
3. Update the Playwright noindex assertion to assert the *new* expected state.
4. Optional same PR: add `app/robots.ts` + `app/sitemap.ts` (Next.js conventions).
5. Deploy, then verify with `curl` + Google Search Console URL inspection.

Rollback = revert the commit and redeploy (crawlers may take days to forget —
which is why the flip waits for real readiness).

## Recommendation

Keep `noindex` until conditions 1–3 are green. Revisit after real season data is
seeded and the Softr soft cutover is decided. Not a tonight decision.
