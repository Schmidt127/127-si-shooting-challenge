# S26 — Website overnight progress (W1–W3)

**Started:** 2026-07-14  
**Lane:** Lead (`overnight/lead-integration`)  
**Scope:** `web/` only (+ this progress doc). No Airtable automations. No prod Vercel secrets.

## Goals

1. Audit: safe TS/lint/build fixes + backlog here
2. Design-system primitives (shell, nav, cards, stats, badges, level, empty/loading/error)
3. Athlete dashboard (identity, level, XP, progress, weekly shots, streak, Perfect Week, teasers)
4. Leaderboard mobile + grade-band filter
5. Run build / typecheck / lint; report results

## Status

| Step | State | Notes |
|------|-------|-------|
| Progress doc | DONE | This file |
| Audit quick | DONE | No pre-existing blocking TS/lint; small fixes in new UI code |
| Design primitives | DONE | `web/components/ui/*` |
| Athlete dashboard | DONE | `/dashboard` mock adapter |
| Leaderboard filter | DONE | Grade-band client filter + mobile cards already present |
| Build report | DONE | typecheck/lint/test/build PASS |

## Test / build results (2026-07-14)

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 warnings) |
| `npm test` | PASS 11 files / 43 tests (incl. grade-bands) |
| `npm run build` | PASS — includes `/dashboard`, `/leaderboard` (5.05 kB) |

## Routes improved

| Route | Change |
|-------|--------|
| `/dashboard` | New athlete program home (mock data) |
| `/leaderboard` | Grade-band filter (K–5 / 6–8 / 9–12 / Other); shared empty/error UI |
| ProductShell nav | Active route highlight + horizontal scroll on mobile; Dashboard link |
| Overview hub | Card link to Dashboard |

## Files changed (primary)

- `web/components/ui/` — page frame, interactive card, stat tile, badges, progress, level indicator, empty/loading/error
- `web/components/dashboard/athlete-dashboard-view.tsx`
- `web/app/(program)/dashboard/page.tsx`, `loading.tsx`
- `web/lib/data/athlete-dashboard.ts`, `grade-bands.ts` (+ test)
- `web/components/leaderboard/grade-band-filter.tsx`, `leaderboard-board.tsx`
- `web/components/leaderboard/leaderboard-view.tsx`, `leaderboard-table.tsx`
- `web/components/layout/product-nav.tsx`, `product-shell.tsx`
- `web/lib/navigation/shooting-challenge-nav.ts`, `program-hub-links.ts`
- `web/docs/site-hierarchy.md`, `page-plan.md`
- `web/components/catalog/catalog-surface.ts` (amber card: violet → brand-blue)

## Backlog (web)

- Wire `loadAthleteDashboard` to Airtable (requires auth / enrollment key) — still mock
- `/athletes/[slug]` still PlaceholderPage — can reuse dashboard sections
- Ambient glow variants still use some violet/pink (levels/articles/shoutouts) — brand cleanup pass
- ProductShell nav is long on mobile; consider overflow “More” menu later
- Wire achievements teaser to live Achievement unlocks per athlete

## Blockers

- None for repo-level UI. Live athlete data blocked on auth/enrollment API (intentional mock).
- No prod Vercel env/secrets touched.
