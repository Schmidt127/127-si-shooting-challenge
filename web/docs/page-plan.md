# Page Plan

> **Canonical routing and nav:** [site-hierarchy.md](./site-hierarchy.md) — update that file first when URLs or nav labels change. This doc tracks **phases** and **component ownership** only.

---

## Route summary (current)

See [site-hierarchy.md](./site-hierarchy.md) for the full table. Highlights:

| URL | Role | Status |
|-----|------|--------|
| `/` | Hoop Challenges hub (program picker) | Live |
| `/shooting-challenge` | Shooting Challenge overview | Live |
| `/shooting-challenge/leaderboard` | Season XP rankings | Live |
| `/homework`, `/tutorials`, `/shoutouts`, `/articles`, `/zoom-meetings`, `/levels`, `/achievements`, `/game-manual`, `/public-display` | Shooting Challenge catalog (root URLs, shared nav) | Live / partial |
| `/athletes/[slug]` | Public athlete profile | Planned |
| `/admin` | Staff tools | Planned |
| `/api/airtable` | Health + future BFF | Scaffold |

**Legacy redirect:** `/leaderboard` → `/shooting-challenge/leaderboard` (see `next.config.ts`).

---

## Phases

| Phase | Scope |
|-------|--------|
| **0** | Pipeline scaffold, hub, catalog shells, CI | Done |
| **1** | Leaderboard + levels + public display with live Airtable reads | In progress |
| **2** | Athlete profiles, homework/video progress widgets | Planned |
| **3** | Participant dashboard (auth) | Planned |
| **4** | Achievements polish, charts | Planned |
| **5** | Admin | Planned |
| **6** | Softr cutover, SEO, custom domain | Planned |

---

## Component ownership

| Area | Folder |
|------|--------|
| Hub landing | `components/hub/` |
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
- Post–Softr cutover: allow index on hub, program pages, and public leaderboard only
