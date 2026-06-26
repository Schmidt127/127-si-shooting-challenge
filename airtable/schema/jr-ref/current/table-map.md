# JR Ref — Table Map

> **127SI - JR REF** Airtable base. Update this file after running `tools/airtable/jr-ref/export_schema.py`.

## Legend

- **PK** — Primary identifier field
- **→** — Linked record direction

## Registration tables (Fillout → Airtable)

### JR Ref Participants

| Role | Youth officials registered for clinics |
|------|----------------------------------------|
| Source | Fillout — participant registration |
| Web route | `/jr-referee-clinics/participants` |
| Key links | → Teams (games), → Mentors (TBD), → Clinic sessions (TBD) |

### Mentor Montana Officials

| Role | Experienced mentors paired with JR refs |
|------|----------------------------------------|
| Source | Fillout — mentor registration |
| Web route | `/jr-referee-clinics/mentors` |

### Teams

| Role | Teams playing in clinic games |
|------|-------------------------------|
| Source | Fillout — team registration |
| Web route | `/jr-referee-clinics/teams` |

## Supporting tables (document after schema export)

| Table | Purpose |
|-------|---------|
| _TBD_ | Clinic sessions / dates |
| _TBD_ | Game assignments |
| _TBD_ | Locations / gyms |
| _TBD_ | Regions / schools |

## Relationships (sketch — confirm from snapshot)

```
Teams ←→ Games ←→ Participants
Mentors ←→ Games / Participants
```

Run schema export and paste the ERD from `schema_erd_*.mmd` in snapshots to replace this sketch.
