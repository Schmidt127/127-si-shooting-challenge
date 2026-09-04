# SEO Status — Shooting Challenge (`/shoot`)

**Date:** 2026-09-04  
**Agent:** Agent 3 (SEO completion + PR #310 disposition)  
**Base:** `origin/master` @ `8e662a38ab3d12a726dd7599ccdac4077db0e015`  
**Implementation branch:** `feature/seo-completion-pr310-disposition`

---

## Task Classification

| Field | Value |
|-------|--------|
| Type | Web SEO completion / draft PR disposition |
| Priority | High (stale conflicting draft) |
| Phase | 3 Implementation |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Out of scope | Athlete indexing (Agent 2 / FUT-025), Season Simulation, cosmetic redesign |

---

## PR #310 disposition

| Field | Value |
|-------|--------|
| PR | [#310](https://github.com/Schmidt127/127-si-shooting-challenge/pull/310) |
| Branch | `cursor/seo-discoverability-audit-53e7` |
| Created | 2026-08-30 |
| State before this wave | OPEN draft, **CONFLICTING** with master (`mergeable: CONFLICTING`) |
| Human reviews | None |
| Decision | **Closed as superseded** by [#399](https://github.com/Schmidt127/127-si-shooting-challenge/pull/399) |

### Why not rebase #310 in place

1. Conflicts in `CHANGELOG.md` and `web/app/(program)/homework/page.tsx` (homework loader rewritten after Aug 30).
2. Footer now includes Family Dashboard (`/dashboard/sign-in`) from SC-149 — PR #310 footer patch would have been incomplete against current master.
3. Cleaner audit trail: one authoritative PR from current `origin/master` with adapted homework wiring.

### Reused from #310 (still valid)

- `web/lib/seo/structured-data.ts` + unit tests
- `web/components/seo/catalog-structured-data.tsx`
- `web/components/seo/detail-structured-data.tsx`
- FAQ BreadcrumbList graph extension
- Mobile `viewport.themeColor`, `applicationName`, `formatDetection`
- Footer quick links for Shoutouts + Articles
- Catalog/detail JSON-LD wiring pattern
- Prior audit report retained: `web/docs/seo-audit-report-2026-08-30.md`

### Not carried forward

- Athlete indexing changes — **none were in #310**; Agent 2 owns FUT-025
- Speculative marketing copy / title rewrites — production titles already fact-aligned
- Season Simulation — excluded

---

## Production SEO audit (live, 2026-09-04)

Host: `https://www.fairfieldbasketballclub.com/shoot`

| Surface | Result |
|---------|--------|
| Home title / description / canonical | Present; Fairfield host; national-first copy |
| Home robots | `index, follow` |
| Home JSON-LD | Present (Organization / SportsOrganization / WebSite) |
| FAQ title / canonical / robots | Indexable; FAQ JSON-LD present |
| FAQ BreadcrumbList | **Missing on production** (addressed in this PR) |
| Homework catalog JSON-LD | **0 scripts** on production (addressed in this PR) |
| `/shoot/robots.txt` | Allow `/shoot/`; disallow admin, api, dashboard, athletes, public-display; sitemap declared |
| `/shoot/sitemap.xml` | Static public routes + catalog rows; no `/athletes/` |
| Dashboard sign-in | `noindex, nofollow` |
| Athlete slug shell | `noindex` (FUT-025 remains Agent 2) |
| `basePath` | `/shoot` consistent in canonicals, robots disallow, sitemap locs |
| Next.js redirects for SEO | None defined in `next.config.ts` (landing rewrite hosts `/shoot`) |

### Duplicate / broken URL notes

- Canonicals use `www.fairfieldbasketballclub.com/shoot…` — aligned with SC-149 Fairfield attestation.
- No inventable contact/about duplicate routes (FUT-022).
- Private routes correctly excluded from sitemap.

---

## Implemented in this wave

1. BreadcrumbList + CollectionPage/WebPage JSON-LD on public catalog and detail routes
2. FAQ `@graph` includes BreadcrumbList
3. Mobile theme-color + applicationName + formatDetection
4. Footer internal links: Shoutouts, Articles (Family Dashboard preserved)
5. Unit + Playwright coverage for structured data
6. Docs: this status file + `web/docs/seo.md` update

---

## Agent 2 boundary (FUT-025)

**Untouched by Agent 3:**

- `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` enablement / Vercel env
- `isAthleteProfileIndexingEnabled` / `resolveAthleteProfileRobots` logic changes
- Athlete sitemap inclusion / robots `/athletes/` allow cutover
- FUT-025 Master Future Work List closure

`metadata.ts` was edited only for FAQ breadcrumb import/`buildFaqRouteJsonLd` — athlete helpers unchanged.

---

## Remaining risks / Mike actions

| Item | Owner | Notes |
|------|-------|-------|
| Merge + Production deploy of this SEO PR | Mike | After review |
| Google Search Console property + sitemap submit | Mike | Still not verifiable from repo (see Aug 30 audit §6) |
| Athlete profile indexing cutover | Agent 2 / Mike | FUT-025 |
| Dynamic per-page OG images | Optional later | Brand logo shared today — acceptable |

---

## Validation (this branch)

| Check | Result |
|-------|--------|
| `vitest` `structured-data` + `metadata` + `footer-config` | **30/30 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` (touched SEO files) | **PASS** (0 errors; pre-existing warnings elsewhere) |
| `npm run build` (`NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`) | **PASS** |
| Playwright local `national-seo` + `search-indexing` | **17/18 PASS** — sole fail: dynamic sitemap detail URLs (no Airtable token in worktree; expected) |
| Playwright production baseline | Program indexing healthy; catalog BreadcrumbList/CollectionPage **absent** until this PR deploys; FAQ BreadcrumbList **absent** until deploy |

### Production observation (Agent 2 boundary — do not change here)

Live `/shoot/robots.txt` (2026-09-04) **omits** `Disallow: /shoot/athletes/`. That matches the fail-open path when both indexing flags are true. Agent 3 did **not** change athlete indexing helpers or env; FUT-025 remains Agent 2.
