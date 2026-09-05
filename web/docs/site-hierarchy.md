# Site hierarchy — Shooting Challenge web app

**Canonical route map** for the Next.js app in `web/`. Update this file first when URLs or nav labels change.

## Deployment context

| Setting | Value |
|---------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| Public URL prefix | `https://www.fairfieldbasketballclub.com/shoot` |
| Official landing | `https://www.fairfieldbasketballclub.com` |
| App source routes | `web/app/(program)/` |
| Nav definition | `web/lib/navigation/shooting-challenge-nav.ts` |
| Shell | `ProductShell` in `web/app/(program)/layout.tsx` |

Nav `href` values are **relative to basePath** (e.g. `/leaderboard` → public `/shoot/leaderboard`).

---

## Public routes (canonical)

| Public URL | App path | Page | Airtable data | Status |
|------------|----------|------|---------------|--------|
| `/shoot` | `/` | Overview — registration, pricing, How it works, **About the Coach** | Leaderboard (top 3) + Program Instance pricing | Live |
| `/shoot/faq` | `/faq` | Program FAQ — grades, registration, Educational Athletics, Early Bird timing, privacy, remote access, **gift card award commitment** | — | Live |
| `/shoot/dashboard` | `/dashboard` | Private family dashboard (parent magic-link) | Live enrollment data when authenticated | Live — **header/mobile/footer link to sign-in**; dashboard itself stays auth-gated |
| `/shoot/dashboard/sign-in` | `/dashboard/sign-in` | Parent magic-link sign-in | — | Live — public Family Dashboard entry |
| `/shoot/leaderboard` | `/leaderboard` | Season leaderboard | Enrollments (`Web - Leaderboard`) | Live |
| `/shoot/homework` | `/homework` | Homework catalog | Program Homework Assignments + Homework Library + Weeks | Live |
| `/shoot/homework/[id]` | `/homework/[id]` | Homework detail | Program Homework Assignments + Homework Library + Weeks | Live |
| `/shoot/tutorials` | `/tutorials` | Skills and Technique Tutorials | Tutorials & Assets (`Web - Tutorials Catalog`) | Live |
| `/shoot/tutorials/[id]` | `/tutorials/[id]` | Tutorial detail | Tutorials & Assets | Live |
| `/shoot/shoutouts` | `/shoutouts` | Shout-outs | Tutorials & Assets (shoutout type) | Live |
| `/shoot/shoutouts/[id]` | `/shoutouts/[id]` | Shout-out detail | Tutorials & Assets | Live |
| `/shoot/articles` | `/articles` | FBC articles | Tutorials & Assets (article type) | Live |
| `/shoot/articles/[id]` | `/articles/[id]` | Article detail | Tutorials & Assets | Live |
| `/shoot/zoom-meetings` | `/zoom-meetings` | Zoom meetings | Zoom Meetings (`Web - Zoom Meetings`) | Live |
| `/shoot/zoom-meetings/[id]` | `/zoom-meetings/[id]` | Meeting detail + recording-credit presentation | Zoom Meetings + Weeks | Live |
| `/shoot/levels` | `/levels` | Level ladder | Levels (`Web - Levels`) | Live |
| `/shoot/levels/[id]` | `/levels/[id]` | Level detail | Levels | Live |
| `/shoot/achievements` | `/achievements` | Achievements | Achievements (`Web - Achievements` or active+visible filter) | Live |
| `/shoot/game-manual` | `/game-manual` | Game manual | Static / CMS TBD | Live |
| `/shoot/public-display` | `/public-display` | TV / kiosk full-screen leaderboard | Leaderboard subset | Live gym/ops URL — **hidden from public nav/hub** |
| `/shoot/athletes/[slug]` | `/athletes/[slug]` | Athlete profile (public progress) | Enrollments + XP presentation | Live when family shares a public slug; `noindex` by default |
| `/shoot/admin` | `/admin` | Staff tools | Health/roadmap only | Placeholder — see [admin-roadmap.md](./admin-roadmap.md) |
| `/shoot/api/airtable` | `/api/airtable` | Health check | — | Live |

Views and filters: [airtable-views.md](./airtable-views.md)

Route audit (Dashboard / Display decisions): [public-route-audit-2026-08-30.md](./public-route-audit-2026-08-30.md)

Smoke coverage: family-facing paths in `web/lib/release/public-surface.ts` (`FAMILY_FACING_SMOKE_PATHS`); operator routes (`/dashboard`, `/public-display`) smoke-tested by direct URL only. Family Dashboard sign-in is family-facing.

---

## Navigation (ProductShell)

Order from `SHOOTING_CHALLENGE_NAV` + `nav-priority.ts`:

**Primary**

1. Overview → `/`
2. Leaderboard → `/leaderboard`
3. Homework → `/homework`
4. Levels → `/levels`
5. Zoom Meetings → `/zoom-meetings`

**Resources**

6. Tutorials → `/tutorials`
7. Shoutouts → `/shoutouts`
8. Articles → `/articles`

**More**

9. Game Manual → `/game-manual`
10. FAQ → `/faq`
11. Achievements → `/achievements`
12. Family Dashboard → `/dashboard/sign-in`

**Not in public catalog chrome** (direct URL only except Family Dashboard sign-in): `/dashboard` (private), `/public-display`, `/admin`, `/athletes/[slug]`

Family Dashboard sign-in (`/dashboard/sign-in` → public `/shoot/dashboard/sign-in`) appears in:

- Header (desktop/tablet, outline button — secondary to Leaderboard)
- Main nav → More (desktop/tablet)
- Mobile navigation enrolled CTA (catalog list omits a duplicate FD row)
- Footer quick links
- Homepage parent section and FAQ get-started section

Footer quick links: `web/lib/site-chrome/footer-config.ts`.

---

## API routes

| Public URL | Handler | Purpose |
|------------|---------|---------|
| `/shoot/api/airtable` | `app/api/airtable/route.ts` | PAT configured check, future BFF |

---

## Route layout

All public pages live under `web/app/(program)/`. Root `web/app/` contains only layout, error handling, and the API health route.

**No redirects** in `next.config.ts` for Dashboard/Display — routes stay live for bookmarks and gym displays; they are simply omitted from nav/hub.

---

## Related docs

- [page-plan.md](./page-plan.md) — build phases and component ownership
- [airtable-views.md](./airtable-views.md) — views and publish filters
- [deployment-notes.md](./deployment-notes.md) — Vercel and env vars
- [seo.md](./seo.md) — national SEO foundation (FUT-020–024)
- [../../docs/PROJECT_STATE.md](../../docs/PROJECT_STATE.md) — live ops snapshot
