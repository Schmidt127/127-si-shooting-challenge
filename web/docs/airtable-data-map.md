# Airtable Data Map (Web App)

Maps Airtable tables and fields to web app features.

**Canonical sources:**

| Doc | Purpose |
|-----|---------|
| This file | Table → feature map, env vars |
| [airtable-views.md](./airtable-views.md) | View names and documented fallback policy (matches `queries.ts`) |
| [../../airtable/schema/snapshots/](../../airtable/schema/snapshots/) | Dated schema exports — latest: **`prod-20260819/`** (`20260819_184903`) |
| [../../airtable/schema/current/](../../airtable/schema/current/) | Hand-maintained change notes |

## Primary tables

| Airtable table | Web feature | Notes |
|----------------|-------------|-------|
| **Enrollments** | Leaderboard, athlete profiles, dashboard | Primary public identity per athlete-season |
| **Weekly Athlete Summary** | Weekly XP rollups, profile charts | Link via Enrollment + Week |
| **XP Events** | Activity feed, XP breakdown | Read-only; respect Active? |
| **Levels** | Levels page, profile badge | Use Sort Order for display |
| **Achievements** | Achievements page, profile badges | Filter `Active?` + `Visible?` |
| **Homework Library** | Homework lesson content (catalog fields) | Reusable content; week/season schedule via PHA |
| **Program Homework Assignments** | Scheduled homework for current season | Links Homework Library + Week + Program Instance |
| **Tutorials** / **Tutorials & Assets** | Tutorials, shoutouts, articles | App reads `Tutorials` where present; assets in `Tutorials & Assets` |
| **Zoom Meetings** | Zoom meetings catalog + detail | Exclude cancelled |
| **Homework Completions** | Homework progress widget | Reviewed / upload status only |
| **Video Feedback** | Video progress widget | Awarded rows only for public |
| **Athletes** | Display name, photo | Linked from Enrollment |
| **Weeks** | Labels, date ranges | For weekly views |

## Publish / visibility fields

Registration consent authorizes publication of game-related participant
information. It does not authorize exposure of birthday, exact age, contact
information, guardian information, addresses, internal notes, administrative
fields, debug fields, or Airtable record IDs.

Softr-era fields to honor until renamed:

| Field | Table | Use |
|-------|-------|-----|
| `Active?` + `Visible?` | Achievements | Achievements page (`Web - Achievements` or formula fallback) |
| `Published?` | Homework Library | Homework catalog (via PHA schedule) |
| `OK to Publish on Softr` | Tutorials | Tutorials / shoutouts / articles |
| `Active?` | Enrollments, Levels | Leaderboard and levels ladder |
| `Level Sort Order - For Softr` | Enrollments (lookup) | Leaderboard / level ordering |

**Rule:** Public routes must apply the relevant catalog visibility filters and
the active-season rules. Never expose private or operational fields.

## Airtable views used by the web app

These names must match `web/lib/airtable/queries.ts`. Full fallback formulas: [airtable-views.md](./airtable-views.md).

| View name | Table | Used for | Fallback if view missing |
|-----------|-------|----------|--------------------------|
| `Web - Leaderboard` | Enrollments | Leaderboard, public display | Required — no table-wide fallback |
| `Web - Homework Catalog` | Homework Library | Homework list (legacy view name; app uses PHA + Library) | `{Published?} = 1` on Library |
| `Web - Levels` | Levels | Levels ladder | `{Active?} = 1` |
| `Web - Tutorials Catalog` | Tutorials | Tutorials, shoutouts, articles | Softr publish + Shooting Challenge program filter |
| `Web - Zoom Meetings` | Zoom Meetings | Zoom list | `NOT({Meeting Status} = 'Cancelled')` |
| `Web - Achievements` | Achievements | Achievements grid | `AND({Active?}, {Visible?})` |

**Not wired yet:** `Web - Public Profiles` (future player slug routes).

## API access pattern

```
Browser → Next.js Server Component / Route Handler
       → lib/airtable/client.ts (Bearer token)
       → Airtable REST API
       → lib/data/* (map to types/*)
       → React components
```

## Slug strategy (SC-111)

Public player profiles use a stable public slug from Enrollment:

| Field | Role |
|-------|------|
| `Public Profile Slug` | Stable public path segment for `/players/[publicPlayerId]` |

Registration consent is the publication basis for game-related profile data;
`Public Profile Enabled` is not a required consent gate. Query by exact slug;
require `Active?`; duplicate slugs fail closed (not-found + server log).
Never use Airtable record IDs in public URLs.

**Wired:** `Web - Leaderboard` is required for standings; profile query is
formula-based (no dedicated view required).
**Operator note:** a missing `Web - Leaderboard` view is a stop condition. The
app fails closed rather than broadening to active Enrollments.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `AIRTABLE_API_TOKEN` | Personal access token (`data.records:read` on `appn84sqPw03zEbTT`) — **not** `AIRTABLE_API_KEY` |
| `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` |
| `SITE_ACCESS_TOKEN` | Optional gate for preview deployments |

**Health check:** `GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }`

## Related automation scripts

Data quality for the website depends on the pipeline work in the parent repo (Stages A–H). Re-run audits after bulk backfills.
