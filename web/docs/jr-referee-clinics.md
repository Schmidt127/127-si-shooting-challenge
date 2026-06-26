# JR Referee Clinics — program map

**Full documentation:** [`docs/jr-ref/README.md`](../../docs/jr-ref/README.md)  
**Getting started (Cursor, GitHub, Vercel, schema pull):** [`docs/jr-ref/getting-started.md`](../../docs/jr-ref/getting-started.md)

## Brand & routing
| Item | Value |
|------|--------|
| Program name | **JR Referee Clinics** |
| Hub card | `PRODUCTS` → `jr-referee-clinics` in `lib/products.ts` |
| URL prefix | `/jr-referee-clinics` |
| Legacy redirects | `/referee-clinics`, `/kids-ref-now` → `/jr-referee-clinics` |

## Source of truth

| Layer | Role |
|-------|------|
| **Fillout.com** | Registration forms (JR Ref participants, Mentor Montana officials, teams) |
| **Airtable** | Base **127SI - JR REF** — operational data, same pattern as Shooting Challenge |
| **hoopchallenges.com** | Read-only public views (participants roster, mentors, teams, schedules as built) |

## Environment variables

Uses the same PAT as Shooting Challenge, **separate base ID**:

```
AIRTABLE_API_TOKEN=           # shared PAT (data.records:read on JR REF base)
JR_REF_AIRTABLE_BASE_ID=      # app… id for 127SI - JR REF
```

Config: `lib/jr-ref/config.ts`  
Client: `lib/jr-ref/airtable.ts`  
Health check: `GET /api/jr-ref/airtable`

## Airtable tables (initial — confirm names in base)

| Table | Fillout source | Planned web route |
|-------|----------------|-------------------|
| JR Ref Participants | Participant registration | `/jr-referee-clinics/participants` |
| Mentor Montana Officials | Mentor registration | `/jr-referee-clinics/mentors` |
| Teams | Team registration | `/jr-referee-clinics/teams` |

Update `JR_REF_TABLES` in `lib/jr-ref/config.ts` if Airtable table names differ.

## Build order (suggested)

1. Overview hub (`/jr-referee-clinics`) — section cards ✅
2. Wire one catalog page (e.g. Participants) with Airtable view + ISR
3. Mentors and Teams catalogs
4. Clinic schedule / assignments (tables TBD)
5. Optional: public vs admin views, Fillout embed links for registration

## How to describe changes to the AI

```
Hub: hoopchallenges.com/
Program: JR Referee Clinics
Page: [Nav label]
Route: /jr-referee-clinics/...
Airtable base: 127SI - JR REF
Airtable: [table + view + filter]
```
