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
| `/shoot/achievements` | `/achievements` | Achievements | *(planned — Achievements table)* | Shell |
| `/shoot/game-manual` | `/game-manual` | Game manual | Static / CMS TBD | Shell |
| `/shoot/public-display` | `/public-display` | TV / kiosk display | Leaderboard subset | Partial |
| `/shoot/athletes/[slug]` | `/athletes/[slug]` | Athlete profile | Enrollments + XP | Planned |
| `/shoot/admin` | `/admin` | Staff tools | — | Planned |
| `/shoot/api/airtable` | `/api/airtable` | Health check | — | Live |

Views and filters: [airtable-views.md](./airtable-views.md)

---

## Navigation (ProductShell)

Order from `SHOOTING_CHALLENGE_NAV`:

1. Overview → `/`
2. Leaderboard → `/leaderboard`
3. Tutorials → `/tutorials`
4. Homework → `/homework`
5. Shoutouts → `/shoutouts`
6. Articles → `/articles`
7. Zoom Meetings → `/zoom-meetings`
8. Game Manual → `/game-manual`
9. Levels → `/levels`
10. Achievements → `/achievements`
11. Display → `/public-display`

---

## API routes

| Public URL | Handler | Purpose |
|------------|---------|---------|
| `/shoot/api/airtable` | `app/api/airtable/route.ts` | PAT configured check, future BFF |
| `/shoot/api/tournament-brackets/svg` | `app/api/tournament-brackets/svg/route.ts` | Legacy — not in nav |

---

## Legacy / duplicate routes (remove in cleanup pass)

These folders exist **outside** `(program)/` from pre-rebuild hub layout. They are **not** the canonical Shooting Challenge routes:

| Path | Notes |
|------|-------|
| `web/app/leaderboard/`, `homework/`, `tutorials/`, etc. | Duplicate catalog pages without `(program)` shell |
| `web/app/shooting-challenge/` | Old `/shooting-challenge` prefix — superseded by basePath `/shoot` |
| `web/app/referee-clinics/`, `jr-referee-clinics/`, `kids-ref-now/` | JR Ref belongs in repo `127-si-jr-ref` |
| `web/app/dribbling-challenge/`, `tournament-brackets/` | Other programs — not in scope |
| `web/app/page.tsx` (root) | May redirect or stub — canonical entry is `(program)/page.tsx` |

**No redirects** are configured in `next.config.ts` today. Old bookmarked URLs (`/shooting-challenge/leaderboard`, `/leaderboard` without basePath) will not resolve unless the landing site adds rewrites.

---

## Related docs

- [page-plan.md](./page-plan.md) — build phases and component ownership
- [airtable-views.md](./airtable-views.md) — views and publish filters
- [deployment-notes.md](./deployment-notes.md) — Vercel and env vars
- [../../docs/PROJECT_STATE.md](../../docs/PROJECT_STATE.md) — live ops snapshot
