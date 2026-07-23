# Current Web Architecture — Shooting Challenge `/shoot`

**Agent 6 overnight audit** · 2026-07-23 · Repo: `127-si-shooting-challenge` · App root: `web/`

Related: `web/docs/site-hierarchy.md`, `web/docs/public-data-rules.md`, `web/docs/admin-roadmap.md`, `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (SC-102…SC-118)

---

## 1. Framework and deployment

| Item | Reality |
|------|---------|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.8 |
| Styling | Tailwind CSS 4 + shadcn-style components in `web/components/ui/` |
| basePath | `/shoot` (`NEXT_PUBLIC_BASE_PATH`, default in `next.config.ts`) |
| Hosting | Vercel — project Root Directory = `web`; mounted at `hoopchallenges.com/shoot` via landing rewrite |
| `vercel.json` | Redirects project root `/` → `/shoot` (non-permanent) |
| Local dev | `npm run dev` → port 3001 (`web/dev.ps1` helper) |
| Unit tests | Vitest (`npm run test`) — 15+ test files in `web/lib/**` |
| E2E tests | Playwright (`web/playwright.config.ts`, chromium, `npx next start -p 3001`) |

## 2. Routes (App Router, `(program)` group)

**Public catalog routes (live Airtable):**

| Route | Data source | Loading | Empty | Error |
|-------|-------------|---------|-------|-------|
| `/` (home) | static + nav | — | — | — |
| `/leaderboard` | Enrollments (`Web - Leaderboard` view, fallback formula) | ✔ `loading.tsx` | ✔ | ✔ try/catch |
| `/homework` + `/homework/[id]` | FBC Curriculum - SYNC (`Web - Homework Catalog`) + Weeks | ✔ | ✔ | ✔ |
| `/tutorials`, `/shoutouts`, `/articles` (+ `[id]`) | Tutorials (`Web - Tutorials Catalog`) | ✔ | ✔ | ✔ |
| `/levels` + `/levels/[id]` | Levels (`Web - Levels`) | ✔ | ✔ | ✔ |
| `/achievements` | Achievements (`Web - Achievements`) | ✔ | ✔ | ✔ |
| `/zoom-meetings` + `[id]` | Zoom Meetings (`Web - Zoom Meetings`) + Weeks | ✔ | ✔ | ✔ |
| `/game-manual` | env URL + **(new this session)** XP Reward Rules + Levels config | ✔ | ✔ | ✔ |
| `/public-display` | Leaderboard data | ✔ | ✔ | ✔ |

**Mock / placeholder routes (no live participant data):**

| Route | Status |
|-------|--------|
| `/dashboard` | Mock model (`lib/data/athlete-dashboard.ts`) — clearly demo, no Airtable |
| `/athletes/[slug]` | Mock adapter (`lib/data/athlete-profile.ts` → `loadAthleteProfile`) — returns mock until auth decision (SC-112); `noindex` per-page |
| `/admin` | Placeholder + roadmap copy only; no participant data, no writes; `noindex` per-page |

**API routes:** `GET /api/airtable` — health/config check only (no record payloads); gated by `SITE_ACCESS_TOKEN` when set.

## 3. Airtable data clients

- `web/lib/airtable/client.ts` — server-only REST client; token from `AIRTABLE_API_TOKEN`; pagination; `next.revalidate` caching per query; typed errors (`AirtableApiError`).
- `web/lib/airtable/queries.ts` — one fetch function per feature; **view-first with formula fallback** (`isMissingAirtableViewError`), so pages survive missing `Web - *` views on the rebuilt PROD base.
- `web/lib/data/*` — pure mapping/normalizing modules (unit-tested), tolerant of malformed values via `asText`/`asNumber`/`asBoolean` (`airtable-values.ts`).
- **No browser-side Airtable calls anywhere.** All fetches happen in Server Components / route handlers.

## 4. Environment variables

| Var | Side | Purpose |
|-----|------|---------|
| `AIRTABLE_API_TOKEN` | server only | PAT, read scope |
| `AIRTABLE_BASE_ID` | server only | PROD base `appn84sqPw03zEbTT` (per `.env.example`) |
| `SITE_ACCESS_TOKEN` | server only | Optional preview gate (middleware + API) |
| `NEXT_PUBLIC_BASE_PATH` | client | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | client | hub link |
| `NEXT_PUBLIC_SITE_URL` | client | metadata base |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | client | Adobe-hosted manual link |

No secrets committed; `.env*` ignored (only `.env.example` / `.env.local.example` tracked).

## 5. Caching

- Airtable list fetches: `next: { revalidate }` — leaderboard 120 s, homework 300 s, catalogs 300 s.
- `/leaderboard` page ISR `revalidate = 120`.
- `/api/airtable` is `force-dynamic` (no caching of health data).
- No private data is cached because no private data is fetched.

## 6. Authentication / access control

- **Site gate (deployment-level):** `middleware.ts` + `lib/security/index.ts` — optional `SITE_ACCESS_TOKEN` via Bearer header, cookie, or query param (query token exchanged for httpOnly cookie then stripped from URL). When env var is unset the site is open.
- **Athlete auth:** none (SC-112 Decision Needed). Dashboard/profile are explicit mocks.
- **Staff/admin auth:** none; admin route is static placeholder by design.

## 7. SEO / indexing

- Sitewide `robots: { index: false, follow: false }` in `app/layout.tsx` (Softr dual-run).
- `/athletes/[slug]` and `/admin` re-assert `noindex` at page level.
- See `INDEXING-SEO-DECISION.md` (this folder) for removal conditions.

## 8. Schmidt visibility

- No code path filters out Schmidt or any named athlete — verified by repo scan and enforced by new unit test (`web/lib/release/public-standings.test.ts`).
- Standings composition is delegated to the `Web - Leaderboard` Airtable view; per SC-004 the *view filter* is where Mike may exclude the Schmidt **testing enrollment** — the web app itself stays name-blind.

## 9. Known gaps (fed into other Agent 6 docs)

1. Game manual was env-URL-only; config-driven rendering added this session (see `GAME-MANUAL-CONFIG-AUDIT.md`).
2. Athlete profiles/dashboard remain mocks pending SC-112 (see `ATHLETE-AUTH-DECISION.md`).
3. Playwright coverage was screenshot-only; assertion coverage added (see `PLAYWRIGHT-COVERAGE.md`).
4. Presentation fields (SC-054/SC-117) not yet in schema — web still reads primary fields via publish-safe views.
5. Softr-named fields still consumed: `OK to Publish on Softr`, `Level Sort Order - For Softr` (SC-144 rename pending; web must be updated in the same wave).
