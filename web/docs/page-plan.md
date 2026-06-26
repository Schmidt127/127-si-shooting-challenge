# Page Plan

> **Canonical routing and nav:** [site-hierarchy.md](./site-hierarchy.md) — update that file first when URLs or nav labels change. This doc tracks **phases** and **component ownership** only.

---

## Route summary (current)

See [site-hierarchy.md](./site-hierarchy.md) for the full table. Highlights:

| Public URL | Role | Status |
|------------|------|--------|
| `/shoot` | Shooting Challenge overview | Live |
| `/shoot/leaderboard` | Season XP rankings | Live |
| `/shoot/homework`, `/shoot/tutorials`, `/shoot/shoutouts`, `/shoot/articles`, `/shoot/zoom-meetings`, `/shoot/levels` | Catalog pages (shared nav) | Live |
| `/shoot/achievements`, `/shoot/game-manual`, `/shoot/public-display` | Shell / partial | In progress |
| `/shoot/athletes/[slug]` | Public athlete profile | Planned |
| `/shoot/admin` | Staff tools | Planned |
| `/shoot/api/airtable` | Health + future BFF | Live |

**basePath:** `/shoot` via `NEXT_PUBLIC_BASE_PATH` in `next.config.ts`. No legacy redirects configured.

---

## Phases

| Phase | Scope |
|-------|--------|
| **0** | Pipeline scaffold, catalog shells, CI, `/shoot` basePath | Done |
| **1** | Leaderboard + levels + catalogs with live Airtable reads | In progress |
| **2** | Athlete profiles, homework/video progress widgets | Planned |
| **3** | Participant dashboard (auth) | Planned |
| **4** | Achievements polish, charts | Planned |
| **5** | Admin | Planned |
| **6** | Softr cutover, SEO, custom domain | Planned |

---

## Component ownership

| Area | Folder |
|------|--------|
| Shell, nav, footer | `components/layout/` |
| Leaderboard | `components/leaderboard/` |
| Profile | `components/athlete/` |
| Catalog cards / lists | `components/catalog/` |
| Generic stat cards | `components/cards/` |
| XP trend charts | `components/charts/` |
| Level ladder | `components/levels/` |
| Achievement grid | `components/achievements/` |
| Shared UI | `components/shared/` |

---

## SEO / robots

- Pre-launch: `noindex` on sensitive routes where configured
- Post–Softr cutover: allow index on program pages and public leaderboard only

---

## Cleanup backlog

- Wire achievements page to Airtable
- Add landing-site rewrites for any old bookmarked URLs if needed
