# Table Map

Overview of Airtable tables, primary keys, and link relationships for the shooting challenge base.

## Legend

- **PK** — Primary identifier field (usually Name or autonumber)
- **→** — Linked record direction (from → to)

## Core Tables

### Athletes

| Role | Primary hub for each youth participant |
|------|----------------------------------------|
| PK | Athlete Name (or Athlete ID) |
| Key links | → Submissions, → XP Events, → Homework, → Weekly Summaries, → Parent/Coach contacts |
| Key rollups | Total XP, current level, active streak, enrollment status |

### Submissions

| Role | Shooting challenge entries (makes, attempts, dates, challenge type) |
|------|---------------------------------------------------------------------|
| PK | Submission ID / Name |
| Key links | → Athlete (required), → Challenge / Drill (if applicable) |
| Triggers | XP Event creation, streak updates, weekly summary aggregation |

### XP Events

| Role | Append-only ledger of XP awards and adjustments |
|------|------------------------------------------------|
| PK | XP Event ID |
| Key links | → Athlete, → Submission (source, optional), → Homework (source, optional) |
| Rules | One logical award per business event; use dedupe keys in automations |

### Homework

| Role | Assigned drills, video uploads, coach feedback |
|------|-----------------------------------------------|
| Key links | → Athlete, → Coach, optional → Submission |
| Triggers | XP on completion, parent/coach notifications via Make |

### Weekly Summaries

| Role | Per-athlete weekly rollup for email/reporting |
|------|-----------------------------------------------|
| Key links | → Athlete |
| Populated by | Scheduled automation or Make scenario |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| Levels / Badges | XP thresholds, badge metadata |
| Challenges / Drills | Challenge definitions, point rules |
| Coaches | Staff linked to athletes and homework |
| Parents / Contacts | Email/phone for Make notifications |
| Zoom Attendance | Session attendance linked to athletes |
| Config / Settings | Feature flags, season dates, email templates (single-row or small lookup) |

## Relationship Diagram (Conceptual)

```
Athletes ──┬── Submissions ──→ XP Events
           ├── Homework ─────→ XP Events
           ├── Weekly Summaries
           ├── Zoom Attendance
           └── Contacts (Parents / Coaches)

Challenges / Drills ──→ Submissions
Levels / Badges ──→ Athletes (lookup or formula)
```

## Views Worth Documenting

| Table | View name | Used by |
|-------|-----------|---------|
| Submissions | *(e.g. Pending XP)* | Shooting challenge automation |
| Athletes | *(e.g. Active enrollments)* | Weekly summary run |
| Homework | *(e.g. Due this week)* | Coach dashboard / Make |

Add view names and automation bindings as they are confirmed in production.
