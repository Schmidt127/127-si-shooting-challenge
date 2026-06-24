# Page Plan

## Routes

| Route | Purpose | Phase | Data source |
|-------|---------|-------|-------------|
| `/` | Dev landing / future marketing home | 0 | Static |
| `/leaderboard` | Season XP rankings | 1 | Enrollments view |
| `/athletes/[slug]` | Public athlete profile | 2 | Enrollment + rollups |
| `/levels` | Level ladder reference | 1 | Levels table |
| `/achievements` | Achievement catalog | 1–2 | Achievements table |
| `/homework` | Homework progress overview | 2–3 | Homework Completions |
| `/public-display` | Gym / lobby full-screen mode | 1 | Leaderboard + featured |
| `/admin` | Staff tools | 5 | TBD + auth |
| `/api/airtable` | Health + future BFF endpoints | 0+ | Env config |

## Homepage (Phase 0)

Current content:

- **127 Sports Intensity Shooting Challenge**
- **Private Development Site**
- **Pipeline Test: Cursor → GitHub → Vercel → Airtable**

## Component ownership

| Area | Folder |
|------|--------|
| Shell, nav, footer | `components/layout/` |
| Leaderboard table/cards | `components/leaderboard/` |
| Profile header, stats | `components/athlete/` |
| Generic stat cards | `components/cards/` |
| XP trend charts | `components/charts/` |
| Level ladder UI | `components/levels/` |
| Badge grid | `components/achievements/` |
| Placeholders, buttons | `components/shared/` |

## Layout notes

- Dark sports theme on homepage (brand colors in `globals.css`)
- Public display route will use a separate minimal layout (no nav)
- Admin route will use auth wrapper when implemented

## SEO / robots

- Phase 0: `robots: noindex` on root layout
- Phase 6: allow index on public marketing + leaderboard pages only
