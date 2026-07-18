# Site hierarchy — Shooting Challenge web app

**Canonical route map** for the Next.js app in `web/`. Update this file first when URLs or nav labels change.

## Deployment context

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| Public URL prefix | `https://www.hoopchallenges.com/shoot` |
| App source routes | `web/app/(program)/` |
| Nav definition | `web/lib/navigation/shooting-challenge-nav.ts` |
| Shell | `ProductShell` in `web/app/(program)/layout.tsx` |

Nav `href` values are **relative to basePath** (e.g. `/leaderboard` → public `/shoot/leaderboard`).

---

## Public routes (canonical)

| Public URL | App path | Page | Airtable data | Status |
|------------|----------|------|---------------|--------|
| `/shoot` | `/` | Overview | — | Live |
| `/shoot/dashboard` | `/dashboard` | Athlete dashboard (mock until auth) | Mock adapter | Demo — not cutover-ready |
| `/shoot/leaderboard` | `/leaderboard` | Season leaderboard | Enrollments (`Web - Leaderboard`) | Live |
| `/shoot/homework` | `/homework` | Homework catalog | FBC Curriculum (`Web - Homework Catalog`) | Live |
| `/shoot/homework/[id]` | `/homework/[id]` | Homework detail | FBC Curriculum + Weeks | Live |
| `/shoot/tutorials` | `/tutorials` | Tutorials catalog | Tutorials (`Web - Tutorials Catalog`) | Live |
| `/shoot/tutorials/[id]` | `/tutorials/[id]` | Tutorial detail | Tutorials | Live |
| `/shoot/shoutouts` | `/shoutouts` | Shout-outs | Tutorials (shoutout type) | Live |
| `/shoot/shoutouts/[id]` | `/shoutouts/[id]` | Shout-out detail | Tutorials | Live |
| `/shoot/articles` | `/articles` | FBC articles | Tutorials (article type) | Live |
| `/shoot/articles/[id]` | `/articles/[id]` | Article detail | Tutorials | Live |
| `/shoot/zoom-meetings` | `/zoom-meetings` | Zoom meetings | Zoom Meetings (`Web - Zoom Meetings`) | Live |
| `/shoot/zoom-meetings/[id]` | `/zoom-meetings/[id]` | Meeting detail | Zoom Meetings + Weeks | Live |
| `/shoot/levels` | `/levels` | Level ladder | Levels (`Web - Levels`) | Live |
| `/shoot/levels/[id]` | `/levels/[id]` | Level detail | Levels | Live |
| `/shoot/achievements` | `/achievements` | Achievements | Achievements (`Web - Achievements` or active+visible filter) | Live |
| `/shoot/game-manual` | `/game-manual` | Game manual | Static / CMS TBD | Live |
| `/shoot/public-display` | `/public-display` | TV / kiosk display | Leaderboard subset | Live |
| `/shoot/athletes/[slug]` | `/athletes/[slug]` | Athlete profile | Mock adapter (auth TBD) | Demo — not cutover-ready |
| `/shoot/admin` | `/admin` | Staff tools | Health/roadmap only | Placeholder — see [admin-roadmap.md](./admin-roadmap.md) |
| `/shoot/api/airtable` | `/api/airtable` | Health check | — | Live |

Views and filters: [airtable-views.md](./airtable-views.md)

---

## Navigation (ProductShell)

Order from `SHOOTING_CHALLENGE_NAV`:

1. Overview → `/`
2. Dashboard → `/dashboard`
3. Leaderboard → `/leaderboard`
4. Tutorials → `/tutorials`
5. Homework → `/homework`
6. Shoutouts → `/shoutouts`
7. Articles → `/articles`
8. Zoom Meetings → `/zoom-meetings`
9. Game Manual → `/game-manual`
10. Levels → `/levels`
11. Achievements → `/achievements`
12. Display → `/public-display`

---

## API routes

| Public URL | Handler | Purpose |
|------------|---------|---------|
| `/shoot/api/airtable` | `app/api/airtable/route.ts` | PAT configured check, future BFF |

---

## Route layout

All public pages live under `web/app/(program)/`. Root `web/app/` contains only layout, error handling, and the API health route.

**No redirects** in `next.config.ts`. Old bookmarked URLs from the pre-rebuild hub (`/shooting-challenge/*`) will not resolve unless the landing site adds rewrites.

---

## Related docs

- [page-plan.md](./page-plan.md) — build phases and component ownership
- [airtable-views.md](./airtable-views.md) — views and publish filters
- [deployment-notes.md](./deployment-notes.md) — Vercel and env vars
- [../../docs/PROJECT_STATE.md](../../docs/PROJECT_STATE.md) — live ops snapshot
