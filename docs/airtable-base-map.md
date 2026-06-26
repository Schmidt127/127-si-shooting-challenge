# Airtable base map — Shooting Challenge

## Base

| Field | Value |
|-------|--------|
| **Name** | 127 SI Shooting Challenge |
| **Base ID** | `appn84sqPw03zEbTT` |
| **Purpose** | Athlete enrollments, submissions, XP, levels, homework, tutorials, Zoom, weekly summaries |

## Major tables

See hand-maintained maps in `airtable/schema/current/` and latest snapshot under `airtable/schema/snapshots/`.

| Table | Role |
|-------|------|
| Enrollments | Athletes, XP, level, school |
| Submissions | Shot logs |
| Weeks | Season week boundaries |
| Levels | XP thresholds |
| XP Events | Append-only XP ledger |
| Tutorials | Tutorials, shoutouts, articles (Tutorial Type) |
| FBC Curriculum - SYNC | Homework |
| Zoom Meetings | Meeting schedule |
| Achievements | Badge definitions |

## Relationships

Documented in `airtable/schema/current/table-map.md` and `docs/data-model.md`.

## External integrations

| Tool | Role |
|------|------|
| **Make.com** | Email, Drive, webhooks — see `make/` |
| **Softr** | Legacy UI (being replaced by this web app) |
| **Vercel** | This repo's `web/` deployment |
| **Fillout** | Not primary for Shooting Challenge |

## Schema updates

```powershell
cd tools/airtable
python export_airtable_schema.py -v
```

Commit dated snapshots + update `CHANGELOG.md` when production schema changes.
