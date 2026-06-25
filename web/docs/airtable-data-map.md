# Airtable Data Map (Web App)

Maps Airtable tables and fields to web app features. Align with [table-map.md](../../airtable/schema/current/table-map.md) and schema snapshots in the parent repo.

## Primary tables

| Airtable table | Web feature | Notes |
|----------------|-------------|-------|
| **Enrollments** | Leaderboard, athlete profiles, dashboard | Primary public identity per athlete-season |
| **Weekly Athlete Summary** | Weekly XP rollups, profile charts | Link via Enrollment + Week |
| **XP Events** | Activity feed, XP breakdown | Read-only; respect Active? |
| **Levels** | Levels page, profile badge | Use Sort Order for display |
| **Achievements** | Achievements page, profile badges | Filter publishable rows |
| **Homework Completions** | Homework progress widget | Reviewed / upload status only |
| **Video Feedback** | Video progress widget | Awarded rows only for public |
| **Athletes** | Display name, photo | Linked from Enrollment |
| **Weeks** | Labels, date ranges | For weekly views |

## Publish / visibility fields

Softr-era fields to honor until renamed:

| Field | Table | Use |
|-------|-------|-----|
| `OK to Publish on Softr` | Achievements, Tutorials, etc. | Public page inclusion |
| `Level Sort Order - For Softr` | Enrollments (lookup) | Leaderboard / level ordering |

**Rule:** Public routes must filter on publish flags. Never expose parent email, phone, or internal debug fields.

## Suggested Airtable views (create in base)

| View name | Table | Filter |
|-----------|-------|--------|
| `Web - Leaderboard` | Enrollments | Active, has Total XP, sort by XP desc |
| `Web - Public Profiles` | Enrollments | Publishable slug present |
| `Web - Levels` | Levels | Active / ordered by Sort Order |
| `Web - Achievements Catalog` | Achievements | OK to Publish |
| `Web - Homework Catalog` | FBC Curriculum - SYNC | Published? |

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
| `AIRTABLE_API_TOKEN` | Personal access token (data.records:read) |
| `AIRTABLE_BASE_ID` | Production base ID |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata |
| `SITE_ACCESS_TOKEN` | Optional gate for preview deployments |

## Related automation scripts

Data quality for the website depends on the pipeline work in the parent repo (Stages A–H). Re-run audits after bulk backfills.
