# SEO Discoverability Audit — Shooting Challenge (`/shoot`)

**Date:** 2026-08-30  
**Scope:** Public program website at `https://www.fairfieldbasketballclub.com/shoot`  
**Backlog:** FUT-020–024 (national SEO foundation), SC-115 (indexing cutover complete 2026-08-25)  
**Implementation branch:** `cursor/seo-discoverability-audit-53e7`

---

## 1. Current SEO strengths

| Area | Status | Evidence |
|------|--------|----------|
| **Indexing cutover** | Production program pages are `index, follow` when `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` (set on Vercel Production per SC-115). | `web/lib/seo/metadata.ts`, deploy checklist `docs/deploy-checklists/2026-08-25-web-search-indexing-cutover.md` |
| **Canonical URLs** | All public pages use `buildPageMetadata()` → `alternates.canonical` on `https://www.fairfieldbasketballclub.com/shoot/...`. Legacy Hoop Challenges hosts normalize to Fairfield. | `web/lib/app-config.ts`, `web/tests/search-indexing.spec.ts` |
| **Robots.txt** | Allows `/shoot/`, disallows private routes and `/athletes/` by default; sitemap URL declared. | `web/app/robots.ts` |
| **Sitemap** | Static public routes + published Airtable catalog rows; athlete profiles excluded by design (FUT-025). | `web/lib/seo/sitemap-entries.ts` |
| **Athlete privacy** | Profiles `noindex` until both indexing flags are true; meta descriptions omit grade/school; never in sitemap. | `web/lib/seo/athlete-profile-metadata.ts` |
| **National-first copy** | Homepage and FAQ use grades 1–12, May 1–June 30, 100% online, Educational Athletics — sourced from `program-facts.ts`. | `web/lib/seo/program-facts.ts`, `web/tests/national-seo.spec.ts` |
| **Open Graph / Twitter** | `summary_large_image`, branded horizontal logo, per-page titles and descriptions. | `web/lib/seo/metadata.ts` |
| **Organization JSON-LD** | Home: Organization + SportsOrganization + WebSite. FAQ: Organization + FAQPage. | `web/lib/seo/metadata.ts` |
| **Internal linking** | Descriptive hub card labels (not generic “Open”); primary nav + footer quick links; home CTAs to levels and FAQ. | `web/lib/navigation/program-hub-links.ts`, `web/components/home/home-page-view.tsx` |
| **Automated tests** | Unit tests for metadata/robots/sitemap; Playwright for indexing, canonical, OG, FAQ schema. | `web/lib/seo/*.test.ts`, `web/tests/search-indexing.spec.ts`, `web/tests/national-seo.spec.ts` |

---

## 2. Current technical problems

| Issue | Severity | Notes |
|-------|----------|-------|
| **No Google Search Console property verified in repo** | Blocker for GSC workflows | Verification meta tag or DNS record must be added by Mike in GSC + Vercel — not stored in GitHub. |
| **Sitemap vs. robots meta mismatch in non-prod** | Low (by design) | Sitemap lists public routes even when `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING` is unset locally; page meta is `noindex`. Production has both aligned. |
| **Detail pages lacked breadcrumb/collection JSON-LD** | Medium | **Addressed in this PR** — BreadcrumbList + CollectionPage/WebPage on catalog and detail routes. |
| **Footer omitted Shoutouts and Articles** | Low | **Addressed in this PR** — improves crawl paths to secondary catalog pages. |
| **Mobile theme-color not declared** | Low | **Addressed in this PR** — `viewport.themeColor` in root layout. |
| **FAQ JSON-LD lacked BreadcrumbList** | Low | **Addressed in this PR**. |
| **No site search / SearchAction** | Informational | No on-site search UI; do not add SearchAction until a real search endpoint exists. |
| **Dynamic OG images per page** | Enhancement | All pages share the horizontal brand logo — acceptable; custom OG per tutorial/homework would need designed assets. |

---

## 3. Missing public content (not inventable in repo)

| Gap | Recommendation |
|-----|----------------|
| **Standalone “About” page** | Not required — home hero, footer, and FAQ cover organization context per FUT-022 route audit. |
| **Contact page** | Registration gateway + FAQ registration section are the intended contact path. |
| **Team Shot Tracker crossover** | Intentionally excluded (`FORBIDDEN_CROSSOVER_PRODUCTS`). |
| **Testimonials / rankings claims** | Do not add without verified, approved copy. |
| **Pricing in meta descriptions** | Early Bird pricing is dynamic on home — do not hard-code prices in SEO strings. |
| **Athlete profiles in sitemap** | Remains excluded until Mike approves FUT-025 athlete indexing cutover separately from program indexing. |

---

## 4. Recommended page titles and descriptions

Current titles/descriptions are parent-facing and fact-aligned. Recommended **keep as-is** unless Mike wants tone tweaks:

| Route | Title (document) | Meta description (summary) |
|-------|------------------|----------------------------|
| `/shoot` | Shooting Challenge \| Online Youth Basketball — Earn XP, Climb 12 Levels | Annual online Educational Athletics challenge, grades 1–12, May 1–June 30, XP/levels/homework/video feedback. |
| `/shoot/faq` | FAQ — Youth Basketball Shooting Challenge \| Shooting Challenge | Grades, Educational Athletics, submissions, XP, video feedback, Zoom, Fairfield context, registration. |
| `/shoot/leaderboard` | Season Leaderboard — Youth Basketball Rankings \| Shooting Challenge | Live rankings with XP, levels, total shots. |
| `/shoot/homework` | Weekly Homework — Youth Basketball Training \| Shooting Challenge | Published weekly assignments and curriculum. |
| `/shoot/tutorials` | Shooting Tutorials — Skills and Technique \| Shooting Challenge | Technique videos and film study. |
| `/shoot/levels` | XP Levels — Basketball Progress Tracking \| Shooting Challenge | Beginner through G.O.A.T. ladder with XP thresholds. |
| `/shoot/achievements` | Achievements — Milestones and Streaks \| Shooting Challenge | Milestones, streaks, badges. |
| `/shoot/shoutouts` | Athlete Shoutouts — Highlights and Recognition \| Shooting Challenge | Athlete highlights and recognition. |
| `/shoot/articles` | FBC Articles — Basketball Education \| Shooting Challenge | FBC readings and education content. |
| `/shoot/zoom-meetings` | Zoom Meetings — Remote Coaching Sessions \| Shooting Challenge | Schedules, agendas, recordings. |
| `/shoot/game-manual` | Game Manual — Rules, Scoring, and XP \| Shooting Challenge | Official scoring, XP rules, program reference. |
| **Dynamic detail pages** | `{Published title}` \| Shooting Challenge | First sentence from Airtable brief description or safe fallback — already implemented in `generateMetadata`. |

**Parent-facing search phrases to target (copy already reflects these):**

- youth basketball shooting challenge online  
- basketball homework for kids grades 1–12  
- youth basketball XP progress tracking  
- online basketball training program May June  

---

## 5. Structured-data opportunities

| Schema | Where | Status |
|--------|-------|--------|
| Organization | Home, FAQ | Live |
| SportsOrganization | Home | Live |
| WebSite | Home | Live |
| FAQPage | FAQ | Live |
| BreadcrumbList | FAQ, all catalog + detail pages | **Added in this PR** |
| CollectionPage | Catalog listing pages | **Added in this PR** |
| WebPage | Homework, tutorials, shoutouts, articles, zoom, levels detail | **Added in this PR** |
| VideoObject | Tutorial/shoutout detail with canonical video URL | **Deferred** — requires stable public video URLs and privacy review per clip. |
| Course / LearningResource | Homework detail | **Deferred** — needs curriculum approval for `teaches` / duration claims. |
| Event | Zoom meeting detail | **Deferred** — meeting times must come from Airtable datetime fields with timezone accuracy. |

---

## 6. Search Console steps Mike must complete

1. **Add property** in [Google Search Console](https://search.google.com/search-console) for `https://www.fairfieldbasketballclub.com/` (Domain or URL-prefix). Prefer **Domain** property if DNS access is available.
2. **Verify ownership** via DNS TXT (domain) or HTML file/meta tag (URL-prefix). Do not commit verification tokens to GitHub — set in Vercel env or host at site root if required.
3. **Submit sitemap:** `https://www.fairfieldbasketballclub.com/shoot/sitemap.xml`
4. **Confirm indexing flag** on Vercel Production: `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` (already documented in PROJECT_STATE).
5. **Inspect URLs** after deploy: home, `/shoot/faq`, `/shoot/homework`, one dynamic homework URL.
6. **Monitor Coverage** for unexpected `/shoot/athletes/` indexing — should stay excluded; robots + meta enforce noindex.
7. **Optional:** Bing Webmaster Tools — same sitemap URL.
8. **Optional:** Google Business Profile — only if Mike wants local Fairfield discovery separate from national online program positioning.

---

## 7. Safe repository changes (this PR)

| Change | Files |
|--------|-------|
| Breadcrumb + CollectionPage/WebPage JSON-LD utilities | `web/lib/seo/structured-data.ts`, tests |
| Catalog/detail JSON-LD components wired to public pages | `web/components/seo/*`, `web/app/(program)/**/page.tsx` |
| FAQ graph includes BreadcrumbList | `web/lib/seo/metadata.ts` |
| Mobile viewport + theme-color + `applicationName` | `web/app/layout.tsx` |
| Footer internal links for Shoutouts + Articles | `web/lib/site-chrome/footer-config.ts` |
| Playwright assertions for new structured data | `web/tests/national-seo.spec.ts` |
| This audit report | `web/docs/seo-audit-report-2026-08-30.md` |

**Preserved:** athlete `noindex`, sitemap exclusion for `/athletes/*`, env var names, program dates/eligibility from `program-facts.ts`, no invented pricing or testimonials.

---

## 8. Changes requiring Mike approval

| Item | Why approval needed |
|------|---------------------|
| **Deploy to Vercel Production** | Standard release gate — review PR diff first. |
| **`NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true`** | Separate FUT-025 cutover; profiles still excluded from sitemap by design. |
| **GSC verification token / DNS** | Lives outside repo. |
| **VideoObject / Event schema on detail pages** | Needs content and datetime accuracy review. |
| **Custom OG images per catalog item** | Design/asset approval. |
| **New public routes** (About, Contact, blog) | FUT-022 rejected duplicates — any new page needs backlog ID. |
| **Pricing or participation claims in SEO copy** | Must match live registration/pricing sources. |
| **Removing or weakening athlete privacy metadata** | Privacy policy alignment. |

---

## Validation commands

From `web/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true npm run test:e2e -- tests/national-seo.spec.ts tests/search-indexing.spec.ts
```

Post-merge production smoke (Mike or agent with prod access):

```bash
npm run test:smoke:prod
```

---

## Related docs

- [seo.md](./seo.md) — indexing policy and metadata builder  
- [site-hierarchy.md](./site-hierarchy.md) — canonical routes  
- [production-closeout.md](./production-closeout.md) — env vars  
- [../../docs/deploy-checklists/2026-08-25-web-search-indexing-cutover.md](../../docs/deploy-checklists/2026-08-25-web-search-indexing-cutover.md)
