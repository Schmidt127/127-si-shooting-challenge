# JR Ref — Airtable data map (web)

Maps **127SI - JR REF** tables to hoopchallenges.com routes. Update after schema export.

## Bases

| Base | Env var | Web code |
|------|---------|----------|
| Shooting Challenge | `AIRTABLE_BASE_ID` | `lib/airtable/client.ts` |
| JR Referee Clinics | `JR_REF_AIRTABLE_BASE_ID` | `lib/jr-ref/airtable.ts` |

Same `AIRTABLE_API_TOKEN` may cover both bases if PAT scopes include both.

## Primary tables

| Airtable table | Web route | Status |
|----------------|-----------|--------|
| JR Ref Participants | `/jr-referee-clinics/participants` | Placeholder — wire view TBD |
| Mentor Montana Officials | `/jr-referee-clinics/mentors` | Placeholder |
| Teams | `/jr-referee-clinics/teams` | Placeholder |

Config constants: `lib/jr-ref/config.ts` → `JR_REF_TABLES`

## Suggested Airtable views (create in base)

| View name | Table | Filter |
|-----------|-------|--------|
| `Web - Participants` | JR Ref Participants | Active / current season; no internal-only fields |
| `Web - Mentors` | Mentor Montana Officials | Active mentors |
| `Web - Teams` | Teams | Current season |

## API access pattern

```
Browser → Next.js Server Component
       → lib/jr-ref/airtable.ts
       → Airtable REST API (JR_REF_AIRTABLE_BASE_ID)
       → lib/data/jr-ref/* (add mappers as pages go live)
```

## Queries (add to `lib/jr-ref/queries.ts` as built)

| Function | View / table |
|----------|----------------|
| `fetchParticipantCatalog` | Web - Participants |
| `fetchMentorCatalog` | Web - Mentors |
| `fetchTeamCatalog` | Web - Teams |

## Fillout

Registrations land in Airtable via Fillout — web does not write. See `airtable/schema/jr-ref/current/fillout-integration.md`.
