# Airtable Data Map (Web App)

Maps Airtable tables and fields to web app features.

**Canonical sources:**

| Doc | Purpose |
|-----|---------|
| This file | Table → feature map, env vars |
| [airtable-views.md](./airtable-views.md) | View names + fallback filters (matches `queries.ts`) |
| [../../airtable/schema/snapshots/](../../airtable/schema/snapshots/) | Dated schema exports — latest: `20260628_130208` |
| [../../airtable/schema/current/](../../airtable/schema/current/) | Hand-maintained change notes |

## Primary tables

| Airtable table | Web feature | Notes |
|----------------|-------------|-------|
| **Enrollments** | Leaderboard, athlete profiles, dashboard | Primary public identity per athlete-season |
| **Weekly Athlete Summary** | Weekly XP rollups, profile charts | Link via Enrollment + Week |
| **XP Events** | Activity feed, XP breakdown | Read-only; respect Active? |
| **Levels** | Levels page, profile badge | Use Sort Order for display |
| **Achievements** | Achievements page, profile badges | Filter `Active?` + `Visible?` |
| **FBC Curriculum - SYNC** | Homework catalog + detail | Filter `Published?` |
| **Tutorials** | Tutorials, shoutouts, articles | Split by `Tutorial Type` in app |
| **Zoom Meetings** | Zoom meetings catalog + detail | Exclude cancelled |
| **Homework Completions** | Homework progress widget | Reviewed / upload status only |
| **Video Feedback** | Video progress widget | Awarded rows only for public |
| **Athletes** | Display name, photo | Linked from Enrollment |
| **Weeks** | Labels, date ranges | For weekly views |

## Publish / visibility fields

Softr-era fields to honor until renamed:

| Field | Table | Use |
|-------|-------|-----|
| `Active?` + `Visible?` | Achievements | Achievements page (`Web - Achievements` or formula fallback) |
| `Published?` | FBC Curriculum - SYNC | Homework catalog |
| `OK to Publish on Softr` | Tutorials | Tutorials / shoutouts / articles |
| `Active?` | Enrollments, Levels | Leaderboard and levels ladder |
| `Level Sort Order - For Softr` | Enrollments (lookup) | Leaderboard / level ordering |

**Rule:** Public routes must filter on publish flags. Never expose parent email, phone, or internal debug fields.

## Airtable views used by the web app

These names must match `web/lib/airtable/queries.ts`. Full fallback formulas: [airtable-views.md](./airtable-views.md).

| View name | Table | Used for | Fallback if view missing |
|-----------|-------|----------|--------------------------|
| `Web - Leaderboard` | Enrollments | Leaderboard, public display | `AND({Active?}, {Lifetime XP Total} >= 0)` |
| `Web - Homework Catalog` | FBC Curriculum - SYNC | Homework list | `{Published?} = 1` |
| `Web - Levels` | Levels | Levels ladder | `{Active?} = 1` |
| `Web - Tutorials Catalog` | Tutorials | Tutorials, shoutouts, articles | Softr publish + Shooting Challenge program filter |
| `Web - Zoom Meetings` | Zoom Meetings | Zoom list | `NOT({Meeting Status} = 'Cancelled')` |
| `Web - Achievements` | Achievements | Achievements grid | `AND({Active?}, {Visible?})` |

**Not wired yet:** `Web - Public Profiles` (future athlete slug routes).

## API access pattern

```
Browser → Next.js Server Component / Route Handler
       → lib/airtable/client.ts (Bearer token)
       → Airtable REST API
       → lib/data/* (map to types/*)
       → React components
```

## Slug strategy (TBD)

Pick one stable public key for `/athletes/[slug]`:

1. Enrollment record ID (opaque, stable) — easiest
2. Custom `Public Slug` formula (athlete-name-school-year) — SEO-friendly
3. Athlete ID + season — multi-season support

Document the chosen field here before Phase 2 ships.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AIRTABLE_API_TOKEN` | Personal access token (`data.records:read` on `appn84sqPw03zEbTT`) — **not** `AIRTABLE_API_KEY` |
| `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.hoopchallenges.com/shoot` |
| `SITE_ACCESS_TOKEN` | Optional gate for preview deployments |

**Health check:** `GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }`

## Related automation scripts

Data quality for the website depends on the pipeline work in the parent repo (Stages A–H). Re-run audits after bulk backfills.
