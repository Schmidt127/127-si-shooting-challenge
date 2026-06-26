# Data model — Shooting Challenge

High-level entities (detail in `airtable/schema/current/`).

```
Enrollments ──┬── Submissions
              ├── XP Events (append-only)
              ├── Levels (lookup)
              └── School / Program fields

Weeks ──► Weekly summaries (automations)

Tutorials ──► Web catalog (Tutorial Type filter)
FBC Curriculum - SYNC ──► Homework pages
Zoom Meetings ──► Meeting pages
```

## Web routes → tables

| Route | Table | Filter / notes |
|-------|-------|----------------|
| `/leaderboard` | Enrollments | Sorted by XP |
| `/homework` | FBC Curriculum - SYNC | Published |
| `/tutorials` | Tutorials | Tutorial Type = Tutorial |
| `/shoutouts` | Tutorials | Tutorial Type = Shout-out |
| `/articles` | Tutorials | Tutorial Type = FBC Article Book |
| `/zoom-meetings` | Zoom Meetings | |
| `/levels` | Levels | |
| `/achievements` | Achievements | |

Paths are relative to app `basePath` `/shoot`.
