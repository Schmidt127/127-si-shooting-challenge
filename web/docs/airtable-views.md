# Airtable views and filters — web app

Documents every Airtable view and fallback filter used by `web/lib/airtable/queries.ts`.

**Base:** 127 SI Shooting Challenge (`appn84sqPw03zEbTT`)

Most catalog queries may use documented fallback filters. **Standings are the
exception:** `Web - Leaderboard` is required. A missing or renamed standings
view fails closed because a broad Enrollments query cannot prove exact Program
Instance scope from Airtable's public linked-record response.

---

## Summary table

| Feature | Table | View | Fallback filter | Revalidate (s) |
|---------|-------|------|-----------------|----------------|
| Leaderboard | Enrollments | `Web - Leaderboard` (required) | None — fail closed | 120 |
| Homework catalog | FBC Curriculum - SYNC | `Web - Homework Catalog` | `{Published?} = 1` | 300 |
| Homework detail | FBC Curriculum - SYNC | — | `AND({Published?}, RECORD_ID()='…')` | 300 |
| Weeks (homework/zoom) | Weeks | *(no view — all weeks)* | — | 300 |
| Levels | Levels | `Web - Levels` | `{Active?} = 1` | 300 |
| Tutorials / shoutouts / articles | Tutorials | `Web - Tutorials Catalog` | See publish filter below | 300 |
| Zoom meetings | Zoom Meetings | `Web - Zoom Meetings` | `NOT({Meeting Status} = 'Cancelled')` | 300 |
| Achievements | Achievements | `Web - Achievements` | `AND({Active?}, {Visible?})` | 300 |

---

## Leaderboard

**Function:** `fetchLeaderboard()`

| Item | Value |
|------|--------|
| Table | `Enrollments` |
| View | `Web - Leaderboard` |
| Max records | All pages (no silent cap) |
| Sort | In-app (`buildLeaderboardData`) — level sort order → XP → shots |

**Fields read:**

- `Active?`, `Athlete`, `Athlete ID Lookup`, `Program Instance`, `School Year`
- `Current Level`, `Current Level - Public Facing Display`, `Level Status`, `Level Sort Order - For Softr`
- `Full Athlete Name`, `School Name Lookup`, `Grade`
- `Athlete Headshot`, `Lifetime XP Total`, `Total Shots Counted`, `School Year`

**View contract:** exactly the configured active School Year and the one
`Shooting Challenge | <year>` Program Instance, active Enrollments only,
exactly one Athlete and Current Level, active Current Level, and settled
nonnegative Level Rank / Lifetime XP / counted shots. The web adapter resolves
the current scope through `Config` and `Program Instance - Synced`, validates
all returned rows again, rejects duplicate Athlete + Program Instance + School
Year identities, and never serializes Airtable Enrollment IDs.

**Failure behavior:** a missing/renamed view, duplicate identity, off-scope
row, or incomplete progression/total fails closed. Repair the view/data or use
the PKG-040 read-only audit; do not add a broad table fallback.

---

## Homework

**Functions:** `fetchHomeworkCatalog()`, `fetchHomeworkAssignment(id)`

| Item | Catalog | Detail |
|------|---------|--------|
| Table | `FBC Curriculum - SYNC` | same |
| View | `Web - Homework Catalog` | formula only |
| Filter | via view | `AND({Published?}, RECORD_ID()='rec…')` |
| Sort | view or `Order` asc | — |

**Catalog fields:** Assignment names, descriptions, week link, order, book, topic, cover images, `Published?`

**Detail-only fields:** Full description, steps, rationale, age band, docs, URLs, grade band

**Weeks table:** `Week Name`, `Start Date` — joined in app for grouping

---

## Levels

**Functions:** `fetchLevelLadder()`, `fetchLevelDefinition(id)`

| Item | Value |
|------|--------|
| Table | `Levels` |
| View | `Web - Levels` |
| Fallback | `{Active?} = 1`, sort `Sort Order` asc |
| Detail filter | `AND({Active?}, RECORD_ID()='rec…')` |

**Fields:** `Level Name`, `Level Name with Color`, `Cover Image`, XP thresholds, prev/next level links, `Sort Order`, `Rank`, `Public Gate Criteria`, `Active?`

---

## Tutorials, shoutouts, articles

**Functions:** `fetchTutorialCatalog()`, `fetchShoutoutCatalog()`, `fetchArticleCatalog()`, detail fetchers

All three content types read from the **Tutorials** table and split by `Tutorial Type` in app code (`isPublishedTutorialMedia`).

| Item | Value |
|------|--------|
| Table | `Tutorials` |
| View | `Web - Tutorials Catalog` |
| Fallback filter | `AND({OK to Publish on Softr}, OR({Associated Program} = "", FIND("Shooting Challenge", ARRAYJOIN({Associated Program}))))` |
| Detail filter | `AND({OK to Publish on Softr}, RECORD_ID()='rec…')` + type check in app |

**Fields:** `Name`, `Link to Video`, athlete/headshot, thumbnails, `Tutorial Type`, `Tutorial - Category`, `Associated Program`, descriptions, `OK to Publish on Softr`, `Sort Order`

**Publish gate:** `OK to Publish on Softr` (legacy Softr flag still used as public gate)

---

## Zoom meetings

**Functions:** `fetchZoomMeetingCatalog()`, `fetchZoomMeeting(id)`

| Item | Value |
|------|--------|
| Table | `Zoom Meetings` |
| View | `Web - Zoom Meetings` |
| Fallback | `NOT({Meeting Status} = 'Cancelled')`, sort `Start Time` desc |
| Detail filter | `AND(NOT({Meeting Status} = 'Cancelled'), RECORD_ID()='rec…')` |

**Fields:** `Meeting Name`, `Cover Media`, `Week`, times, descriptions, `Zoom Link`, host, agenda links, recording links, `Meeting Summary`, `Meeting Status`

---

## Health check

**Route:** `GET /shoot/api/airtable`

Verifies env vars are set **and** calls Airtable `whoami` to validate the PAT (`tokenValid: true`). Does not test individual views.

**Vercel env name:** `AIRTABLE_API_TOKEN` (not `AIRTABLE_API_KEY`).

---

## Adding a new page

1. Add view (or documented filter) in Airtable
2. Add query function in `web/lib/airtable/queries.ts`
3. Document here and in [airtable-data-map.md](./airtable-data-map.md)
4. Add route under `web/app/(program)/` and nav item in `shooting-challenge-nav.ts`
5. Update [site-hierarchy.md](./site-hierarchy.md)

---

## Related

- [public-data-rules.md](./public-data-rules.md) — what may appear on public pages
- [../../airtable/schema/current/field-map.md](../../airtable/schema/current/field-map.md) — canonical field names
