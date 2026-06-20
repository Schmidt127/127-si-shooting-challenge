# System Overview

The **127 Sports Intensity Shooting Challenge** is an Airtable-based youth basketball shooting challenge system. It manages the full athlete lifecycle from enrollment through submissions, progression, communication, and reporting.

## Main Purpose

Give youth athletes a structured shooting challenge experience: enroll, submit shooting results, earn XP, advance through levels, maintain streaks, complete homework, receive video feedback, attend Zoom sessions, and receive weekly summaries — with parents and coaches kept in the loop via automated communication.

## Core Modules

| Module | Responsibility |
|--------|----------------|
| **Enrollment Intake** | Onboard athletes into the challenge; capture enrollment data and status |
| **Submission Intake** | Record shooting submissions (makes, attempts, challenge type, timestamps) |
| **XP Events** | Award experience points from qualifying activity; link back to source records |
| **Levels** | Derive athlete level from accumulated XP |
| **Achievements** | Track milestone badges and one-time accomplishments |
| **Streaks** | Track consecutive participation or submission streaks |
| **Homework** | Assign, track, and complete off-court homework tasks |
| **Video Feedback** | Store and associate coach video feedback with athletes or submissions |
| **Zoom Attendance** | Record attendance for Zoom sessions |
| **Weekly Athlete Summary** | Generate per-athlete weekly rollups for progress and communication |
| **Parent/Coach Communication** | Email and notification flows to parents and coaches |
| **Make.com Workflows** | External automation (Google Drive, Gmail, webhooks, and related scenarios) |
| **Audit and Recovery Scripts** | Dry-run audits, integrity checks, and recovery procedures |

## Main Data Flow

```
Enrollment
    │
    ▼
Submission
    │
    ▼
XP Event
    │
    ▼
Weekly Athlete Summary
    │
    ├──► Levels
    ├──► Emails (parent/coach communication via Make.com)
    └──► Softr display (athlete-facing portal)
```

Supporting modules (Achievements, Streaks, Homework, Video Feedback, Zoom Attendance) attach to athletes and/or submissions and feed into summaries, XP, and communication where applicable.

## Development Tools

| Tool | Use |
|------|-----|
| **Airtable** | Production database, automations, extensions, and live app runtime |
| **GitHub** | Version control for scripts, schema notes, blueprints, docs, and recovery procedures |
| **Cursor** | Local editing of scripts and documentation |
| **ChatGPT** | Architecture review, script review, debugging, audit design, documentation support |
| **Make.com** | External workflow execution (Drive, Gmail, webhooks) |

## Architecture Goals

- **Prevent duplicate XP Events** — Each qualifying action should produce at most one XP Event; automations and audits must enforce idempotency.
- **Document schema changes** — Field, table, and relationship changes are recorded in this repo before or alongside production updates.
- **Version automation scripts** — Airtable scripts and extension code are stored in GitHub with meaningful commit history.
- **Preserve Make.com blueprints** — Workflow definitions are exported and kept here so scenarios can be rebuilt or compared.
- **Build dry-run audit scripts** — Audits report issues without modifying data unless explicitly run in apply mode.
- **Improve recovery speed** — When something breaks, documented recovery procedures and versioned scripts reduce time to restore correct behavior.

## Repository vs. Production

- **GitHub** — Source of truth for *what should be deployed*.
- **Airtable** — Source of truth for *live athlete data and running automations*.
- **Make.com** — Source of truth for *running external integrations*, with blueprints mirrored in GitHub.

When investigating incidents, compare production state against GitHub and use audit scripts to identify drift or duplicate records.
