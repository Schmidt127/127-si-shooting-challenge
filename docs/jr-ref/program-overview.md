# JR Referee Clinics — program overview

## Mission

Train and develop **youth basketball officials** in Montana through structured clinics, mentor pairing, and game experience.

## History

| Phase | Scope |
|-------|--------|
| 2021–2025 | Fairfield-focused program (local teams, mentors, participants) |
| 2026+ | **Statewide expansion** — multiple communities, scalable Airtable + public web |

## Systems

| System | Role |
|--------|------|
| **Fillout.com** | Registration UX — participants, Mentor Montana officials, teams |
| **Airtable** (`127SI - JR REF`) | Source of truth — rosters, assignments, clinic ops |
| **hoopchallenges.com** | Public program hub under **JR Referee Clinics** |
| **GitHub** | Scripts, schema snapshots, docs, web code |
| **Cursor** | Local editing + AI assistance |
| **Vercel** | Hosts `web/` → hoopchallenges.com |

## Web routes (current)

| URL | Purpose |
|-----|---------|
| `/jr-referee-clinics` | Program overview |
| `/jr-referee-clinics/participants` | Participant roster (Airtable TBD) |
| `/jr-referee-clinics/mentors` | Mentor roster |
| `/jr-referee-clinics/teams` | Team roster |

Legacy redirects: `/referee-clinics`, `/kids-ref-now` → `/jr-referee-clinics`.

## Naming

| Context | Name |
|---------|------|
| Public program | **JR Referee Clinics** |
| Airtable base | **127SI - JR REF** |
| Product id (code) | `jr-referee-clinics` |
