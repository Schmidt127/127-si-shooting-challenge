# Data model — Shooting Challenge

High-level pointer. Detail lives in:

- **Canonical Agent 2 pack:** [`docs/next-wave/data-model/`](./next-wave/data-model/)
- **PROD schema snapshot:** `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/`
- **XP Source Keys:** [`docs/next-wave/automation-ownership/xp-source-key-registry.json`](./next-wave/automation-ownership/xp-source-key-registry.json)

```
Config (Active School Year)
Program Instance ── Weeks
Athletes ── Enrollments ──┬── Submissions ── Submission Assets ── HC / Video Feedback
                          ├── Weekly Athlete Summary ← Weeks
                          ├── XP Events (append-only)
                          ├── Achievement Unlocks / Streaks
                          └── Zoom Attendance ← Zoom Meetings
```

## Web routes → tables

| Route | Table | Filter / notes |
|-------|-------|----------------|
| `/leaderboard` | Enrollments | Sorted by XP; Active? view filters |
| `/homework` | FBC Curriculum - SYNC | Published |
| `/tutorials` | Tutorials | Tutorial Type = Tutorial |
| `/shoutouts` | Tutorials | Tutorial Type = Shout-out |
| `/articles` | Tutorials | Tutorial Type = FBC Article Book |
| `/zoom-meetings` | Zoom Meetings | |
| `/levels` | Levels | |
| `/achievements` | Achievements | |

Paths are relative to app `basePath` `/shoot`.

**Out of scope:** Team Shot Tracker inactivity-alert systems.
